import { assertSupabase } from './supabase'

// ── Users ─────────────────────────────────────────────────────────────────────

// Возвращает { user, isNew }
// isNew = true если пользователь только что создан, false если уже был
export async function saveUser(tgUser) {
  console.log('[saveUser] called with:', JSON.stringify(tgUser))
  const sb = assertSupabase()

  // ── 1. Проверяем — существует ли уже ───────────────────────────────────────
  const { data: existing, error: selectError } = await sb
    .from('users')
    .select('*')
    .eq('telegram_id', tgUser.id)
    .maybeSingle()   // не бросает ошибку если 0 строк (в отличие от .single())

  if (selectError) {
    console.error('[saveUser] ❌ select error:', JSON.stringify(selectError, null, 2))
    throw selectError
  }

  if (existing) {
    console.log('[saveUser] ✅ existing user:', JSON.stringify(existing))
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
    console.error('[saveUser] ❌ insert error:', JSON.stringify(insertError, null, 2))
    throw insertError
  }

  console.log('[saveUser] ✅ new user created:', JSON.stringify(newUser))
  return { user: newUser, isNew: true }
}

// ── Moments ───────────────────────────────────────────────────────────────────

export async function getMoments(userId) {
  const sb = assertSupabase()
  const { data, error } = await sb
    .from('moments')
    .select(`*, people:moment_people(person:people(id, name, avatar_color, photo_url))`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data.map((m) => ({
    ...m,
    people: (m.people ?? []).map((mp) => mp.person),
  }))
}

export async function saveMoment({ userId, fields, photoFile, peopleIds }) {
  const sb = assertSupabase()

  console.log('[saveMoment] called with:', {
    userId,
    fields,
    hasPhoto: !!photoFile,
    peopleIds,
  })

  if (!userId || userId === 'local') {
    console.error('[saveMoment] ❌ userId is missing or "local" — currentUser not loaded yet')
  }

  let photo_url = null
  if (photoFile) {
    const ext = photoFile.name.split('.').pop() || 'jpg'
    const path = `${userId}/${Date.now()}.${ext}`
    console.log('[saveMoment] uploading photo to:', path)
    const { error: uploadError } = await sb.storage
      .from('photos')
      .upload(path, photoFile, { contentType: photoFile.type, upsert: false })
    if (uploadError) {
      console.error('[saveMoment] ❌ photo upload error:', JSON.stringify(uploadError, null, 2))
      throw uploadError
    }
    const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
    photo_url = urlData.publicUrl
    console.log('[saveMoment] photo uploaded, url:', photo_url)
  }

  const insertPayload = { user_id: userId, ...fields, photo_url }
  console.log('[saveMoment] inserting moment:', JSON.stringify(insertPayload, null, 2))

  const { data: moment, error: momentError } = await sb
    .from('moments')
    .insert(insertPayload)
    .select()
    .single()

  if (momentError) {
    console.error('[saveMoment] ❌ insert error:', JSON.stringify(momentError, null, 2))
    console.error('[saveMoment] ❌ insert error details:', {
      message: momentError.message,
      code: momentError.code,
      details: momentError.details,
      hint: momentError.hint,
    })
    throw momentError
  }

  console.log('[saveMoment] ✅ moment saved:', moment.id)

  if (peopleIds?.length > 0) {
    const rows = peopleIds.map((person_id) => ({ moment_id: moment.id, person_id }))
    console.log('[saveMoment] linking people:', rows)
    const { error: linkError } = await sb.from('moment_people').insert(rows)
    if (linkError) {
      console.error('[saveMoment] ❌ people link error:', JSON.stringify(linkError, null, 2))
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

export async function updatePerson(personId, { name, photoUrl }) {
  const sb = assertSupabase()
  const payload = {}
  if (name !== undefined) payload.name = name
  if (photoUrl !== undefined) payload.photo_url = photoUrl
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
