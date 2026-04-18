import { assertSupabase } from './supabase'

// ── Users ─────────────────────────────────────────────────────────────────────

// Возвращает { user, isNew }
// isNew = true если пользователь только что создан, false если уже был
export async function saveUser(tgUser) {
  const sb = assertSupabase()

  // ── 1. Проверяем — существует ли уже ───────────────────────────────────────
  const { data: existing, error: selectError } = await sb
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .maybeSingle()   // не бросает ошибку если 0 строк (в отличие от .single())

  if (selectError) {
    console.error('[saveUser] select error:', selectError.code, selectError.message)
    throw selectError
  }

  if (existing) {
    // Обновляем имя и фото на случай если пользователь сменил их в Telegram
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

  // ── 2. Создаём нового ──────────────────────────────────────────────────────
  const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Пользователь'
  const { data: newUser, error: insertError } = await sb
    .from('users')
    .insert({ telegram_id: tgUser.id, name, photo_url: tgUser.photo_url ?? null })
    .select()
    .single()

  if (insertError) {
    console.error('[saveUser] insert error:', insertError.code, insertError.message)
    throw insertError
  }

  return { user: newUser, isNew: true }
}

// ── Moments ───────────────────────────────────────────────────────────────────

export async function getMoments(userId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('moments')
    .select(`
      *,
      people:moment_people(person:people(id, name, avatar_color, photo_url)),
      participants:moment_participants(user:users(id, name, photo_url))
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((m) => ({
    ...m,
    people: (m.people ?? []).map((mp) => mp.person),
    taggedFriends: (m.participants ?? []).map((mp) => mp.user).filter(Boolean),
  }))
}

export async function saveMoment({ userId, fields, photoFile, peopleIds }) {
  const sb = assertSupabase()

  if (!userId || userId === 'local') {
    console.error('[saveMoment] userId is missing or "local"')
  }

  let photo_url = null
  if (photoFile) {
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    const { error: uploadError } = await sb.storage
      .from('photos')
      .upload(path, photoFile, { contentType: photoFile.type, upsert: false })
    if (uploadError) {
      console.error('[saveMoment] photo upload error:', uploadError.code, uploadError.message)
      throw uploadError
    }
    const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
    photo_url = urlData.publicUrl
  }

  const insertPayload = { user_id: userId, ...fields, photo_url }

  const { data: moment, error: momentError } = await sb
    .from('moments')
    .insert(insertPayload)
    .select()
    .single()

  if (momentError) {
    console.error('[saveMoment] insert error:', momentError.code, momentError.message)
    throw momentError
  }

  if (peopleIds?.length > 0) {
    const rows = peopleIds.map((person_id) => ({ moment_id: moment.id, person_id }))
    const { error: linkError } = await sb.from('moment_people').insert(rows)
    if (linkError) {
      console.error('[saveMoment] people link error:', linkError.code, linkError.message)
      throw linkError
    }
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
  // moment_people deletes via CASCADE
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
  if (photoFile) {
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const path = `${userId}/people/${Date.now()}.${ext}`
    const { error: uploadError } = await sb.storage
      .from('photos').upload(path, photoFile, { contentType: photoFile.type })
    if (uploadError) throw uploadError
    const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
    photo_url = urlData.publicUrl
  }
  const { data, error } = await sb
    .from('people')
    .insert({ user_id: userId, name, avatar_color: avatarColor, photo_url })
    .select().single()
  if (error) throw error
  return data
}

export async function updatePerson(personId, { name, photoUrl, metYear }) {
  const sb = assertSupabase()
  const payload = {}
  if (name !== undefined) payload.name = name
  if (photoUrl !== undefined) payload.photo_url = photoUrl
  if (metYear !== undefined) payload.met_year = metYear || null
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
  // Получаем id моментов где есть этот человек
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

export async function getUserByTelegramId(telegramId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('users')
    .select('id, name, photo_url, telegram_id')
    .eq('telegram_id', telegramId)
    .maybeSingle()
  if (error) throw error
  return data // null if not found
}

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

  // Two separate queries instead of .or() to avoid PostgREST filter issues
  const [{ data: asSender, error: e1 }, { data: asReceiver, error: e2 }] = await Promise.all([
    sb.from('friendships').select('id, status, requester_id, receiver_id').eq('requester_id', userId),
    sb.from('friendships').select('id, status, requester_id, receiver_id').eq('receiver_id', userId),
  ])
  if (e1) throw e1
  if (e2) throw e2

  // Deduplicate: if both A→B and B→A exist, keep only the first seen
  const seen = new Set()
  const rows = [...(asSender ?? []), ...(asReceiver ?? [])].filter((f) => {
    const key = [f.requester_id, f.receiver_id].sort().join(':')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (!rows.length) return []

  const userIds = [...new Set(rows.flatMap((f) => [f.requester_id, f.receiver_id]))]
  const { data: users, error: usersErr } = await sb
    .from('users')
    .select('id, name, photo_url, telegram_id')
    .in('id', userIds)
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
    const [{ data: user }, { data: moments, count }] = await Promise.all([
      sb.from('users').select('id, name, photo_url, created_at').eq('id', userId).maybeSingle(),
      sb.from('moments').select('id, title, photo_url, created_at, visibility', { count: 'exact' })
        .eq('user_id', userId).eq('visibility', 'public').order('created_at', { ascending: false }),
    ])
    return { user: user ?? null, moments: moments ?? [], total: count ?? 0 }
  } catch {
    return { user: null, moments: [], total: 0 }
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
  const { error } = await sb
    .from('capsule')
    .upsert({ user_id: userId, slot_index: slotIndex, moment_id: momentId }, { onConflict: 'user_id,slot_index' })
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
