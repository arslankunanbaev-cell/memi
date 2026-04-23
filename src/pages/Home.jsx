import { useState } from 'react'
import { pluralRu } from '../lib/ruPlural'
import BottomNav from '../components/BottomNav'
import FAB from '../components/FAB'
import MomentCard from '../components/MomentCard'
import PageHeader from '../components/PageHeader'
import SectionLabel from '../components/SectionLabel'
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
        <div className="flex flex-1 flex-col">
          <PageHeader
            title="memi"
            brand
            aside={(
              <span className="font-sans type-topbar-meta capitalize" style={{ color: 'var(--mid)' }}>
                {formatTopbarDate()}
              </span>
            )}
            style={{ paddingBottom: 18 }}
            containerClassName="items-center"
          />

          <div className="flex flex-1 flex-col items-center justify-center px-4 text-center" style={{ paddingBottom: 108 }}>
            <div
              className="flex items-center justify-center rounded-full"
              style={{
                width: 88,
                height: 88,
                backgroundColor: 'var(--card)',
                boxShadow: 'var(--shadow-card)',
                marginBottom: 24,
              }}
            >
              <span style={{ fontSize: 36 }}>✨</span>
            </div>

            <h2
              className="type-page-title"
              style={{
                color: 'var(--text)',
                lineHeight: 1.05,
                margin: 0,
              }}
            >
              Первый момент
            </h2>

            <p
              className="font-sans type-body"
              style={{
                color: 'var(--mid)',
                maxWidth: 250,
                marginTop: 12,
              }}
            >
              Сохрани фото, слово или чувство, чтобы лента начала собираться сама.
            </p>

            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="font-sans type-button-strong transition-opacity active:opacity-70"
              style={{
                marginTop: 26,
                border: 'none',
                borderRadius: 20,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                padding: '15px 26px',
                boxShadow: 'var(--shadow-accent)',
              }}
            >
              Добавить момент
            </button>
          </div>
        </div>
      ) : (
        <>
          <PageHeader
            title="memi"
            brand
            aside={(
              <span className="font-sans type-topbar-meta capitalize" style={{ color: 'var(--mid)' }}>
                {formatTopbarDate()}
              </span>
            )}
            style={{ paddingBottom: 16 }}
            containerClassName="items-center"
          />

          <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 110 }}>
            {groups.map((group, groupIndex) => (
              <section key={group.label} style={{ paddingBottom: 24 }}>
                <SectionLabel style={{ marginBottom: 12 }}>
                  {group.label}
                </SectionLabel>

                <div className="flex flex-col gap-5">
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
