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
    const receiverId = typeof payload?.receiverId === 'string' ? payload.receiverId : ''
    const notifyRequester = payload?.notifyRequester === true
    const notifyReceiver = payload?.notifyReceiver !== false

    if (!receiverId) {
      return json({ error: 'Missing receiverId' }, 400)
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

    const { data: requester, error: requesterError } = await admin
      .from('users')
      .select('id, name, telegram_id')
      .eq('auth_id', authData.user.id)
      .maybeSingle()

    if (requesterError) return json({ error: requesterError.message }, 500)
    if (!requester?.id) return json({ error: 'Requester not found' }, 404)

    const { data: friendship, error: friendshipError } = await admin
      .from('friendships')
      .select('id')
      .eq('requester_id', requester.id)
      .eq('receiver_id', receiverId)
      .eq('status', 'pending')
      .maybeSingle()

    if (friendshipError) return json({ error: friendshipError.message }, 500)
    if (!friendship) return json({ error: 'No pending friendship found' }, 404)

    const { data: receiver, error: receiverError } = await admin
      .from('users')
      .select('id, name, telegram_id')
      .eq('id', receiverId)
      .maybeSingle()

    if (receiverError) return json({ error: receiverError.message }, 500)
    if (!receiver) return json({ error: 'Receiver not found' }, 404)

    let receiverMessageId: number | null = null
    if (notifyReceiver) {
      if (!receiver.telegram_id) {
        return json({ ok: true, status: 'skipped', reason: 'receiver_has_no_telegram' })
      }

      const senderName = requester.name?.trim() || 'Кто-то'
      const text = `${senderName} хочет добавить вас в друзья.`

      console.log('[send-friend-notification] sending receiver notification', JSON.stringify({
        requesterId: requester.id,
        receiverId: receiver.id,
        targetChatId: receiver.telegram_id,
      }))

      receiverMessageId = await sendTelegramMessage(receiver.telegram_id, text)
    }

    let requesterMessageId: number | null = null
    if (notifyRequester && requester.telegram_id) {
      const receiverName = typeof receiver.name === 'string' && receiver.name.trim()
        ? receiver.name.trim()
        : 'этому человеку'
      const text = [
        `Заявка в друзья ${receiverName} отправлена.`,
        'Теперь нужно немного подождать, пока ее примут.',
      ].join('\n')

      try {
        requesterMessageId = await sendTelegramMessage(requester.telegram_id, text)
      } catch (error) {
        console.warn('[send-friend-notification] requester confirmation failed:', (error as Error).message)
      }
    }

    return json({
      ok: true,
      status: 'sent',
      message_id: receiverMessageId,
      requester_message_id: requesterMessageId,
    })
  } catch (error) {
    console.error('[send-friend-notification] error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
