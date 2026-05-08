import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { RouteLoadingState } from '../components/LoadingState'
import { getAdminStats } from '../lib/adminStats'

function formatNumber(value) {
  return new Intl.NumberFormat('ru-RU').format(value ?? 0)
}

function formatDate(value) {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
}

function formatDateTime(value) {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function MetricCard({ label, value, hint }) {
  return (
    <div
      className="rounded-[8px] p-4"
      style={{
        backgroundColor: 'var(--moment-surface)',
        border: '1px solid var(--divider)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <p className="font-sans type-meta" style={{ color: 'var(--mid)', margin: 0 }}>
        {label}
      </p>
      <p className="font-sans" style={{ color: 'var(--text)', fontSize: 26, fontWeight: 700, margin: '8px 0 0' }}>
        {formatNumber(value)}
      </p>
      {hint ? (
        <p className="font-sans type-meta" style={{ color: 'var(--soft)', margin: '6px 0 0' }}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0 }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function DailyBars({ rows }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.opens, row.activeUsers, row.newMoments)))

  return (
    <div
      className="rounded-[8px] p-4"
      style={{ backgroundColor: 'var(--moment-surface)', border: '1px solid var(--divider)' }}
    >
      <div className="flex items-end gap-2" style={{ height: 150 }}>
        {rows.map((row) => (
          <div key={row.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
            <div className="flex w-full items-end justify-center gap-1">
              <span
                className="block rounded-t-[4px]"
                title={`Заходы: ${row.opens}`}
                style={{
                  width: '30%',
                  minWidth: 4,
                  height: `${Math.max(4, (row.opens / max) * 118)}px`,
                  backgroundColor: 'var(--accent)',
                }}
              />
              <span
                className="block rounded-t-[4px]"
                title={`Активные: ${row.activeUsers}`}
                style={{
                  width: '30%',
                  minWidth: 4,
                  height: `${Math.max(4, (row.activeUsers / max) * 118)}px`,
                  backgroundColor: 'var(--deep)',
                }}
              />
              <span
                className="block rounded-t-[4px]"
                title={`Моменты: ${row.newMoments}`}
                style={{
                  width: '30%',
                  minWidth: 4,
                  height: `${Math.max(4, (row.newMoments / max) * 118)}px`,
                  backgroundColor: 'var(--soft)',
                }}
              />
            </div>
            <span className="font-sans truncate" style={{ color: 'var(--mid)', fontSize: 10 }}>
              {formatDate(row.date)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Legend color="var(--accent)" label="заходы" />
        <Legend color="var(--deep)" label="активные" />
        <Legend color="var(--soft)" label="моменты" />
      </div>
    </div>
  )
}

function Legend({ color, label }) {
  return (
    <span className="font-sans inline-flex items-center gap-2 type-meta" style={{ color: 'var(--mid)' }}>
      <span className="block rounded-full" style={{ width: 8, height: 8, backgroundColor: color }} />
      {label}
    </span>
  )
}

function DataList({ rows, empty, renderRow }) {
  if (!rows?.length) {
    return (
      <div className="rounded-[8px] p-4 font-sans type-body" style={{ backgroundColor: 'var(--surface)', color: 'var(--mid)' }}>
        {empty}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[8px]" style={{ border: '1px solid var(--divider)' }}>
      {rows.map(renderRow)}
    </div>
  )
}

export default function AdminStats() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const nextStats = await getAdminStats()
        if (!cancelled) setStats(nextStats)
      } catch (err) {
        if (!cancelled) setError(err?.message ?? 'Не удалось загрузить статистику')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const generatedLabel = useMemo(() => {
    if (!stats?.generatedAt) return ''
    return `обновлено ${formatDateTime(stats.generatedAt)}`
  }, [stats?.generatedAt])

  if (loading) return <RouteLoadingState />

  return (
    <main className="h-full overflow-y-auto bg-base pb-safe">
      <PageHeader
        title="Статистика"
        subtitle={generatedLabel || 'Memi admin'}
      />

      <div className="space-y-6 px-4 pt-5">
        {error ? (
          <div
            className="rounded-[8px] p-4 font-sans type-body"
            style={{ backgroundColor: 'rgba(217, 64, 64, 0.08)', color: '#D94040' }}
          >
            {error}
          </div>
        ) : null}

        {stats ? (
          <>
            <section className="grid grid-cols-2 gap-3">
              <MetricCard label="Пользователи" value={stats.totals.users} hint={`+${formatNumber(stats.activity.newUsers30)} за 30 дней`} />
              <MetricCard label="Заходы сегодня" value={stats.activity.opensToday} hint={`${formatNumber(stats.activity.opens7)} за 7 дней`} />
              <MetricCard label="Активные 7д" value={stats.activity.activeUsers7} hint={`${formatNumber(stats.activity.activeUsers30)} за 30 дней`} />
              <MetricCard label="Моменты" value={stats.totals.moments} hint={`+${formatNumber(stats.activity.moments7)} за 7 дней`} />
              <MetricCard label="Люди" value={stats.totals.people} />
              <MetricCard label="Premium" value={stats.totals.premiumUsers} />
            </section>

            <Section title="Последние 14 дней">
              <DailyBars rows={stats.daily ?? []} />
            </Section>

            <Section title="События">
              <DataList
                rows={stats.events}
                empty="Событий пока нет"
                renderRow={(event) => (
                  <div
                    key={event.name}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                    style={{ backgroundColor: 'var(--moment-surface)', borderBottom: '1px solid var(--divider)' }}
                  >
                    <span className="font-sans type-body" style={{ color: 'var(--text)' }}>{event.name}</span>
                    <span className="font-sans type-body" style={{ color: 'var(--mid)', fontWeight: 700 }}>{formatNumber(event.count)}</span>
                  </div>
                )}
              />
            </Section>

            <Section title="Самые активные">
              <DataList
                rows={stats.topUsers}
                empty="Активных пользователей за 30 дней пока нет"
                renderRow={(user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                    style={{ backgroundColor: 'var(--moment-surface)', borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-sans truncate type-body" style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>
                        {user.name}
                      </p>
                      <p className="font-sans type-meta" style={{ color: 'var(--mid)', margin: '3px 0 0' }}>
                        {user.telegramId ? `tg ${user.telegramId}` : 'tg unknown'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-sans type-body" style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>
                        {formatNumber(user.opens)}
                      </p>
                      <p className="font-sans type-meta" style={{ color: 'var(--mid)', margin: '3px 0 0' }}>
                        {formatNumber(user.moments)} мом.
                      </p>
                    </div>
                  </div>
                )}
              />
            </Section>

            <Section title="Новые пользователи">
              <DataList
                rows={stats.newestUsers}
                empty="Новых пользователей за 30 дней пока нет"
                renderRow={(user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                    style={{ backgroundColor: 'var(--moment-surface)', borderBottom: '1px solid var(--divider)' }}
                  >
                    <div className="min-w-0">
                      <p className="font-sans truncate type-body" style={{ color: 'var(--text)', margin: 0, fontWeight: 700 }}>
                        {user.name}
                      </p>
                      <p className="font-sans type-meta" style={{ color: 'var(--mid)', margin: '3px 0 0' }}>
                        {user.telegramId ? `tg ${user.telegramId}` : 'tg unknown'}
                      </p>
                    </div>
                    <span className="font-sans type-meta" style={{ color: 'var(--mid)' }}>
                      {formatDateTime(user.createdAt)}
                    </span>
                  </div>
                )}
              />
            </Section>
          </>
        ) : null}
      </div>
    </main>
  )
}
