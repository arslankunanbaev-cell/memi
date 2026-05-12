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

async function sendTelegramMessage(chatId: number | string, text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
  const body = await res.json()

  if (!body.ok) {
    throw new Error(body.description ?? 'Telegram sendMessage failed')
  }

  return body?.result?.message_id ?? null
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
    const friendshipId = typeof payload?.friendshipId === 'string' ? payload.friendshipId : ''

    if (!friendshipId) {
      return json({ error: 'Missing friendshipId' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Missing authorization' }, 401)

    const { data: authData, error: authError } = await admin.auth.getUser(token)
    if (authError || !authData?.user?.id) {
      return json({ error: authError?.message ?? 'Unauthorized' }, 401)
    }

    const { data: accepter, error: accepterError } = await admin
      .from('users')
      .select('id, name')
      .eq('auth_id', authData.user.id)
      .maybeSingle()

    if (accepterError) return json({ error: accepterError.message }, 500)
    if (!accepter?.id) return json({ error: 'Accepter not found' }, 404)

    const { data: friendship, error: friendshipError } = await admin
      .from('friendships')
      .select('id, requester_id, receiver_id, status')
      .eq('id', friendshipId)
      .eq('receiver_id', accepter.id)
      .eq('status', 'accepted')
      .maybeSingle()

    if (friendshipError) return json({ error: friendshipError.message }, 500)
    if (!friendship) return json({ error: 'Accepted friendship not found' }, 404)

    const { data: requester, error: requesterError } = await admin
      .from('users')
      .select('id, telegram_id')
      .eq('id', friendship.requester_id)
      .maybeSingle()

    if (requesterError) return json({ error: requesterError.message }, 500)
    if (!requester) return json({ error: 'Requester not found' }, 404)

    if (!requester.telegram_id) {
      return json({ ok: true, status: 'skipped', reason: 'requester_has_no_telegram' })
    }

    const accepterName = accepter.name?.trim() || 'Пользователь'
    const text = `${accepterName} принял(а) вашу заявку в друзья.`
    const messageId = await sendTelegramMessage(requester.telegram_id, text)

    return json({ ok: true, status: 'sent', message_id: messageId })
  } catch (error) {
    console.error('[send-friend-accepted-notification] error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
