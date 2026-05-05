import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Triggered daily via pg_cron or external scheduler.
// Setup: SELECT cron.schedule('send-reminders', '0 10 * * *', $$
//   SELECT net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/send-reminders',
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb
//   );
// $$);

const BOT_TOKEN      = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL   = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY    = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TG_API         = `https://api.telegram.org/bot${BOT_TOKEN}`

const INACTIVITY_DAYS = 3

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function sendMessage(chatId: number | string, text: string) {
  const res = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })
  if (!res.ok) {
    const err = await res.text().catch(() => '')
    console.warn(`[send-reminders] sendMessage failed for chatId=${chatId}: ${err}`)
  }
}

// ── Reminders for users inactive N+ days ──────────────────────────────────────
async function sendInactivityReminders(sb: ReturnType<typeof createClient>) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - INACTIVITY_DAYS)

  // Users who have at least one moment but last posted before the cutoff
  const { data: inactive, error } = await sb.rpc('get_inactive_users', {
    p_cutoff: cutoff.toISOString(),
  })

  if (error) {
    // Fallback: raw query if RPC doesn't exist yet
    console.warn('[send-reminders] RPC get_inactive_users not found, using raw query')
    return await sendInactivityRemindersRaw(sb, cutoff)
  }

  if (!inactive?.length) {
    console.log('[send-reminders] no inactive users')
    return 0
  }

  let sent = 0
  for (const row of inactive as Array<{ telegram_id: number; name: string; days_ago: number }>) {
    if (!row.telegram_id) continue

    const firstName = row.name?.split(' ')[0] ?? 'привет'
    const days = row.days_ago ?? INACTIVITY_DAYS
    const text = days >= 7
      ? `${firstName}, ты не заходил в memi уже ${days} дней 🌿\n\nКаждый момент стоит того, чтобы его сохранить — даже маленький.`
      : `${firstName}, давно не было новых моментов 🕊\n\nЧто-нибудь интересное случилось сегодня?`

    await sendMessage(row.telegram_id, text)
    sent++
  }

  return sent
}

async function sendInactivityRemindersRaw(
  sb: ReturnType<typeof createClient>,
  cutoff: Date,
) {
  const { data: users, error } = await sb
    .from('users')
    .select('id, telegram_id, name')
    .not('telegram_id', 'is', null)

  if (error || !users?.length) return 0

  let sent = 0

  for (const user of users as Array<{ id: string; telegram_id: number; name: string }>) {
    const { data: lastMoment } = await sb
      .from('moments')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Skip users who have never posted or posted recently
    if (!lastMoment) continue
    if (new Date(lastMoment.created_at) > cutoff) continue

    const daysAgo = Math.floor(
      (Date.now() - new Date(lastMoment.created_at).getTime()) / 86_400_000,
    )

    const firstName = user.name?.split(' ')[0] ?? 'привет'
    const text = daysAgo >= 7
      ? `${firstName}, ты не заходил в memi уже ${daysAgo} дней 🌿\n\nКаждый момент стоит того, чтобы его сохранить — даже маленький.`
      : `${firstName}, давно не было новых моментов 🕊\n\nЧто-нибудь интересное случилось сегодня?`

    await sendMessage(user.telegram_id, text)
    sent++
  }

  return sent
}

// ── Anniversary reminders ("год назад") ───────────────────────────────────────
async function sendAnniversaryReminders(sb: ReturnType<typeof createClient>) {
  const now = new Date()
  const yearAgo = new Date(now)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

  // Moments from exactly 1 year ago (same calendar day)
  const dayStart = new Date(yearAgo)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(yearAgo)
  dayEnd.setHours(23, 59, 59, 999)

  const { data: moments, error } = await sb
    .from('moments')
    .select('id, title, user_id, users!inner(telegram_id, name)')
    .gte('created_at', dayStart.toISOString())
    .lte('created_at', dayEnd.toISOString())

  if (error) {
    console.error('[send-reminders] anniversary query failed:', error)
    return 0
  }

  if (!moments?.length) return 0

  // One message per user (group their moments)
  const byUser = new Map<string, { telegramId: number; name: string; titles: string[] }>()

  for (const m of moments as Array<{
    id: string
    title: string | null
    user_id: string
    users: { telegram_id: number; name: string }
  }>) {
    const tgId = m.users?.telegram_id
    if (!tgId) continue

    if (!byUser.has(m.user_id)) {
      byUser.set(m.user_id, {
        telegramId: tgId,
        name: m.users.name,
        titles: [],
      })
    }

    if (m.title) {
      byUser.get(m.user_id)!.titles.push(m.title)
    }
  }

  let sent = 0

  for (const [, info] of byUser) {
    const firstName = info.name?.split(' ')[0] ?? 'привет'
    const count = info.titles.length
    const sample = info.titles.slice(0, 2).map((t) => `«${t}»`).join(', ')

    const text = count === 1
      ? `${firstName}, год назад ты сохранил момент ${sample} 🕰\n\nОткрой memi, чтобы вспомнить.`
      : `${firstName}, год назад у тебя было ${count} момент${count < 5 ? 'а' : 'ов'}: ${sample}${count > 2 ? ' и другие' : ''} 🕰\n\nОткрой memi, чтобы вспомнить.`

    await sendMessage(info.telegramId, text)
    sent++
  }

  return sent
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Missing environment variables' }, 500)
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    const [inactive, anniversaries] = await Promise.all([
      sendInactivityReminders(sb),
      sendAnniversaryReminders(sb),
    ])

    console.log(`[send-reminders] done: inactive=${inactive} anniversaries=${anniversaries}`)
    return json({ ok: true, inactive, anniversaries })
  } catch (err) {
    console.error('[send-reminders] fatal:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

// deno-lint-ignore no-explicit-any
declare function createClient(...args: any[]): any
