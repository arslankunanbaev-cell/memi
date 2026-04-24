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

type AppUserRow = {
  id: string
  name: string | null
  telegram_id: string | number | null
}

type MomentRow = {
  id: string
  user_id: string
  title: string | null
}

type NotificationResult = {
  user_id: string
  status: 'sent' | 'skipped' | 'error'
  reason?: string
  message_id?: number | null
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

async function getActor(req: Request, admin: ReturnType<typeof createClient>) {
  const authHeader = req.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return { actor: null, error: 'Missing authorization', status: 401 }
  }

  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData?.user?.id) {
    return { actor: null, error: authError?.message ?? 'Unauthorized', status: 401 }
  }

  const { data: actor, error: actorError } = await admin
    .from('users')
    .select('id, name, telegram_id')
    .eq('auth_id', authData.user.id)
    .maybeSingle()

  if (actorError) {
    return { actor: null, error: actorError.message, status: 500 }
  }

  if (!actor?.id) {
    return { actor: null, error: 'User not found', status: 404 }
  }

  return {
    actor: actor as AppUserRow,
    error: null,
    status: 200,
  }
}

async function sendNotifications(
  admin: ReturnType<typeof createClient>,
  moment: MomentRow,
  actor: AppUserRow,
  taggedUserIds: string[],
) {
  const uniqueUserIds = [...new Set(taggedUserIds.filter(Boolean))]
  if (!uniqueUserIds.length) {
    return {
      error: null,
      status: 200,
      payload: { ok: true, sent_count: 0, results: [] as NotificationResult[] },
    }
  }

  const { data: participants, error: participantsError } = await admin
    .from('moment_participants')
    .select('user_id')
    .eq('moment_id', moment.id)
    .in('user_id', uniqueUserIds)

  if (participantsError) {
    return { error: participantsError.message, status: 500, payload: null }
  }

  const participantIds = new Set((participants ?? []).map((participant) => participant.user_id))

  const { data: users, error: usersError } = await admin
    .from('users')
    .select('id, name, telegram_id')
    .in('id', uniqueUserIds)

  if (usersError) {
    return { error: usersError.message, status: 500, payload: null }
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user as AppUserRow]))
  const results: NotificationResult[] = []
  let sentCount = 0

  for (const userId of uniqueUserIds) {
    if (userId === moment.user_id) {
      results.push({ user_id: userId, status: 'skipped', reason: 'self_tag' })
      continue
    }

    if (!participantIds.has(userId)) {
      results.push({ user_id: userId, status: 'skipped', reason: 'not_a_participant' })
      continue
    }

    const taggedUser = usersById.get(userId)
    if (!taggedUser) {
      results.push({ user_id: userId, status: 'skipped', reason: 'user_not_found' })
      continue
    }

    if (!taggedUser.telegram_id) {
      results.push({ user_id: userId, status: 'skipped', reason: 'user_has_no_telegram' })
      continue
    }

    const actorName = actor.name?.trim() || 'Ваш друг'
    const text = moment.title
      ? `${actorName} отметил вас в воспоминании «${moment.title}».`
      : `${actorName} отметил вас в одном воспоминании.`

    console.log(
      '[send-tag-notification] sending',
      JSON.stringify({
        momentId: moment.id,
        actorUserId: actor.id,
        taggedUserId: taggedUser.id,
        targetChatId: taggedUser.telegram_id,
      }),
    )

    const tgRes = await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: taggedUser.telegram_id,
        text,
      }),
    })
    const tgJson = await tgRes.json()

    if (!tgJson.ok) {
      results.push({
        user_id: userId,
        status: 'error',
        reason: tgJson.description ?? 'Telegram sendMessage failed',
      })
      continue
    }

    results.push({
      user_id: userId,
      status: 'sent',
      message_id: tgJson?.result?.message_id ?? null,
    })
    sentCount += 1
  }

  return {
    error: null,
    status: 200,
    payload: {
      ok: true,
      sent_count: sentCount,
      results,
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
    const momentId = typeof payload?.momentId === 'string' ? payload.momentId : ''
    const taggedUserIds = Array.isArray(payload?.taggedUserIds)
      ? payload.taggedUserIds.filter((userId: unknown): userId is string => typeof userId === 'string')
      : []

    if (!momentId || !taggedUserIds.length) {
      return json({ error: 'Missing momentId or taggedUserIds' }, 400)
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const actorResult = await getActor(req, admin)
    if (actorResult.error || !actorResult.actor) {
      return json({ error: actorResult.error }, actorResult.status)
    }

    const { data: moment, error: momentError } = await admin
      .from('moments')
      .select('id, user_id, title')
      .eq('id', momentId)
      .maybeSingle()

    if (momentError) {
      return json({ error: momentError.message }, 500)
    }

    if (!moment) {
      return json({ error: 'Moment not found' }, 404)
    }

    if (moment.user_id !== actorResult.actor.id) {
      return json({ error: 'Only the moment owner can notify tagged friends' }, 403)
    }

    const notificationResult = await sendNotifications(
      admin,
      moment as MomentRow,
      actorResult.actor,
      taggedUserIds,
    )

    if (notificationResult.error) {
      return json({ error: notificationResult.error }, notificationResult.status)
    }

    return json(notificationResult.payload, notificationResult.status)
  } catch (error) {
    console.error('[send-tag-notification] error:', error)
    return json({ error: (error as Error).message }, 500)
  }
})
