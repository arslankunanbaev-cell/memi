import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import BottomNav from '../components/BottomNav'
import MomentCard from '../components/MomentCard'
import FAB from '../components/FAB'
import AddMoment from './AddMoment'
import { pluralRu } from '../lib/ruPlural'

// ── helpers ──────────────────────────────────────────────────────────────────

function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

const SEASONS = ['зимой', 'зимой', 'весной', 'весной', 'весной', 'летом', 'летом', 'летом', 'осенью', 'осенью', 'осенью', 'зимой']

function dayLabel(iso) {
  const d = new Date(iso)
  const dayStart = new Date(d); dayStart.setHours(0, 0, 0, 0)
  const t = today()
  const diff = Math.round((t - dayStart) / 86400000)
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  if (diff < 7) return `${diff} ${pluralRu(diff, 'день', 'дня', 'дней')} назад`
  const nowYear = new Date().getFullYear()
  if (d.getFullYear() < nowYear) {
    return `${SEASONS[d.getMonth()].charAt(0).toUpperCase() + SEASONS[d.getMonth()].slice(1)} ${d.getFullYear()}`
  }
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function groupByDay(moments) {
  const map = new Map()
  for (const m of moments) {
    const d = new Date(m.created_at)
    d.setHours(0, 0, 0, 0)
    const key = d.toISOString()
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(m)
  }
  return Array.from(map.entries()).map(([key, items]) => ({
    label: dayLabel(items[0].created_at),
    items,
  }))
}

function formatTopbarDate() {
  return new Date().toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Home() {
  const moments = useAppStore((s) => s.moments)
  const [showAdd, setShowAdd] = useState(false)

  const groups = groupByDay(moments)
  const isEmpty = moments.length === 0

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {isEmpty ? (
        /* ── Empty state ── */
        <div className="flex-1 flex flex-col items-center justify-center px-4 gap-5 pb-20">
          {/* Central FAB-like circle */}
          <div
            className="flex items-center justify-center"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'var(--surface)',
            }}
          >
            <span style={{ fontSize: 34 }}>✨</span>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <h2
              className="font-serif"
              style={{ fontSize: 26, color: 'var(--text)', fontWeight: 400 }}
            >
              Твой первый момент
            </h2>
            <p
              className="font-sans"
              style={{ fontSize: 15, color: 'var(--mid)', lineHeight: 1.6, maxWidth: 240 }}
            >
              Запомни что-то прямо сейчас — фото, слово, ощущение
            </p>
          </div>

          <button
            onClick={() => setShowAdd(true)}
            className="font-sans font-medium transition-opacity active:opacity-70"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: 9999,
              padding: '13px 32px',
              fontSize: 15,
              border: 'none',
            }}
          >
            Добавить момент
          </button>
        </div>
      ) : (
        /* ── Moments list ── */
        <>
          {/* Topbar */}
          <div
            className="flex items-center justify-between px-4 pt-topbar"
            style={{ paddingBottom: 12 }}
          >
            <h1
              className="font-serif"
              style={{ fontSize: 28, color: 'var(--text)', fontWeight: 600 }}
            >
              memi
            </h1>
            <span
              className="font-sans capitalize"
              style={{ fontSize: 13, color: 'var(--mid)' }}
            >
              {formatTopbarDate()}
            </span>
          </div>

          {/* Grouped list */}
          <div className="flex-1 overflow-y-auto px-4 pb-28">
            {groups.map((group, gi) => (
              <div key={group.label} className="mb-6">
                <p
                  className="font-sans uppercase tracking-widest mb-3 font-semibold"
                  style={{ fontSize: 12, color: 'var(--soft)' }}
                >
                  {group.label}
                </p>
                <div className="flex flex-col gap-3">
                  {group.items.map((m, i) => (
                    <div
                      key={m.id}
                      style={{
                        animation: 'fadeSlideUp 0.3s ease both',
                        animationDelay: `${(gi * 3 + i) * 80}ms`,
                      }}
                    >
                      <MomentCard moment={m} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <FAB onClick={() => setShowAdd(true)} />
        </>
      )}

      <BottomNav active="home" />
      {showAdd && <AddMoment onClose={() => setShowAdd(false)} />}
    </div>
  )
}
