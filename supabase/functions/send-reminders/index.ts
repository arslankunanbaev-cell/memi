import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

// Triggered daily via pg_cron or external scheduler.
// Setup: SELECT cron.schedule('send-reminders', '0 10 * * *', $$
//   SELECT net.http_post(
//     url := '<SUPABASE_URL>/functions/v1/send-reminders',
//     headers := '{"Authorization": "Bearer <SERVICE_ROLE_KEY>", "Content-Type": "application/json"}'::jsonb,
//     body := '{}'::jsonb
//   );
// $$);

const BOT_TOKEN    = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TG_API       = `https://api.telegram.org/bot${BOT_TOKEN}`

const RITUAL_INTERVAL_DAYS = 2
const MEMORY_INTERVAL_DAYS = 2
const MEMORY_MIN_AGE_DAYS = 14

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function daysAgo(dateLike: string) {
  return Math.floor((Date.now() - new Date(dateLike).getTime()) / 86_400_000)
}

function firstName(name: string | null | undefined) {
  return name?.split(' ')[0] || 'привет'
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

// ── Main ritual: every couple of days without a new moment ────────────────────
async function sendRitualReminders(sb: ReturnType<typeof createClient>) {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - RITUAL_INTERVAL_DAYS)

  const { data: users, error } = await sb
    .from('users')
    .select('id, telegram_id, name, last_ritual_reminder_at')
    .not('telegram_id', 'is', null)

  if (error || !users?.length) return 0

  let sent = 0

  for (const user of users as Array<{
    id: string
    telegram_id: number
    name: string | null
    last_ritual_reminder_at: string | null
  }>) {
    if (user.last_ritual_reminder_at && new Date(user.last_ritual_reminder_at) > cutoff) {
      continue
    }

    const { data: lastMoment } = await sb
      .from('moments')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!lastMoment || new Date(lastMoment.created_at) > cutoff) continue

    const idleDays = daysAgo(lastMoment.created_at)
    const text = idleDays >= 7
      ? `${firstName(user.name)}, в memi уже ${idleDays} дней нет новых моментов.\n\nВернись на минуту: сохрани маленькую деталь последних дней, пока она не растворилась.`
      : `${firstName(user.name)}, пора для маленького ритуала memi.\n\nЧто из последних пары дней хочется сохранить: место, человек, трек или одна фраза?`

    await sendMessage(user.telegram_id, text)
    await sb
      .from('users')
      .update({ last_ritual_reminder_at: new Date().toISOString() })
      .eq('id', user.id)
    sent++
  }

  return sent
}

// ── Memory return: bring an older saved moment back ───────────────────────────
async function sendMemoryReturnReminders(sb: ReturnType<typeof createClient>) {
  const reminderCutoff = new Date()
  reminderCutoff.setDate(reminderCutoff.getDate() - MEMORY_INTERVAL_DAYS)

  const memoryCutoff = new Date()
  memoryCutoff.setDate(memoryCutoff.getDate() - MEMORY_MIN_AGE_DAYS)

  const { data: users, error } = await sb
    .from('users')
    .select('id, telegram_id, name, last_memory_reminder_at, last_ritual_reminder_at')
    .not('telegram_id', 'is', null)

  if (error || !users?.length) return 0

  let sent = 0

  for (const user of users as Array<{
    id: string
    telegram_id: number
    name: string | null
    last_memory_reminder_at: string | null
    last_ritual_reminder_at: string | null
  }>) {
    if (user.last_memory_reminder_at && new Date(user.last_memory_reminder_at) > reminderCutoff) {
      continue
    }
    if (user.last_ritual_reminder_at && new Date(user.last_ritual_reminder_at) > reminderCutoff) {
      continue
    }

    const { data: moment, error: momentError } = await sb
      .from('moments')
      .select('id, title, created_at, location, song_title')
      .eq('user_id', user.id)
      .lte('created_at', memoryCutoff.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (momentError || !moment) continue

    const title = moment.title ? `«${moment.title}»` : 'один старый момент'
    const details = [moment.location, moment.song_title].filter(Boolean).join(' · ')
    const detailLine = details ? `\n\n${details}` : ''
    const text = `${firstName(user.name)}, memi нашёл воспоминание, к которому стоит вернуться: ${title}.${detailLine}\n\nОткрой приложение и посмотри на него свежими глазами.`

    await sendMessage(user.telegram_id, text)
    await sb
      .from('users')
      .update({ last_memory_reminder_at: new Date().toISOString() })
      .eq('id', user.id)
    sent++
  }

  return sent
}

// ── Anniversary reminders ("год назад") ───────────────────────────────────────
async function sendAnniversaryReminders(sb: ReturnType<typeof createClient>) {
  const now = new Date()
  const yearAgo = new Date(now)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)

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

    if (m.title) byUser.get(m.user_id)!.titles.push(m.title)
  }

  let sent = 0

  for (const [, info] of byUser) {
    const count = info.titles.length
    const sample = info.titles.slice(0, 2).map((title) => `«${title}»`).join(', ')

    const text = count === 1
      ? `${firstName(info.name)}, год назад ты сохранил момент ${sample}.\n\nОткрой memi, чтобы вспомнить.`
      : `${firstName(info.name)}, год назад у тебя было ${count} момента: ${sample}${count > 2 ? ' и другие' : ''}.\n\nОткрой memi, чтобы вспомнить.`

    await sendMessage(info.telegramId, text)
    sent++
  }

  return sent
}

// ── Handler ──────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  if (!BOT_TOKEN || !SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Missing environment variables' }, 500)
  }

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const sb = createClient(SUPABASE_URL, SERVICE_KEY)

  try {
    const rituals = await sendRitualReminders(sb)
    const [memories, anniversaries] = await Promise.all([
      sendMemoryReturnReminders(sb),
      sendAnniversaryReminders(sb),
    ])

    console.log(`[send-reminders] done: rituals=${rituals} memories=${memories} anniversaries=${anniversaries}`)
    return json({ ok: true, rituals, memories, anniversaries })
  } catch (err) {
    console.error('[send-reminders] fatal:', err)
    return json({ error: (err as Error).message }, 500)
  }
})

// deno-lint-ignore no-explicit-any
declare function createClient(...args: any[]): any
