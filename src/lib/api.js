import { assertSupabase } from './supabase'

// Signed URL lifetime: 10 years in seconds.
const SIGNED_URL_TTL = 315_360_000

// ── Helper: upload a photo and return { photo_url, photo_path } ───────────────
// Strategy:
//   1. Upload file to storage (UUID-based path, so bucket paths are unguessable).
//   2. Try createSignedUrl — works on both public and private buckets; preferred
//      because signed URLs survive if the bucket is later made private.
//   3. Fall back to getPublicUrl if signing fails (requires public bucket).
//      If the bucket is already private, the caller will receive a valid signed
//      URL from step 2 and this fallback is never reached.
export async function uploadPhoto(sb, userId, file, subfolder = '') {
  const ext = file.name.split('.').pop() || 'jpg'
  const folder = subfolder ? `${userId}/${subfolder}` : userId
  const path = `${folder}/${Date.now()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from('photos')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError

  // Prefer signed URL — works regardless of bucket visibility.
  const photosBucket = sb.storage.from('photos')
  const signedResult = typeof photosBucket.createSignedUrl === 'function'
    ? await photosBucket.createSignedUrl(path, SIGNED_URL_TTL)
    : { data: null, error: new Error('createSignedUrl is unavailable') }
  const { data: signedData, error: signErr } = signedResult

  if (!signErr && signedData?.signedUrl) {
    return { photo_url: signedData.signedUrl, photo_path: path }
  }

  // Fallback: public URL (requires bucket to be public).
  // If signing failed and the bucket is private, photo_url will be a broken URL.
  // In that case, make the bucket Public again in the Supabase Dashboard, or
  // investigate the storage RLS policy preventing createSignedUrl.
  if (import.meta.env.DEV) {
    console.warn('[uploadPhoto] createSignedUrl failed, falling back to public URL:', signErr?.message)
  }
  const { data: urlData } = photosBucket.getPublicUrl(path)
  return { photo_url: urlData.publicUrl, photo_path: path }
}

// ── Users ─────────────────────────────────────────────────────────────────────

// Returns { user, isNew }
export async function saveUser(tgUser) {
  const sb = assertSupabase()

  const { data: existing, error: selectError } = await sb
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .maybeSingle()

  if (selectError) throw selectError

  if (existing) {
    const newName     = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    const newPhotoUrl = tgUser.photo_url ?? null
    const needsUpdate = existing.name !== newName || existing.photo_url !== newPhotoUrl
    if (needsUpdate) {
      await sb.from('users')
        .update({ name: newName, photo_url: newPhotoUrl })
        .eq('id', existing.id)
      existing.name      = newName
      existing.photo_url = newPhotoUrl
    }
    return { user: existing, isNew: false }
  }

  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Пользователь'
  const { data: newUser, error: insertError } = await sb
    .from('users')
    .insert({ telegram_id: tgUser.id, name, photo_url: tgUser.photo_url ?? null })
    .select()
    .single()

  if (insertError) throw insertError
  return { user: newUser, isNew: true }
}

export async function updatePublicProfile(userId, { publicProfileEnabled, bio, featuredMomentId } = {}) {
  const sb = assertSupabase()
  const payload = {}

  if (publicProfileEnabled !== undefined) payload.public_profile_enabled = Boolean(publicProfileEnabled)
  if (bio !== undefined) payload.bio = bio?.trim() ? bio.trim() : null
  if (featuredMomentId !== undefined) payload.featured_moment_id = featuredMomentId || null

  const { data, error } = await sb
    .from('users')
    .update(payload)
    .eq('id', userId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

// Cross-user lookup by public_code via SECURITY DEFINER RPC (never exposes telegram_id).
export async function getUserByPublicCode(publicCode) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .rpc('find_user_by_public_code', { p_code: publicCode })
  if (error) throw error
  return data?.[0] ?? null
}

// Backward compat: resolve old ref_<telegram_id> deep links safely.
// Returns { id, public_code } only — telegram_id is never sent to the client.
export async function findUserByTelegramIdSafe(telegramId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .rpc('find_user_by_telegram_id_safe', { p_telegram_id: telegramId })
  if (error) throw error
  return data?.[0] ?? null
}

// ── Moments ───────────────────────────────────────────────────────────────────

export async function getMoments(userId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('moments')
    .select(`
      *,
      people:moment_people(person:people(id, name, avatar_color, photo_url, linked_user_id)),
      participants:moment_participants(user:users(id, name, photo_url))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((m) => {
    const people = (m.people ?? []).map((mp) => mp.person)
    const linkedUserIds = new Set(people.map((p) => p.linked_user_id).filter(Boolean))
    const taggedFriends = (m.participants ?? [])
      .map((mp) => mp.user)
      .filter((u) => u && !linkedUserIds.has(u.id))
    return { ...m, people, taggedFriends }
  })
}

export async function saveMoment({ userId, fields, photoFile, peopleIds }) {
  const sb = assertSupabase()

  let photo_url = null
  let photo_path = null
  if (photoFile) {
    const result = await uploadPhoto(sb, userId, photoFile)
    photo_url  = result.photo_url
    photo_path = result.photo_path
  }

  const { data: moment, error: momentError } = await sb
    .from('moments')
    .insert({ user_id: userId, ...fields, photo_url, photo_path })
    .select()
    .single()

  if (momentError) throw momentError

  if (peopleIds?.length > 0) {
    const rows = peopleIds.map((person_id) => ({ moment_id: moment.id, person_id }))
    const { error: linkError } = await sb.from('moment_people').insert(rows)
    if (linkError) throw linkError
  }

  return moment
}

export async function updateMoment(id, payload) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('moments').update(payload).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteMoment(id) {
  const sb = assertSupabase()
  const { error } = await sb.from('moments').delete().eq('id', id)
  if (error) throw error
}

// ── People ────────────────────────────────────────────────────────────────────

export async function getPeople(userId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('people').select('*').eq('user_id', userId).order('created_at')
  if (error) throw error
  return data
}

export async function createPerson({ userId, name, avatarColor, photoFile }) {
  const sb = assertSupabase()
  let photo_url = null
  let photo_path = null
  if (photoFile) {
    const result = await uploadPhoto(sb, userId, photoFile, 'people')
    photo_url  = result.photo_url
    photo_path = result.photo_path
  }
  const { data, error } = await sb
    .from('people')
    .insert({ user_id: userId, name, avatar_color: avatarColor, photo_url, photo_path })
    .select().single()
  if (error) throw error
  return data
}

export async function updatePerson(personId, { name, photoUrl, photoPath, metYear }) {
  const sb = assertSupabase()
  const payload = {}
  if (name      !== undefined) payload.name      = name
  if (photoUrl  !== undefined) payload.photo_url  = photoUrl
  if (photoPath !== undefined) payload.photo_path = photoPath
  if (metYear   !== undefined) payload.met_year   = metYear || null
  const { data, error } = await sb
    .from('people').update(payload).eq('id', personId).select().single()
  if (error) throw error
  return data
}

export async function deletePerson(personId) {
  const sb = assertSupabase()
  const { error } = await sb.from('people').delete().eq('id', personId)
  if (error) throw error
}

export async function getPersonById(personId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('people').select('*').eq('id', personId).single()
  if (error) throw error
  return data
}

export async function getMomentsByPerson(userId, personId) {
  const sb = assertSupabase()
  const { data: links, error: linkError } = await sb
    .from('moment_people')
    .select('moment_id')
    .eq('person_id', personId)
  if (linkError) throw linkError
  if (!links?.length) return []

  const momentIds = links.map((r) => r.moment_id)
  const { data: moments, error: momError } = await sb
    .from('moments')
    .select('*')
    .in('id', momentIds)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (momError) throw momError
  return moments ?? []
}

// ── Friends ───────────────────────────────────────────────────────────────────

export async function sendFriendRequest(requesterId, receiverId) {
  if (!requesterId || !receiverId || requesterId === receiverId) return null
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('friendships')
    .upsert(
      { requester_id: requesterId, receiver_id: receiverId, status: 'pending' },
      { onConflict: 'requester_id,receiver_id', ignoreDuplicates: true }
    )
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getFriendships(userId) {
  const sb = assertSupabase()

  const [{ data: asSender, error: e1 }, { data: asReceiver, error: e2 }] = await Promise.all([
    sb.from('friendships').select('id, status, requester_id, receiver_id').eq('requester_id', userId),
    sb.from('friendships').select('id, status, requester_id, receiver_id').eq('receiver_id', userId),
  ])
  if (e1) throw e1
  if (e2) throw e2

  const seen = new Set()
  const rows = [...(asSender ?? []), ...(asReceiver ?? [])].filter((f) => {
    const key = [f.requester_id, f.receiver_id].sort().join(':')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!rows.length) return []

  const userIds = [...new Set(rows.flatMap((f) => [f.requester_id, f.receiver_id]))]

  // Use SECURITY DEFINER RPC — never exposes telegram_id to other clients.
  const { data: users, error: usersErr } = await sb
    .rpc('get_users_public', { p_user_ids: userIds })
  if (usersErr) throw usersErr

  const byId = Object.fromEntries((users ?? []).map((u) => [u.id, u]))
  return rows.map((f) => ({
    ...f,
    requester: byId[f.requester_id] ?? null,
    receiver:  byId[f.receiver_id]  ?? null,
  }))
}

export async function acceptFriendRequest(friendshipId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('friendships')
    .update({ status: 'accepted' })
    .eq('id', friendshipId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeFriend(friendshipId) {
  const sb = assertSupabase()
  const { error } = await sb.from('friendships').delete().eq('id', friendshipId)
  if (error) throw error
}

// ── Shared moments (via moment_participants) ───────────────────────────────────

export async function addMomentParticipants(momentId, userIds) {
  if (!userIds?.length) return
  const sb = assertSupabase()
  const rows = userIds.map((user_id) => ({ moment_id: momentId, user_id }))
  const { error } = await sb.from('moment_participants').insert(rows)
  if (error) throw error
}

export async function getSharedMoments(userId) {
  const sb = assertSupabase()
  const { data: links, error: linkError } = await sb
    .from('moment_participants')
    .select('moment_id')
    .eq('user_id', userId)
  if (linkError) throw linkError
  if (!links?.length) return []

  const momentIds = links.map((r) => r.moment_id)
  const { data, error } = await sb
    .from('moments')
    .select(`*, people:moment_people(person:people(id, name, avatar_color, photo_url))`)
    .in('id', momentIds)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []).map((m) => ({
    ...m,
    people: (m.people ?? []).map((mp) => mp.person),
    isShared: true,
  }))
}

// ── Public profiles ───────────────────────────────────────────────────────────

export async function getUserProfile(userId) {
  const sb = assertSupabase()
  try {
    const [userResult, momentsResult, requesterCountResult, receiverCountResult] = await Promise.all([
      sb.rpc('get_user_public', { p_user_id: userId }),
      sb.from('moments')
        .select('id, title, photo_url, created_at, visibility', { count: 'exact' })
        .eq('user_id', userId)
        .eq('visibility', 'public')
        .order('created_at', { ascending: false }),
      sb.from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .eq('requester_id', userId),
      sb.from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .eq('receiver_id', userId),
    ])
    const user = userResult.data?.[0] ?? null
    const moments = momentsResult.data ?? []
    const total = momentsResult.count ?? 0
    const monthCount = new Set(
      moments.map((moment) => {
        const date = new Date(moment.created_at)
        return `${date.getFullYear()}-${date.getMonth()}`
      }),
    ).size
    const friendCount = (requesterCountResult.count ?? 0) + (receiverCountResult.count ?? 0)
    return { user, moments, total, monthCount, friendCount }
  } catch {
    return { user: null, moments: [], total: 0, monthCount: 0, friendCount: 0 }
  }
}

export async function getPublicMoments(userId) {
  const sb = assertSupabase()
  try {
    const { data, error } = await sb
      .from('moments')
      .select('id, title, photo_url, created_at, visibility')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
    if (error) return []
    return data ?? []
  } catch {
    return []
  }
}

// ── Capsule ───────────────────────────────────────────────────────────────────

export async function getCapsule(userId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('capsule')
    .select('slot_index, moment:moments(*, people:moment_people(person:people(id, name, avatar_color, photo_url)))')
    .eq('user_id', userId)
    .order('slot_index')
  if (error) throw error
  return (data ?? []).map((row) => ({
    slotIndex: row.slot_index,
    moment: {
      ...row.moment,
      people: (row.moment?.people ?? []).map((mp) => mp.person),
    },
  }))
}

export async function saveCapsuleSlot(userId, slotIndex, momentId) {
  const sb = assertSupabase()
  const { error: delErr } = await sb.from('capsule').delete().eq('user_id', userId).eq('slot_index', slotIndex)
  if (delErr) console.warn('[Capsule] delete error (non-fatal):', delErr?.message)
  const { error } = await sb
    .from('capsule')
    .insert({ user_id: userId, slot_index: slotIndex, moment_id: momentId })
  if (error) throw error
}

export async function deleteCapsuleSlot(userId, slotIndex) {
  const sb = assertSupabase()
  const { error } = await sb
    .from('capsule')
    .delete()
    .eq('user_id', userId)
    .eq('slot_index', slotIndex)
  if (error) throw error
}

// ── People ↔ Users linking ────────────────────────────────────────────────────

export async function linkPersonToUser(personId, linkedUserId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('people')
    .update({ linked_user_id: linkedUserId })
    .eq('id', personId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUserMomentsStats(userId) {
  const sb = assertSupabase()
  try {
    const [{ count }, { data: latest }] = await Promise.all([
      sb.from('moments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      sb.from('moments').select('created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    return { total: count ?? 0, lastCreatedAt: latest?.created_at ?? null }
  } catch {
    return { total: null, lastCreatedAt: null }
  }
}

export async function getSharedMomentsWithFriend(currentUserId, friendUserId) {
  const sb = assertSupabase()
  const { data: linkedPeople, error: peopleErr } = await sb
    .from('people')
    .select('id')
    .eq('user_id', currentUserId)
    .eq('linked_user_id', friendUserId)
  if (peopleErr) throw peopleErr
  if (!linkedPeople?.length) return []

  const personIds = linkedPeople.map((p) => p.id)
  const { data: links, error: linksErr } = await sb
    .from('moment_people')
    .select('moment_id')
    .in('person_id', personIds)
  if (linksErr) throw linksErr
  if (!links?.length) return []

  const momentIds = [...new Set(links.map((l) => l.moment_id))]
  const { data: moments, error: momErr } = await sb
    .from('moments')
    .select('id, title, photo_url, created_at')
    .in('id', momentIds)
    .eq('user_id', currentUserId)
    .order('created_at', { ascending: false })
  if (momErr) throw momErr
  return moments ?? []
}
