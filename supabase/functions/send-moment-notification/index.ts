import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase or Telegram env is not configured' }, 500)
  }

  try {
    const payload = await req.json()
    const momentId = typeof payload?.momentId === 'string' ? payload.momentId : ''

    if (!momentId) {
      return json({ error: 'Missing momentId' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // Resolve the actor (moment creator) from the Bearer token
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Missing authorization' }, 401)

    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData?.user?.id) {
      return json({ error: authError?.message ?? 'Unauthorized' }, 401)
    }

    const { data: actor, error: actorError } = await admin
      .from('users')
      .select('id, name')
      .eq('auth_id', authData.user.id)
      .maybeSingle()

    if (actorError) return json({ error: actorError.message }, 500)
    if (!actor?.id) return json({ error: 'User not found' }, 404)

    // Fetch the moment and verify it belongs to the actor and is friends-visible
    const { data: moment, error: momentError } = await admin
      .from('moments')
      .select('id, user_id, title, visibility')
      .eq('id', momentId)
      .maybeSingle()

    if (momentError) return json({ error: momentError.message }, 500)
    if (!moment) return json({ error: 'Moment not found' }, 404)
    if (moment.user_id !== actor.id) return json({ error: 'Forbidden' }, 403)
    if (moment.visibility !== 'friends') {
      return json({ ok: true, status: 'skipped', reason: 'not_friends_visibility' })
    }

    // Get all accepted friends of the actor
    const { data: friendships, error: friendshipsError } = await admin
      .from('friendships')
      .select('requester_id, receiver_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${actor.id},receiver_id.eq.${actor.id}`)

    if (friendshipsError) return json({ error: friendshipsError.message }, 500)
    if (!friendships?.length) {
      return json({ ok: true, status: 'skipped', reason: 'no_friends' })
    }

    // Extract friend user IDs (the other side of each friendship)
    const friendIds = friendships.map((f) =>
      f.requester_id === actor.id ? f.receiver_id : f.requester_id,
    )

    // Fetch telegram_ids of all friends in one query
    const { data: friendUsers, error: friendUsersError } = await admin
      .from('users')
      .select('id, telegram_id')
      .in('id', friendIds)

    if (friendUsersError) return json({ error: friendUsersError.message }, 500)

    const actorName = actor.name?.trim() || 'Кто-то'
    const momentTitle = moment.title?.trim()
    const text = momentTitle
      ? `${actorName} поделился новым воспоминанием «${momentTitle}» ✨`
      : `${actorName} поделился новым воспоминанием ✨`

    console.log('[send-moment-notification] sending to', friendUsers?.length ?? 0, 'friends')

    const results: { userId: string; status: string; reason?: string; message_id?: number }[] = []

    for (const friend of friendUsers ?? []) {
      if (!friend.telegram_id) {
        results.push({ userId: friend.id, status: 'skipped', reason: 'no_telegram_id' })
        continue
      }

      const tgRes = await fetch(`${TG_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: friend.telegram_id,
          text,
          disable_notification: false,
        }),
      })
      const tgJson = await tgRes.json()

      if (tgJson.ok) {
        results.push({ userId: friend.id, status: 'sent', message_id: tgJson?.result?.message_id })
      } else {
        console.warn('[send-moment-notification] Telegram error for', friend.id, tgJson.description)
        results.push({ userId: friend.id, status: 'error', reason: tgJson.description })
      }
    }

    const sentCount = results.filter((r) => r.status === 'sent').length
    return json({ ok: true, sent_count: sentCount, results })
  } catch (error) {
    console.error('[send-moment-notification] error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
