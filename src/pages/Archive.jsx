import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
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

function uniquePeopleCount(moments) {
  const ids = new Set()

  for (const moment of moments) {
    for (const person of moment.people ?? []) {
      ids.add(person.id)
    }
  }

  return ids.size
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
      <div className="px-5 pb-5">
        <p
          className="font-sans font-semibold"
          style={{
            fontSize: 12,
            color: 'var(--soft)',
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            marginBottom: 14,
          }}
        >
          Люди
        </p>

        <div className="flex flex-wrap gap-2" style={{ marginBottom: 28 }}>
          {people.map((person) => (
            <PersonToken
              key={person.id}
              person={person}
              active={selectedPeople.includes(person.id)}
              onClick={() => toggle(person.id)}
            />
          ))}

          {people.length === 0 && (
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>
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
          className="w-full font-sans transition-opacity active:opacity-70"
          style={{
            border: 'none',
            borderRadius: 20,
            backgroundColor: 'var(--accent)',
            color: '#fff',
            padding: '16px',
            fontSize: 16,
            fontWeight: 700,
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
            className="w-full font-sans transition-opacity active:opacity-60"
            style={{
              marginTop: 12,
              border: 'none',
              background: 'none',
              color: 'var(--mid)',
              fontSize: 14,
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
        border: 'none',
        borderRadius: 14,
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6C7C57 0%, #BD8A5D 55%, #F0D7A1 100%)',
      }}
    >
      {moment.photo_url && (
        <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}

      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.58) 0%, transparent 55%)' }} />

      {moment.mood && (
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 16 }}>
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
            boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
            color: 'var(--text)',
            fontSize: 11,
            fontWeight: 500,
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
    const keys = [...new Set(moments.map((moment) => monthKey(moment.created_at)))]
    keys.sort((left, right) => right.localeCompare(left))

    if (keys.length === 0) {
      const date = new Date()
      keys.push(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`)
    }

    return keys
  }, [moments])

  const [activeMonth, setActiveMonth] = useState(monthKeys[0])
  const [showFilter, setShowFilter] = useState(false)
  const [filterPeople, setFilterPeople] = useState([])
  const resolvedActiveMonth = monthKeys.includes(activeMonth) ? activeMonth : monthKeys[0]

  const monthMoments = useMemo(() => {
    let list = moments.filter((moment) => monthKey(moment.created_at) === resolvedActiveMonth)

    if (filterPeople.length > 0) {
      list = list.filter((moment) =>
        filterPeople.every((personId) => (moment.people ?? []).some((person) => person.id === personId)),
      )
    }

    return list
  }, [moments, resolvedActiveMonth, filterPeople])

  const stats = useMemo(() => ({
    count: monthMoments.length,
    people: uniquePeopleCount(monthMoments),
  }), [monthMoments])

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar" style={{ paddingBottom: 20 }}>
        <div style={{ paddingBottom: 16 }}>
          <h1
            className="font-serif"
            style={{ color: 'var(--text)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}
          >
            Архив
          </h1>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14, marginTop: 2 }}>
            {moments.length} {moments.length === 1 ? 'момент' : 'момента'}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="hide-scrollbar flex items-center gap-2 overflow-x-auto">
            {monthKeys.map((key) => {
              const active = key === resolvedActiveMonth

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveMonth(key)}
                  className="font-sans whitespace-nowrap transition-opacity active:opacity-70"
                  style={{
                    border: 'none',
                    borderRadius: 20,
                    backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                    boxShadow: active ? 'none' : 'var(--shadow-card)',
                    color: active ? '#fff' : 'var(--mid)',
                    fontSize: 14,
                    fontWeight: active ? 600 : 500,
                    padding: '7px 16px',
                  }}
                >
                  {monthLabel(key)}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowFilter(true)}
            className="flex items-center gap-2 whitespace-nowrap transition-opacity active:opacity-60"
            style={{
              border: 'none',
              background: 'none',
              color: filterPeople.length > 0 ? 'var(--accent)' : 'var(--mid)',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Фильтр
            {filterPeople.length > 0 && (
              <span
                className="font-sans"
                style={{
                  minWidth: 18,
                  height: 18,
                  borderRadius: 999,
                  backgroundColor: 'var(--accent-pale)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '0 5px',
                }}
              >
                {filterPeople.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {filterPeople.length > 0 && (
        <div className="hide-scrollbar flex gap-2 overflow-x-auto px-4" style={{ paddingBottom: 16 }}>
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

      <div className="px-4" style={{ paddingBottom: 20 }}>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(135deg, rgba(217, 139, 82, 0.18) 0%, rgba(237, 230, 220, 0.96) 62%, rgba(255, 255, 255, 0.72) 100%)',
            borderRadius: 22,
            border: '1px solid rgba(160, 94, 44, 0.08)',
          }}
        >
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: -28,
              right: -18,
              width: 104,
              height: 104,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.52) 0%, rgba(255,255,255,0) 72%)',
            }}
          />

          <div className="grid grid-cols-2" style={{ position: 'relative' }}>
            {[
              { label: 'Моментов', value: stats.count },
              { label: 'Людей', value: stats.people },
            ].map((card, index) => (
              <div
                key={card.label}
                className="flex flex-col items-center justify-center"
                style={{
                  minHeight: 94,
                  padding: '16px 10px 14px',
                  borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)',
                }}
              >
                <span
                  className="font-sans"
                  style={{
                    color: 'var(--accent)',
                    fontSize: 32,
                    fontWeight: 700,
                    lineHeight: 0.95,
                    textAlign: 'center',
                  }}
                >
                  {card.value}
                </span>
                <span
                  className="font-sans"
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    color: 'var(--deep)',
                    textAlign: 'center',
                  }}
                >
                  {card.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 108 }}>
        {monthMoments.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-[22px]"
            style={{
              border: '1.5px dashed var(--accent-light)',
              backgroundColor: 'rgba(255,255,255,0.28)',
              minHeight: 220,
              padding: '20px 24px',
            }}
          >
            <span style={{ fontSize: 34, marginBottom: 10 }}>🗂️</span>
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600, marginBottom: 6 }}>
              Здесь пока пусто
            </p>
            <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 14, lineHeight: 1.5 }}>
              {filterPeople.length > 0 ? 'Для выбранных людей в этом месяце нет моментов.' : 'В выбранном месяце пока нет сохранённых моментов.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
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
