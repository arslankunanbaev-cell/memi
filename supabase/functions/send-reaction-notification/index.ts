import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const ALLOWED_EMOJIS = new Set(['❤️', '🥹', '😄', '🔥', '🫶'])
const REACTION_SELECT = 'id, moment_id, user_id, emoji, created_at, updated_at'

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

type ReactionRow = {
  id: string
  moment_id: string
  user_id: string
  emoji: string
  created_at: string
  updated_at: string
}

async function getReactionById(admin: ReturnType<typeof createClient>, reactionId: string) {
  const { data: reaction, error } = await admin
    .from('moment_reactions')
    .select(REACTION_SELECT)
    .eq('id', reactionId)
    .maybeSingle()

  if (error) {
    return { reaction: null, error: error.message, status: 500 }
  }

  if (!reaction) {
    return { reaction: null, error: 'Reaction not found', status: 404 }
  }

  return { reaction: reaction as ReactionRow, error: null, status: 200 }
}

async function upsertReactionFromRequest(
  req: Request,
  admin: ReturnType<typeof createClient>,
  momentId: string,
  emoji: string,
) {
  if (!ANON_KEY) {
    return { reaction: null, isNew: false, error: 'Supabase anon key is not configured', status: 500 }
  }

  if (!ALLOWED_EMOJIS.has(emoji)) {
    return { reaction: null, isNew: false, error: 'Invalid emoji', status: 400 }
  }

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader) {
    return { reaction: null, isNew: false, error: 'Missing authorization', status: 401 }
  }

  const userClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  })

  const { data: authData, error: authError } = await userClient.auth.getUser()
  if (authError || !authData?.user?.id) {
    return { reaction: null, isNew: false, error: authError?.message ?? 'Unauthorized', status: 401 }
  }

  const { data: actor, error: actorError } = await admin
    .from('users')
    .select('id')
    .eq('auth_id', authData.user.id)
    .maybeSingle()

  if (actorError) {
    return { reaction: null, isNew: false, error: actorError.message, status: 500 }
  }

  if (!actor?.id) {
    return { reaction: null, isNew: false, error: 'User not found', status: 404 }
  }

  const { data: existingReaction, error: existingError } = await userClient
    .from('moment_reactions')
    .select('id')
    .eq('moment_id', momentId)
    .eq('user_id', actor.id)
    .maybeSingle()

  if (existingError) {
    return { reaction: null, isNew: false, error: existingError.message, status: 500 }
  }

  const { data: reaction, error: upsertError } = await userClient
    .from('moment_reactions')
    .upsert(
      { moment_id: momentId, user_id: actor.id, emoji },
      { onConflict: 'moment_id,user_id' },
    )
    .select(REACTION_SELECT)
    .single()

  if (upsertError) {
    return { reaction: null, isNew: false, error: upsertError.message, status: 500 }
  }

  return {
    reaction: reaction as ReactionRow,
    isNew: !existingReaction,
    error: null,
    status: 200,
  }
}

async function sendNotificationForReaction(admin: ReturnType<typeof createClient>, reaction: ReactionRow) {
  const { data: moment, error: momentError } = await admin
    .from('moments')
    .select('id, user_id, title')
    .eq('id', reaction.moment_id)
    .maybeSingle()

  if (momentError) {
    return { error: momentError.message, status: 500, payload: null }
  }

  if (!moment || moment.user_id === reaction.user_id) {
    return {
      error: null,
      status: 200,
      payload: { ok: true, skipped: 'self_reaction' },
    }
  }

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, name, telegram_id')
    .in('id', [moment.user_id, reaction.user_id])

  if (usersError) {
    return { error: usersError.message, status: 500, payload: null }
  }

  const owner = (users ?? []).find((user) => user.id === moment.user_id)
  const reactor = (users ?? []).find((user) => user.id === reaction.user_id)

  if (!owner?.telegram_id) {
    return {
      error: null,
      status: 200,
      payload: { ok: true, skipped: 'owner_has_no_telegram' },
    }
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

  const meRes = await fetch(`${TG_API}/getMe`, { method: 'POST' })
  const meJson = await meRes.json()

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
    return {
      error: tgJson.description ?? 'Telegram sendMessage failed',
      status: 502,
      payload: null,
    }
  }

  return {
    error: null,
    status: 200,
    payload: {
      ok: true,
      bot_username: meJson?.result?.username ?? null,
      target_chat_id: owner.telegram_id,
      message_id: tgJson?.result?.message_id ?? null,
    },
  }
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
    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let reaction: ReactionRow | null = null
    let isNew = false

    if (payload?.reactionId) {
      const reactionResult = await getReactionById(admin, payload.reactionId)
      if (reactionResult.error || !reactionResult.reaction) {
        return json({ error: reactionResult.error }, reactionResult.status)
      }
      reaction = reactionResult.reaction
    } else if (payload?.momentId && payload?.emoji) {
      const upsertResult = await upsertReactionFromRequest(req, admin, payload.momentId, payload.emoji)
      if (upsertResult.error || !upsertResult.reaction) {
        return json({ error: upsertResult.error }, upsertResult.status)
      }
      reaction = upsertResult.reaction
      isNew = upsertResult.isNew
    } else {
      return json({ error: 'Missing reactionId or momentId/emoji' }, 400)
    }

    const notificationResult = await sendNotificationForReaction(admin, reaction)
    if (notificationResult.error) {
      return json({ error: notificationResult.error }, notificationResult.status)
    }

    if (payload?.reactionId) {
      return json(notificationResult.payload, notificationResult.status)
    }

    return json({
      ok: true,
      reaction,
      isNew,
      notification: notificationResult.payload,
    }, notificationResult.status)
  } catch (error) {
    console.error('[send-reaction-notification] error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
