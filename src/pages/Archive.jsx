import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'

// ── helpers ───────────────────────────────────────────────────────────────────

const RU_MONTHS = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const STOP_WORDS = new Set(['в','на','и','с','а','но','или','что','как','это','я','ты','он','она','мы','вы','они','не','по','за','до','из','от','у','к','со','для','про'])

function topWord(moments) {
  const freq = {}
  for (const m of moments) {
    for (const w of (m.title ?? '').toLowerCase().split(/\s+/)) {
      if (w.length > 2 && !STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

function monthKey(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key) {
  const [y, m] = key.split('-')
  return `${RU_MONTHS[+m - 1]} ${y}`
}

function uniquePeopleCount(moments) {
  const ids = new Set()
  for (const m of moments) for (const p of (m.people ?? [])) ids.add(p.id)
  return ids.size
}

// ── Grid cell ─────────────────────────────────────────────────────────────────

function GridCell({ moment }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/moment/${moment.id}`)}
      style={{ position: 'relative', aspectRatio: '3/4', borderRadius: 14, overflow: 'hidden', cursor: 'pointer' }}
      className="active:opacity-80 transition-opacity"
    >
      {moment.photo_url ? (
        <img src={moment.photo_url} alt={moment.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #E8D5C0, #C8A880)' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(28,20,16,0.55) 0%, transparent 55%)' }} />
      {moment.mood && (
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 14 }}>{moment.mood}</span>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: '86%' }}>
        <div
          className="font-sans"
          style={{
            display: 'block', textAlign: 'center',
            background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)',
            borderRadius: 20, padding: '4px 10px',
            fontSize: 10, fontWeight: 500, color: 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
          }}
        >
          {moment.title}
        </div>
      </div>
    </div>
  )
}

// ── Filter sheet ──────────────────────────────────────────────────────────────

function FilterSheet({ onClose, onApply, people, current }) {
  const [selectedPeople, setSelectedPeople] = useState(current ?? [])

  function toggle(id) {
    setSelectedPeople((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  return (
    <BottomSheet onClose={onClose} title="Фильтры">
      <div className="px-4 pb-4 flex flex-col gap-5">
        {people.length > 0 && (
          <div>
            <p className="font-sans uppercase tracking-widest mb-3" style={{ fontSize: 10, color: 'var(--soft)', fontWeight: 700 }}>Люди</p>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => {
                const active = selectedPeople.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => toggle(p.id)}
                    className="flex items-center gap-2 transition-opacity active:opacity-70"
                    style={{
                      borderRadius: 9999, padding: '6px 12px 6px 8px',
                      backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                      border: 'none',
                      boxShadow: '0 2px 8px rgba(80,50,30,0.08)',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full text-white font-sans font-medium"
                      style={{ width: 20, height: 20, backgroundColor: active ? 'rgba(255,255,255,0.3)' : (p.avatar_color ?? 'var(--accent)'), fontSize: 9, flexShrink: 0 }}
                    >
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-sans" style={{ fontSize: 13, color: active ? '#fff' : 'var(--text)' }}>{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button
          onClick={() => { onApply(selectedPeople); onClose() }}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none' }}
        >
          Применить
        </button>
        {selectedPeople.length > 0 && (
          <button
            onClick={() => { onApply([]); onClose() }}
            className="w-full font-sans transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', color: 'var(--mid)', fontSize: 13 }}
          >
            Сбросить фильтры
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Archive() {
  const allMoments  = useAppStore((s) => s.moments)
  const currentUser = useAppStore((s) => s.currentUser)
  const people      = useAppStore((s) => s.people)

  const moments = allMoments.filter((m) => m.user_id === currentUser?.id)

  const [showFilter, setShowFilter] = useState(false)
  const [filterPeople, setFilterPeople] = useState([])

  const monthKeys = useMemo(() => {
    const keys = [...new Set(moments.map((m) => monthKey(m.created_at)))]
    keys.sort((a, b) => b.localeCompare(a))
    if (keys.length === 0) {
      const now = new Date()
      keys.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    }
    return keys
  }, [moments])

  const [activeMonth, setActiveMonth] = useState(() => monthKeys[0])

  const monthMoments = useMemo(() => {
    let list = moments.filter((m) => monthKey(m.created_at) === activeMonth)
    if (filterPeople.length > 0) {
      list = list.filter((m) => filterPeople.every((pid) => (m.people ?? []).some((p) => p.id === pid)))
    }
    return list
  }, [moments, activeMonth, filterPeople])

  const stats = useMemo(() => ({
    count: monthMoments.length,
    people: uniquePeopleCount(monthMoments),
    word: topWord(monthMoments),
  }), [monthMoments])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div className="flex items-end justify-between px-4 pb-3 pt-topbar">
        <div>
          <h2 className="font-serif" style={{ fontSize: 32, fontWeight: 700, color: 'var(--text)', margin: 0, letterSpacing: '-0.5px' }}>Архив</h2>
          <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)', marginTop: 2, fontWeight: 400 }}>
            {moments.length} {moments.length === 1 ? 'момент' : 'моментов'}
          </p>
        </div>
        <button
          onClick={() => setShowFilter(true)}
          className="flex items-center gap-2 transition-opacity active:opacity-60"
          style={{
            height: 36, borderRadius: 12, border: 'none', padding: '0 14px',
            backgroundColor: filterPeople.length > 0 ? 'var(--accent)' : 'var(--card)',
            boxShadow: '0 2px 12px rgba(80,50,30,0.10)',
            position: 'relative',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke={filterPeople.length > 0 ? '#fff' : 'var(--mid)'}
            strokeWidth="2" strokeLinecap="round"
          >
            <line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="10" y1="18" x2="14" y2="18"/>
          </svg>
          <span className="font-sans" style={{ fontSize: 13, fontWeight: 500, color: filterPeople.length > 0 ? '#fff' : 'var(--mid)' }}>
            Фильтр
          </span>
          {filterPeople.length > 0 && (
            <span
              className="font-sans font-medium"
              style={{
                position: 'absolute', top: -4, right: -4,
                width: 17, height: 17, borderRadius: '50%',
                backgroundColor: 'var(--text)', color: 'var(--base)',
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {filterPeople.length}
            </span>
          )}
        </button>
      </div>

      {/* Active filter chips */}
      {filterPeople.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          <span className="font-sans flex-shrink-0" style={{ fontSize: 11, color: 'var(--soft)' }}>Фильтр:</span>
          {filterPeople.map((pid) => {
            const p = people.find((x) => x.id === pid)
            if (!p) return null
            return (
              <button
                key={pid}
                onClick={() => setFilterPeople((prev) => prev.filter((id) => id !== pid))}
                className="flex items-center gap-1 flex-shrink-0 transition-opacity active:opacity-60"
                style={{ borderRadius: 9999, padding: '4px 8px 4px 6px', backgroundColor: 'var(--accent)', border: 'none' }}
              >
                <div className="flex items-center justify-center rounded-full font-sans font-medium text-white flex-shrink-0"
                  style={{ width: 16, height: 16, backgroundColor: 'rgba(255,255,255,0.3)', fontSize: 8 }}>
                  {p.name[0].toUpperCase()}
                </div>
                <span className="font-sans" style={{ fontSize: 12, color: '#fff' }}>{p.name}</span>
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', lineHeight: 1, marginLeft: 1 }}>×</span>
              </button>
            )
          })}
          <button
            onClick={() => setFilterPeople([])}
            className="flex-shrink-0 font-sans transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', fontSize: 11, color: 'var(--mid)', padding: '4px 0' }}
          >
            Сбросить
          </button>
        </div>
      )}

      {/* Month scroll */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {monthKeys.map((key) => {
          const active = key === activeMonth
          return (
            <button
              key={key}
              onClick={() => setActiveMonth(key)}
              className="flex-shrink-0 font-sans transition-opacity active:opacity-70"
              style={{
                borderRadius: 20, padding: '6px 16px', fontSize: 14,
                backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                color: active ? '#fff' : 'var(--mid)',
                border: 'none', fontWeight: active ? 600 : 400,
                boxShadow: active ? 'none' : '0 2px 8px rgba(80,50,30,0.08)',
              }}
            >
              {monthLabel(key)}
            </button>
          )
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-2 px-4 mb-4">
        {[
          { label: 'Моментов', value: stats.count, serif: false },
          { label: 'Людей', value: stats.people, serif: false },
          { label: 'Слово', value: stats.word, serif: true },
        ].map((s) => (
          <div
            key={s.label}
            className="flex-1 flex flex-col items-center py-3 rounded-2xl"
            style={{ backgroundColor: 'var(--card)', boxShadow: '0 2px 12px rgba(80,50,30,0.10)' }}
          >
            <span
              className={s.serif ? 'font-serif' : 'font-sans'}
              style={{
                fontSize: s.serif ? 20 : 28,
                color: 'var(--accent)', fontWeight: 700, lineHeight: 1.1,
              }}
            >
              {s.value}
            </span>
            <span className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 3, fontWeight: 500 }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto pb-24">
        {monthMoments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 animate-fade-in">
            <span style={{ fontSize: 36 }}>📭</span>
            <p className="font-sans text-center" style={{ fontSize: 13, color: 'var(--mid)' }}>
              {filterPeople.length > 0 ? 'Нет моментов с выбранными людьми' : 'Нет моментов за этот месяц'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, padding: '0 16px' }}>
            {monthMoments.map((m, i) => (
              <div key={m.id} style={{ animation: 'fadeSlideUp 0.25s ease both', animationDelay: `${i * 40}ms` }}>
                <GridCell moment={m} />
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
