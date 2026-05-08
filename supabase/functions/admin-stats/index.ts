import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ADMIN_TELEGRAM_IDS = (Deno.env.get('ADMIN_TELEGRAM_IDS') ?? '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type EventRow = {
  event_name: string
  user_id: string | null
  created_at: string
}

type UserRow = {
  id: string
  telegram_id: number | null
  name: string | null
  created_at: string
  is_premium: boolean | null
  premium_expires_at: string | null
}

type MomentRow = {
  user_id: string | null
  created_at: string
  visibility: string | null
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function dayKey(dateLike: string | Date) {
  return new Date(dateLike).toISOString().slice(0, 10)
}

function addCount(map: Map<string, number>, key: string, amount = 1) {
  map.set(key, (map.get(key) ?? 0) + amount)
}

function toSortedEntries(map: Map<string, number>, limit = 10) {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count }))
}

async function countRows(sb: ReturnType<typeof createClient>, table: string, build?: (query: any) => any) {
  let query = sb.from(table).select('id', { count: 'exact', head: true })
  if (build) query = build(query)

  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return json({ error: 'Supabase service credentials are not configured' }, 500)
  }

  if (ADMIN_TELEGRAM_IDS.length === 0) {
    return json({ error: 'ADMIN_TELEGRAM_IDS is not configured' }, 403)
  }

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Missing Authorization bearer token' }, 401)

  const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: authData, error: authError } = await sb.auth.getUser(token)
  if (authError || !authData.user?.id) {
    return json({ error: 'Invalid session' }, 401)
  }

  const { data: requester, error: requesterError } = await sb
    .from('users')
    .select('id, telegram_id, name')
    .eq('auth_id', authData.user.id)
    .maybeSingle()

  if (requesterError) return json({ error: requesterError.message }, 500)
  if (!requester?.telegram_id || !ADMIN_TELEGRAM_IDS.includes(String(requester.telegram_id))) {
    return json({ error: 'Forbidden' }, 403)
  }

  const now = new Date()
  const today = dayKey(now)
  const since7 = new Date(now.getTime() - 7 * 86_400_000).toISOString()
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString()
  const since14 = new Date(now.getTime() - 13 * 86_400_000)
  since14.setUTCHours(0, 0, 0, 0)

  const [
    totalUsers,
    totalMoments,
    totalPeople,
    totalEvents,
    totalFriendships,
    totalCollections,
    premiumUsers,
    usersLast30Result,
    eventsLast30Result,
    momentsLast30Result,
  ] = await Promise.all([
    countRows(sb, 'users'),
    countRows(sb, 'moments'),
    countRows(sb, 'people'),
    countRows(sb, 'events'),
    countRows(sb, 'friendships'),
    countRows(sb, 'collections').catch(() => 0),
    countRows(sb, 'users', (query) => query.eq('is_premium', true)),
    sb
      .from('users')
      .select('id, telegram_id, name, created_at, is_premium, premium_expires_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(10000),
    sb
      .from('events')
      .select('event_name, user_id, created_at')
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(10000),
    sb
      .from('moments')
      .select('user_id, created_at, visibility')
      .gte('created_at', since30)
      .order('created_at', { ascending: false })
      .limit(10000),
  ])

  if (usersLast30Result.error) throw usersLast30Result.error
  if (eventsLast30Result.error) throw eventsLast30Result.error
  if (momentsLast30Result.error) throw momentsLast30Result.error

  const usersLast30 = (usersLast30Result.data ?? []) as UserRow[]
  const eventsLast30 = (eventsLast30Result.data ?? []) as EventRow[]
  const momentsLast30 = (momentsLast30Result.data ?? []) as MomentRow[]

  const active7 = new Set<string>()
  const active30 = new Set<string>()
  const eventCounts = new Map<string, number>()
  const opensByUser = new Map<string, number>()
  const momentsByUser = new Map<string, number>()
  const daily = new Map<string, { date: string; opens: number; activeUsers: Set<string>; newUsers: number; newMoments: number }>()

  for (let i = 0; i < 14; i += 1) {
    const date = new Date(since14)
    date.setUTCDate(since14.getUTCDate() + i)
    const key = dayKey(date)
    daily.set(key, { date: key, opens: 0, activeUsers: new Set(), newUsers: 0, newMoments: 0 })
  }

  for (const user of usersLast30) {
    const bucket = daily.get(dayKey(user.created_at))
    if (bucket) bucket.newUsers += 1
  }

  for (const moment of momentsLast30) {
    if (moment.user_id) addCount(momentsByUser, moment.user_id)
    const bucket = daily.get(dayKey(moment.created_at))
    if (bucket) bucket.newMoments += 1
  }

  for (const event of eventsLast30) {
    addCount(eventCounts, event.event_name)
    if (!event.user_id) continue

    active30.add(event.user_id)
    if (event.created_at >= since7) active7.add(event.user_id)

    const bucket = daily.get(dayKey(event.created_at))
    if (bucket) {
      bucket.activeUsers.add(event.user_id)
      if (event.event_name === 'app_opened') bucket.opens += 1
    }

    if (event.event_name === 'app_opened') {
      addCount(opensByUser, event.user_id)
    }
  }

  const topIds = Array.from(new Set([
    ...Array.from(opensByUser.keys()),
    ...Array.from(momentsByUser.keys()),
  ])).slice(0, 100)

  const { data: topUsersRows, error: topUsersError } = topIds.length > 0
    ? await sb
      .from('users')
      .select('id, telegram_id, name, created_at, is_premium, premium_expires_at')
      .in('id', topIds)
    : { data: [], error: null }

  if (topUsersError) throw topUsersError

  const usersById = new Map((topUsersRows as UserRow[]).map((user) => [user.id, user]))
  const topUsers = Array.from(topIds)
    .map((id) => {
      const user = usersById.get(id)
      return {
        id,
        name: user?.name ?? 'User',
        telegramId: user?.telegram_id ?? null,
        opens: opensByUser.get(id) ?? 0,
        moments: momentsByUser.get(id) ?? 0,
        isPremium: user?.is_premium === true,
      }
    })
    .sort((a, b) => (b.opens + b.moments) - (a.opens + a.moments))
    .slice(0, 12)

  const opensToday = daily.get(today)?.opens ?? 0
  const opens7 = eventsLast30.filter((event) => event.event_name === 'app_opened' && event.created_at >= since7).length
  const opens30 = eventsLast30.filter((event) => event.event_name === 'app_opened').length
  const moments7 = momentsLast30.filter((moment) => moment.created_at >= since7).length

  return json({
    generatedAt: now.toISOString(),
    requester: { name: requester.name, telegramId: requester.telegram_id },
    totals: {
      users: totalUsers,
      moments: totalMoments,
      people: totalPeople,
      events: totalEvents,
      friendships: totalFriendships,
      collections: totalCollections,
      premiumUsers,
    },
    activity: {
      opensToday,
      opens7,
      opens30,
      activeUsers7: active7.size,
      activeUsers30: active30.size,
      newUsers30: usersLast30.length,
      moments7,
      moments30: momentsLast30.length,
    },
    daily: Array.from(daily.values()).map((entry) => ({
      date: entry.date,
      opens: entry.opens,
      activeUsers: entry.activeUsers.size,
      newUsers: entry.newUsers,
      newMoments: entry.newMoments,
    })),
    events: toSortedEntries(eventCounts, 12),
    topUsers,
    newestUsers: usersLast30.slice(0, 10).map((user) => ({
      id: user.id,
      name: user.name ?? 'User',
      telegramId: user.telegram_id,
      createdAt: user.created_at,
      isPremium: user.is_premium === true,
    })),
  })
})
