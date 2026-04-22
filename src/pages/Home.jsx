import { useState } from 'react'
import { pluralRu } from '../lib/ruPlural'
import BottomNav from '../components/BottomNav'
import FAB from '../components/FAB'
import MomentCard from '../components/MomentCard'
import { getMomentAddedAt } from '../lib/momentTime'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'

function today() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const SEASONS = ['зимой', 'зимой', 'весной', 'весной', 'весной', 'летом', 'летом', 'летом', 'осенью', 'осенью', 'осенью', 'зимой']

function dayLabel(iso) {
  const date = new Date(iso)
  const dayStart = new Date(date)
  dayStart.setHours(0, 0, 0, 0)

  const diff = Math.round((today() - dayStart) / 86400000)

  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  if (diff < 7) return `${diff} ${pluralRu(diff, 'день', 'дня', 'дней')} назад`

  const currentYear = new Date().getFullYear()
  if (date.getFullYear() < currentYear) {
    const season = SEASONS[date.getMonth()]
    return `${season[0].toUpperCase()}${season.slice(1)} ${date.getFullYear()}`
  }

  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function groupByDay(moments) {
  const groups = new Map()

  for (const moment of moments) {
    const date = new Date(getMomentAddedAt(moment))
    date.setHours(0, 0, 0, 0)

    const key = date.toISOString()

    if (!groups.has(key)) {
      groups.set(key, [])
    }

    groups.get(key).push(moment)
  }

  return Array.from(groups.values()).map((items) => ({
    label: dayLabel(getMomentAddedAt(items[0])),
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

export default function Home() {
  const moments = useAppStore((state) => state.moments)
  const [showAdd, setShowAdd] = useState(false)

  const groups = groupByDay(moments)
  const isEmpty = moments.length === 0

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      {isEmpty ? (
        <div className="flex flex-1 flex-col px-4 pt-topbar">
          <div className="flex items-center justify-between" style={{ paddingBottom: 18 }}>
            <h1
              className="font-serif"
              style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: 0 }}
            >
              memi
            </h1>
            <span className="font-sans capitalize" style={{ fontSize: 14, fontWeight: 500, color: 'var(--mid)' }}>
              {formatTopbarDate()}
            </span>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center" style={{ paddingBottom: 108 }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 88,
                height: 88,
                backgroundColor: 'var(--card)',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 36 }}>✨</span>
            </div>

            <h2
              className="font-serif"
              style={{
                color: 'var(--text)',
                fontSize: 30,
                fontWeight: 700,
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Первый момент
            </h2>

            <p
              className="font-sans"
              style={{
                color: 'var(--mid)',
                fontSize: 15,
                lineHeight: 1.6,
                maxWidth: 250,
                marginTop: 10,
              }}
            >
              Сохрани фото, слово или чувство, чтобы лента начала собираться сама.
            </p>

            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="font-sans transition-opacity active:opacity-70"
              style={{
                marginTop: 22,
                border: 'none',
                borderRadius: 20,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                padding: '15px 26px',
                fontSize: 16,
                fontWeight: 600,
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              Добавить момент
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between px-4 pt-topbar" style={{ paddingBottom: 16 }}>
            <h1
              className="font-serif"
              style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: 0 }}
            >
              memi
            </h1>
            <span className="font-sans capitalize" style={{ fontSize: 14, fontWeight: 500, color: 'var(--mid)' }}>
              {formatTopbarDate()}
            </span>
          </div>

          <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 110 }}>
            {groups.map((group, groupIndex) => (
              <section key={group.label} style={{ paddingBottom: 18 }}>
                <p
                  className="font-sans font-semibold"
                  style={{
                    fontSize: 12,
                    color: 'var(--soft)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.14em',
                    marginBottom: 10,
                  }}
                >
                  {group.label}
                </p>

                <div className="flex flex-col gap-4">
                  {group.items.map((moment, itemIndex) => (
                    <div
                      key={moment.id}
                      style={{
                        animation: 'fadeSlideUp 0.28s ease both',
                        animationDelay: `${(groupIndex * 3 + itemIndex) * 55}ms`,
                      }}
                    >
                      <MomentCard moment={moment} />
                    </div>
                  ))}
                </div>
              </section>
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
