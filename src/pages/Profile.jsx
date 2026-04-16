import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { saveCapsuleSlot, deleteCapsuleSlot } from '../lib/api'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import AddMoment from './AddMoment'
import { plural, MONTHS_GENITIVE } from '../lib/ruPlural'

const STOP_WORDS = new Set(['в','на','и','с','а','но','или','что','как','это','я','ты','он','она','мы','вы','они','не','по','за','до','из','от','у','к'])

function topWord(moments) {
  const freq = {}
  for (const m of moments) {
    for (const w of (m.title ?? '').toLowerCase().split(/\s+/)) {
      if (w.length > 2 && !STOP_WORDS.has(w)) freq[w] = (freq[w] ?? 0) + 1
    }
  }
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'
}

function uniqueMonths(moments) {
  return new Set(moments.map((m) => {
    const d = new Date(m.created_at)
    return `${d.getFullYear()}-${d.getMonth()}`
  })).size
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''
  const d = new Date(createdAt)
  return `${MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`
}

// ── Capsule slot ──────────────────────────────────────────────────────────────

function CapsuleSlot({ slot, index, onEmpty, onFilled }) {
  const [holding, setHolding] = useState(false)
  const [showHoldMenu, setShowHoldMenu] = useState(false)
  const navigate = useNavigate()

  if (!slot) {
    return (
      <button
        onClick={onEmpty}
        className="flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
        style={{
          aspectRatio: '2/3', borderRadius: 14,
          border: '1.5px dashed rgba(217,139,82,0.35)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <span style={{ fontSize: 22, color: 'var(--accent)' }}>+</span>
        <span className="font-sans" style={{ fontSize: 10, color: 'var(--mid)' }}>добавить</span>
      </button>
    )
  }

  return (
    <>
      <div
        onClick={() => !showHoldMenu && navigate(`/moment/${slot.id}`)}
        onContextMenu={(e) => { e.preventDefault(); setShowHoldMenu(true) }}
        onTouchStart={() => {
          const t = setTimeout(() => setShowHoldMenu(true), 500)
          setHolding(t)
        }}
        onTouchEnd={() => clearTimeout(holding)}
        className="active:opacity-80 transition-opacity cursor-pointer"
        style={{ position: 'relative', aspectRatio: '2/3', borderRadius: 14, overflow: 'hidden' }}
      >
        {slot.photo_url ? (
          <img src={slot.photo_url} alt={slot.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #C8A478, #8C5830)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.65) 0%, transparent 50%)' }} />
        <span
          className="font-sans font-medium"
          style={{ position: 'absolute', top: 8, left: 10, fontSize: 10, color: 'rgba(255,255,255,0.7)' }}
        >
          0{index + 1}
        </span>
        <span
          className="font-serif"
          style={{ position: 'absolute', bottom: 8, left: 8, right: 8, fontSize: 11, color: '#fff', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
        >
          {slot.title}
        </span>
      </div>

      {showHoldMenu && (
        <BottomSheet onClose={() => setShowHoldMenu(false)}>
          <div>
            <button
              onClick={() => { onEmpty(); setShowHoldMenu(false) }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
            >
              <span style={{ fontSize: 16 }}>🔄</span>
              <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>Заменить</span>
            </button>
            <button
              onClick={() => setShowHoldMenu(false)}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none' }}
            >
              <span style={{ fontSize: 16 }}>✕</span>
              <span className="font-sans" style={{ fontSize: 15, color: '#E05252' }}>Убрать из капсулы</span>
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}

// ── Pick moment sheet ─────────────────────────────────────────────────────────

function PickMomentSheet({ onClose, onPick, onCreateNew }) {
  const moments = useAppStore((s) => s.moments)
  return (
    <BottomSheet onClose={onClose} title="В капсулу">
      <div className="overflow-y-auto" style={{ maxHeight: '65dvh' }}>

        {/* ── Кнопка «Создать момент» ── */}
        <button
          onClick={() => { onClose(); onCreateNew() }}
          className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
          style={{ background: 'none', border: 'none', borderBottom: '1px solid var(--surface)' }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: 'var(--accent)' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>
          <div className="flex-1 text-left">
            <p className="font-sans font-medium" style={{ fontSize: 14, color: 'var(--text)' }}>Создать момент</p>
            <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>Новый — сразу в капсулу</p>
          </div>
          <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
        </button>

        {/* ── Разделитель ── */}
        {moments.length > 0 && (
          <p className="font-sans px-5 py-2" style={{ fontSize: 10, color: 'var(--soft)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Или выбери существующий
          </p>
        )}

        {/* ── Список существующих моментов ── */}
        {moments.length === 0 && (
          <p className="font-sans text-center py-8" style={{ fontSize: 13, color: 'var(--mid)' }}>
            Пока нет моментов — создай первый ↑
          </p>
        )}
        {moments.map((m) => (
          <button
            key={m.id}
            onClick={() => { onPick(m); onClose() }}
            className="w-full flex items-center gap-3 px-5 py-3 transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
              background: m.photo_url ? 'none' : 'linear-gradient(135deg, #E8D5C0, #C8A880)',
            }}>
              {m.photo_url && <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <span className="font-sans flex-1 text-left" style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {m.title}
            </span>
            <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Profile() {
  const currentUser = useAppStore((s) => s.currentUser)
  const moments     = useAppStore((s) => s.moments)
  const capsule     = useAppStore((s) => s.capsule)
  const addToCapsule = useAppStore((s) => s.addToCapsule)
  const removeFromCapsule = useAppStore((s) => s.removeFromCapsule)

  const [pickSlot, setPickSlot]         = useState(null)  // index | null — шит выбора
  const [addMomentSlot, setAddMomentSlot] = useState(null) // index | null — оверлей создания

  async function handleAddToCapsule(slotIndex, moment) {
    addToCapsule(slotIndex, moment)  // optimistic update
    try {
      await saveCapsuleSlot(currentUser.id, slotIndex, moment.id)
    } catch (err) {
      console.error('[Capsule] save error:', err)
    }
  }

  async function handleRemoveFromCapsule(slotIndex) {
    removeFromCapsule(slotIndex)  // optimistic update
    try {
      await deleteCapsuleSlot(currentUser.id, slotIndex)
    } catch (err) {
      console.error('[Capsule] delete error:', err)
    }
  }

  // Показываем реальное имя из Telegram (сохраняется в users.name через saveUser)
  const name  = currentUser?.name || 'Пользователь'
  const since = sinceLabel(currentUser?.created_at)
  const stats = useMemo(() => ({
    total: moments.length,
    months: uniqueMonths(moments),
    word: topWord(moments),
  }), [moments])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div
        className="px-5 pb-3"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <h2 className="font-sans font-medium" style={{ fontSize: 22, color: 'var(--text)' }}>Профиль</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-28 flex flex-col gap-4">
        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div
            className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
            style={{ width: 52, height: 52, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 20, fontWeight: 300, overflow: 'hidden', flexShrink: 0 }}
          >
            {currentUser?.photo_url ? (
              <img
                src={currentUser.photo_url}
                alt={name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              name[0]?.toUpperCase() ?? 'M'
            )}
          </div>
          <div>
            <p className="font-sans font-medium" style={{ fontSize: 16, color: 'var(--text)' }}>{name}</p>
            {since && (
              <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>с memi с {since}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: plural.момент(stats.total),  value: stats.total },
            { label: plural.месяц(stats.months),  value: stats.months },
            { label: 'Слово',                     value: stats.word },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center py-4 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <span
                className="font-serif"
                style={{ fontSize: typeof s.value === 'number' ? 28 : 14, color: 'var(--accent)', fontWeight: 300, lineHeight: 1.1 }}
              >
                {s.value}
              </span>
              <span className="font-sans" style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Capsule */}
        <div>
          <p className="font-sans font-medium mb-3" style={{ fontSize: 13, color: 'var(--text)' }}>
            Капсула · <span className="font-sans" style={{ color: 'var(--mid)', fontWeight: 400 }}>моменты на всю жизнь</span>
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {capsule.map((slot, i) => (
              <CapsuleSlot
                key={i}
                slot={slot}
                index={i}
                onEmpty={() => setPickSlot(i)}
                onFilled={() => handleRemoveFromCapsule(i)}
              />
            ))}
          </div>
        </div>

      </div>

      <BottomNav active="profile" />

      {/* Шит выбора момента для капсулы */}
      {pickSlot !== null && (
        <PickMomentSheet
          onClose={() => setPickSlot(null)}
          onPick={(m) => handleAddToCapsule(pickSlot, m)}
          onCreateNew={() => setAddMomentSlot(pickSlot)}
        />
      )}

      {/* Оверлей создания нового момента прямо в капсулу */}
      {addMomentSlot !== null && (
        <AddMoment
          onClose={() => setAddMomentSlot(null)}
          afterSave={(moment) => {
            handleAddToCapsule(addMomentSlot, moment)
            setAddMomentSlot(null)
          }}
        />
      )}
    </div>
  )
}
