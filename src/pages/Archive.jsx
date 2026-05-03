import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { tgHaptic } from '../lib/telegram'
import BottomSheet from '../components/BottomSheet'
import SectionLabel from '../components/SectionLabel'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
import { pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'

const RU_MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь']
function monthKey(iso) {
  const date = new Date(iso)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [year, month] = key.split('-')
  return `${RU_MONTHS[Number(month) - 1]} ${year}`
}

function monthParts(key) {
  const [year, month] = key.split('-')
  return {
    month: RU_MONTHS[Number(month) - 1],
    year,
  }
}

function uniquePeopleCount(moments) {
  const ids = new Set()

  for (const moment of moments) {
    for (const person of moment.people ?? []) {
      ids.add(person.id)
    }
  }

  return ids.size
}

function PreviewStack({ moments }) {
  const preview = moments.slice(0, 3)

  return (
    <div
      className="flex items-end justify-end"
      style={{
        minWidth: 116,
        height: 112,
        position: 'relative',
      }}
    >
      {preview.length === 0 ? (
        <div
          className="flex items-center justify-center"
          style={{
            width: 92,
            height: 108,
            borderRadius: 18,
            background:
              'linear-gradient(145deg, rgba(217,139,82,0.22), rgba(255,255,255,0.66))',
            border: '1px solid rgba(255,255,255,0.58)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.58)',
          }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
            <path d="M4 7.5h16v10.2a2.3 2.3 0 0 1-2.3 2.3H6.3A2.3 2.3 0 0 1 4 17.7V7.5Z" stroke="var(--accent)" strokeWidth="1.8" />
            <path d="M7 4h10l1.8 3.5H5.2L7 4Z" stroke="var(--accent)" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        </div>
      ) : (
        preview.map((moment, index) => {
          const transforms = [
            'translateX(-50px) rotate(-8deg)',
            'translateX(-25px) rotate(-2deg)',
            'translateX(0) rotate(5deg)',
          ]

          return (
            <div
              key={moment.id}
              style={{
                position: 'absolute',
                right: index === 0 ? 22 : index === 1 ? 10 : 0,
                bottom: index === 0 ? 2 : index === 1 ? 6 : 0,
                width: 74,
                height: 96,
                borderRadius: 18,
                overflow: 'hidden',
                transform: transforms[index],
                background: moment.photo_url
                  ? 'var(--surface)'
                  : 'linear-gradient(160deg, #6C7C57 0%, #BD8A5D 55%, #F0D7A1 100%)',
                border: '2px solid rgba(255,255,255,0.78)',
                boxShadow: '0 12px 24px rgba(80,50,30,0.17)',
              }}
            >
              {moment.photo_url && (
                <img
                  src={moment.photo_url}
                  alt={moment.title || 'Момент'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.34), transparent 58%)' }} />
            </div>
          )
        })
      )}
    </div>
  )
}

function StatPill({ value, label }) {
  return (
    <div
      style={{
        minWidth: 0,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.48)',
        border: '1px solid rgba(255,255,255,0.52)',
        padding: '10px 12px',
      }}
    >
      <p className="font-sans" style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, lineHeight: 1, margin: 0 }}>
        {value}
      </p>
      <p className="font-sans type-meta truncate" style={{ color: 'var(--mid)', marginTop: 3 }}>
        {label}
      </p>
    </div>
  )
}

function PersonToken({ person, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 transition-opacity active:opacity-70"
      style={{
        border: 'none',
        borderRadius: 20,
        backgroundColor: active ? 'var(--accent-pale)' : 'var(--moment-surface)',
        boxShadow: active ? '0 0 0 1.5px var(--accent), var(--shadow-card)' : 'var(--shadow-card)',
        padding: '8px 14px 8px 8px',
      }}
    >
      <div
        className="flex items-center justify-center rounded-full overflow-hidden"
        style={{
          width: 30,
          height: 30,
          backgroundColor: person.avatar_color ?? 'var(--accent)',
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          person.name[0]?.toUpperCase()
        )}
      </div>
      <span
        className="font-sans"
        style={{
          color: active ? 'var(--accent)' : 'var(--text)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        {person.name}
      </span>
    </button>
  )
}

function FilterSheet({ onClose, onApply, people, current }) {
  const [selectedPeople, setSelectedPeople] = useState(current ?? [])

  function toggle(personId) {
    setSelectedPeople((prev) => (
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    ))
  }

  return (
    <BottomSheet onClose={onClose} title="Фильтры">
      <div className="px-4 pb-5">
        <SectionLabel style={{ marginBottom: 16 }}>
          Люди
        </SectionLabel>

        <div className="flex flex-wrap gap-3" style={{ marginBottom: 24 }}>
          {people.map((person) => (
            <PersonToken
              key={person.id}
              person={person}
              active={selectedPeople.includes(person.id)}
              onClick={() => toggle(person.id)}
            />
          ))}

          {people.length === 0 && (
            <p className="font-sans type-topbar-meta" style={{ color: 'var(--mid)' }}>
              Пока некого выбирать.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            onApply(selectedPeople)
            onClose()
          }}
          className="w-full font-sans type-button-strong transition-opacity active:opacity-70"
          style={{
            border: 'none',
            borderRadius: 20,
            backgroundColor: 'var(--accent)',
            color: '#fff',
            padding: '16px',
            letterSpacing: '0.02em',
          }}
        >
          Применить{selectedPeople.length > 0 ? ` · ${selectedPeople.length}` : ''}
        </button>

        {selectedPeople.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onApply([])
              onClose()
            }}
            className="w-full font-sans type-action transition-opacity active:opacity-60"
            style={{
              marginTop: 14,
              border: 'none',
              background: 'none',
              color: 'var(--mid)',
            }}
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

function GridCell({ moment }) {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate(`/moment/${moment.id}`)}
      className="transition-opacity active:opacity-75"
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        border: '1px solid rgba(255,255,255,0.58)',
        borderRadius: 18,
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6C7C57 0%, #BD8A5D 55%, #F0D7A1 100%)',
        boxShadow: '0 10px 22px rgba(80,50,30,0.12)',
      }}
    >
      {moment.photo_url && (
        <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.62) 0%, rgba(23,20,14,0.08) 58%, rgba(255,255,255,0.08) 100%)' }} />

      {moment.mood && (
        <span
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            fontSize: 17,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))',
          }}
        >
          {moment.mood}
        </span>
      )}

      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: '82%' }}>
        <div
          className="font-sans"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 999,
            border: '1px solid rgba(255,255,255,0.58)',
            boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
            color: '#17140E',
            fontSize: 11,
            fontWeight: 600,
            overflow: 'hidden',
            padding: '4px 10px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {moment.title || 'Без названия'}
        </div>
      </div>
    </button>
  )
}

export default function Archive() {
  const allMoments = useAppStore((state) => state.moments)
  const currentUser = useAppStore((state) => state.currentUser)
  const people = useAppStore((state) => state.people)

  const moments = useMemo(
    () => allMoments.filter((moment) => moment.user_id === currentUser?.id),
    [allMoments, currentUser?.id],
  )

  const monthKeys = useMemo(() => {
    const keys = [...new Set(moments.map((moment) => monthKey(getMomentDisplayAt(moment))))]
    keys.sort((left, right) => right.localeCompare(left))

    if (keys.length === 0) {
      const date = new Date()
      keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    return keys
  }, [moments])

  const navigate = useNavigate()

  const [activeMonth, setActiveMonth] = useState(monthKeys[0])
  const [showFilter, setShowFilter] = useState(false)
  const [filterPeople, setFilterPeople] = useState([])
  const resolvedActiveMonth = monthKeys.includes(activeMonth) ? activeMonth : monthKeys[0]

  const activeYear = resolvedActiveMonth.split('-')[0]

  const monthMoments = useMemo(() => {
    let list = moments.filter((moment) => monthKey(getMomentDisplayAt(moment)) === resolvedActiveMonth)

    if (filterPeople.length > 0) {
      list = list.filter((moment) =>
        filterPeople.every((personId) => (moment.people ?? []).some((person) => person.id === personId)),
      )
    }

    return list.slice().sort(compareMomentsByDisplayAt)
  }, [moments, resolvedActiveMonth, filterPeople])

  const stats = useMemo(() => ({
    count: monthMoments.length,
    people: uniquePeopleCount(monthMoments),
  }), [monthMoments])
  const activeMonthTitle = monthParts(resolvedActiveMonth)

  return (
    <div
      className="flex h-full flex-col"
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.46) 0%, var(--base) 26%, #F2ECE4 100%)',
      }}
    >
      <div className="px-4 pt-topbar" style={{ paddingBottom: 20 }}>
        <div style={{ paddingBottom: 18 }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1
                className="type-page-title"
                style={{ color: 'var(--text)', margin: 0 }}
              >
                Архив
              </h1>
              <p className="font-sans type-topbar-meta" style={{ color: 'var(--mid)', marginTop: 6 }}>
                {moments.length} {pluralRu(moments.length, 'момент', 'момента', 'моментов')} в памяти
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowFilter(true)}
              className="flex items-center gap-2 whitespace-nowrap font-sans type-chip transition-opacity active:opacity-60"
              style={{
                border: '1px solid var(--divider)',
                borderRadius: 999,
                backgroundColor: filterPeople.length > 0 ? 'var(--accent-pale)' : 'rgba(255,255,255,0.56)',
                color: filterPeople.length > 0 ? 'var(--accent)' : 'var(--mid)',
                boxShadow: '0 6px 16px rgba(80,50,30,0.07)',
                padding: '9px 12px',
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M4 7h16M8 12h8M11 17h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              Фильтр
              {filterPeople.length > 0 && (
                <span
                  className="font-sans type-meta"
                  style={{
                    minWidth: 19,
                    height: 19,
                    borderRadius: 999,
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 5px',
                  }}
                >
                  {filterPeople.length}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
          {monthKeys.map((key) => {
            const active = key === resolvedActiveMonth

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveMonth(key)}
                className="font-sans type-chip whitespace-nowrap transition-opacity active:opacity-70"
                style={{
                  border: active ? '1px solid rgba(217,139,82,0.18)' : '1px solid rgba(160,94,44,0.1)',
                  borderRadius: 20,
                  backgroundColor: active ? 'var(--accent)' : 'rgba(255,255,255,0.5)',
                  boxShadow: active ? '0 8px 18px rgba(217,139,82,0.20)' : 'none',
                  color: active ? '#fff' : 'var(--mid)',
                  fontWeight: active ? 600 : 500,
                  padding: '8px 16px',
                }}
              >
                {monthLabel(key)}
              </button>
            )
          })}
        </div>
      </div>

      {filterPeople.length > 0 && (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4" style={{ paddingBottom: 18 }}>
          {filterPeople.map((personId) => {
            const person = people.find((entry) => entry.id === personId)
            if (!person) return null

            return (
              <button
                key={personId}
                type="button"
                onClick={() => setFilterPeople((prev) => prev.filter((id) => id !== personId))}
                className="flex items-center gap-2 whitespace-nowrap transition-opacity active:opacity-60"
                style={{
                  border: 'none',
                  borderRadius: 999,
                  backgroundColor: 'var(--accent-pale)',
                  color: 'var(--accent)',
                  padding: '6px 10px 6px 6px',
                }}
              >
                <div
                  className="flex items-center justify-center rounded-full overflow-hidden"
                  style={{
                    width: 22,
                    height: 22,
                    backgroundColor: person.avatar_color ?? 'var(--accent)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {person.photo_url ? (
                    <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    person.name[0]?.toUpperCase()
                  )}
                </div>
                <span className="font-sans" style={{ fontSize: 13, fontWeight: 600 }}>
                  {person.name}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 112 }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 26,
            background:
              'radial-gradient(circle at 86% 2%, rgba(255,255,255,0.78), transparent 34%), linear-gradient(135deg, rgba(217,139,82,0.20) 0%, rgba(245,235,221,0.96) 58%, rgba(255,255,255,0.72) 100%)',
            border: '1px solid rgba(160,94,44,0.10)',
            boxShadow: '0 14px 34px rgba(80,50,30,0.11), inset 0 1px 0 rgba(255,255,255,0.72)',
            padding: '18px 16px',
            marginBottom: 18,
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0" style={{ flex: 1 }}>
              <p className="font-sans type-meta" style={{ color: 'var(--deep)', fontWeight: 700, margin: 0 }}>
                {activeMonthTitle.year}
              </p>
              <h2
                className="font-serif"
                style={{
                  color: 'var(--text)',
                  fontSize: 34,
                  fontWeight: 600,
                  lineHeight: 0.96,
                  margin: '4px 0 0',
                }}
              >
                {activeMonthTitle.month}
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 16 }}>
                <StatPill value={stats.count} label={pluralRu(stats.count, 'момент', 'момента', 'моментов')} />
                <StatPill value={stats.people} label={pluralRu(stats.people, 'человек', 'человека', 'человек')} />
              </div>
            </div>

            <PreviewStack moments={monthMoments} />
          </div>

          <button
            type="button"
            onClick={() => { tgHaptic('light'); navigate(`/collection/year/${activeYear}`) }}
            className="font-sans type-meta transition-opacity active:opacity-60"
            style={{
              position: 'absolute',
              right: 14,
              top: 14,
              border: '1px solid rgba(160,94,44,0.12)',
              borderRadius: 999,
              backgroundColor: 'rgba(255,255,255,0.48)',
              color: 'var(--deep)',
              fontWeight: 600,
              padding: '5px 9px',
            }}
          >
            Год
          </button>
        </div>

        {monthMoments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              border: '1.5px dashed rgba(217,139,82,0.28)',
              borderRadius: 26,
              background:
                'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0.24))',
              minHeight: 220,
              padding: '28px 24px',
            }}
          >
            <span style={{ fontSize: 34, marginBottom: 12 }}>🗂️</span>
            <p className="font-sans type-button-strong" style={{ color: 'var(--text)', marginBottom: 6 }}>
              Здесь пока пусто
            </p>
            <p className="font-sans type-topbar-meta text-center" style={{ color: 'var(--mid)' }}>
              {filterPeople.length > 0 ? 'Для выбранных людей в этом месяце нет моментов.' : 'В выбранном месяце пока нет сохранённых моментов.'}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <p className="font-sans type-support" style={{ color: 'var(--mid)', margin: 0 }}>
                Моменты месяца
              </p>
              <span className="font-sans type-meta" style={{ color: 'var(--soft)' }}>
                {stats.count}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {monthMoments.map((moment, index) => (
                <div
                  key={moment.id}
                  style={{
                    animation: 'fadeSlideUp 0.25s ease both',
                    animationDelay: `${index * 40}ms`,
                  }}
                >
                  <GridCell moment={moment} />
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => { tgHaptic('light'); navigate(`/collection/month/${resolvedActiveMonth}`) }}
              className="flex w-full items-center justify-between gap-3 font-sans transition-opacity active:opacity-70"
              style={{
                marginTop: 20,
                border: '1px solid rgba(160,94,44,0.10)',
                borderRadius: 22,
                background:
                  'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(245,235,221,0.82))',
                boxShadow: '0 10px 24px rgba(80,50,30,0.09), inset 0 1px 0 rgba(255,255,255,0.72)',
                color: 'var(--text)',
                fontSize: 14,
                fontWeight: 600,
                padding: '14px',
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 13,
                    backgroundColor: 'var(--accent-pale)',
                    flexShrink: 0,
                  }}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M3 9h18" stroke="var(--accent)" strokeWidth="2" />
                    <path d="M9 3v6M15 3v6" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="min-w-0 text-left">
                  <span className="block truncate">Собрать альбом месяца</span>
                  <span className="font-sans type-meta block truncate" style={{ color: 'var(--mid)', fontWeight: 500, marginTop: 2 }}>
                    Коллаж из выбранных воспоминаний
                  </span>
                </span>
              </span>
              <span
                className="font-sans type-meta"
                style={{
                  borderRadius: 999,
                  backgroundColor: 'var(--accent-pale)',
                  color: 'var(--accent)',
                  flexShrink: 0,
                  fontWeight: 700,
                  padding: '5px 8px',
                }}
              >
                Premium
              </span>
            </button>
          </>
        )}
      </div>

      <BottomNav active="archive" />

      {showFilter && (
        <FilterSheet
          onClose={() => setShowFilter(false)}
          onApply={setFilterPeople}
          people={people}
          current={filterPeople}
        />
      )}
    </div>
  )
}
