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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase or Telegram env is not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  try {
    const { reactionId } = await req.json()

    if (!reactionId) {
      return new Response(JSON.stringify({ error: 'Missing reactionId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: reaction, error: reactionError } = await admin
      .from('moment_reactions')
      .select('id, moment_id, user_id, emoji, created_at, updated_at')
      .eq('id', reactionId)
      .maybeSingle()

    if (reactionError) {
      return new Response(JSON.stringify({ error: reactionError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    if (!reaction) {
      return new Response(JSON.stringify({ error: 'Reaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: moment, error: momentError } = await admin
      .from('moments')
      .select('id, user_id, title')
      .eq('id', reaction.moment_id)
      .maybeSingle()

    if (momentError) {
      return new Response(JSON.stringify({ error: momentError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    if (!moment || moment.user_id === reaction.user_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'self_reaction' }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const { data: users, error: usersError } = await admin
      .from('users')
      .select('id, name, telegram_id')
      .in('id', [moment.user_id, reaction.user_id])

    if (usersError) {
      return new Response(JSON.stringify({ error: usersError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const owner = (users ?? []).find((user) => user.id === moment.user_id)
    const reactor = (users ?? []).find((user) => user.id === reaction.user_id)

    if (!owner?.telegram_id) {
      return new Response(JSON.stringify({ ok: true, skipped: 'owner_has_no_telegram' }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const titleSuffix = moment.title ? ` "${moment.title}"` : ''
    const text = `${reactor?.name ?? 'Кто-то'} отреагировал${reaction.emoji ? ` ${reaction.emoji}` : ''} на ваш момент${titleSuffix}`

    console.log(
      '[send-reaction-notification] sending',
      JSON.stringify({
        reactionId: reaction.id,
        ownerUserId: owner.id,
        reactorUserId: reaction.user_id,
        ownerChatId: owner.telegram_id,
      }),
    )

    const tgRes = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: owner.telegram_id,
        text,
        disable_notification: true,
      }),
    })
    const tgJson = await tgRes.json()

    if (!tgJson.ok) {
      return new Response(JSON.stringify({ error: tgJson.description ?? 'Telegram sendMessage failed' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (error) {
    console.error('[send-reaction-notification] error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
