import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { saveCapsuleSlot, deleteCapsuleSlot, acceptFriendRequest, getFriendships } from '../lib/api'
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
  const currentUser       = useAppStore((s) => s.currentUser)
  const moments           = useAppStore((s) => s.moments)
  const people            = useAppStore((s) => s.people)
  const capsule           = useAppStore((s) => s.capsule)
  const friends           = useAppStore((s) => s.friends)
  const incomingRequests  = useAppStore((s) => s.incomingRequests)
  const setFriends        = useAppStore((s) => s.setFriends)
  const setIncomingRequests = useAppStore((s) => s.setIncomingRequests)
  const addToCapsule      = useAppStore((s) => s.addToCapsule)
  const removeFromCapsule = useAppStore((s) => s.removeFromCapsule)

  const [pickSlot, setPickSlot]           = useState(null)
  const [addMomentSlot, setAddMomentSlot] = useState(null)
  const [refreshing, setRefreshing]       = useState(false)

  async function handleRefreshFriends() {
    if (refreshing || !currentUser?.id) return
    setRefreshing(true)
    try {
      const rows = await getFriendships(currentUser.id)

      // DEBUG — убрать после диагностики
      window.Telegram?.WebApp?.showAlert?.(
        `rows=${rows.length} myId=${currentUser.id.slice(0, 8)}\n` +
        rows.map((r) => `${r.status} req=${r.requester_id.slice(0,6)} rec=${r.receiver_id.slice(0,6)}`).join('\n')
      )

      const accepted = []
      const incoming = []
      for (const f of rows) {
        if (f.status === 'accepted') {
          const friend = f.requester_id === currentUser.id ? f.receiver : f.requester
          if (friend) accepted.push({ ...friend, friendship_id: f.id })
        } else if (f.status === 'pending' && f.receiver_id === currentUser.id) {
          if (f.requester) incoming.push({ ...f.requester, friendship_id: f.id })
        }
      }
      setFriends(accepted)
      setIncomingRequests(incoming)
    } catch (err) {
      window.Telegram?.WebApp?.showAlert?.(`ERROR: ${err?.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  function handleInvite() {
    const tgId    = currentUser?.telegram_id
      ?? window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    const botName = import.meta.env.VITE_BOT_USERNAME ?? 'memi_app_bot'
    const appName = import.meta.env.VITE_APP_SHORT_NAME ?? 'app'
    // t.me/BOT/APPNAME?startapp=... opens Mini App directly and passes start_param
    const link    = `https://t.me/${botName}/${appName}?startapp=ref_${tgId}`
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('Присоединяйся ко мне в memi 🌿')}`
    if (window.Telegram?.WebApp?.openTelegramLink) {
      window.Telegram.WebApp.openTelegramLink(shareUrl)
    } else {
      navigator.clipboard?.writeText(link).catch(() => {})
    }
  }

  async function handleAccept(req) {
    try {
      await acceptFriendRequest(req.friendship_id)
      setFriends([...friends, req])
      setIncomingRequests(incomingRequests.filter((r) => r.friendship_id !== req.friendship_id))
    } catch (err) {
      console.error('[Profile] accept friend error:', err)
    }
  }

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
    people: people.length,
  }), [moments, people])

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div
        className="px-4 pb-3 pt-topbar"
      >
        <h2 className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Профиль</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-28 flex flex-col gap-4">
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
            <p className="font-serif" style={{ fontSize: 22, fontWeight: 600, color: 'var(--text)' }}>{name}</p>
            {since && (
              <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>с memi с {since}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: plural.момент(stats.total),   value: stats.total },
            { label: plural.месяц(stats.months),   value: stats.months },
            { label: plural.человек(stats.people), value: stats.people },
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

        {/* Friends */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="font-sans font-medium" style={{ fontSize: 13, color: 'var(--text)' }}>
                Друзья
                {friends.length > 0 && (
                  <span className="font-sans font-normal" style={{ color: 'var(--mid)', marginLeft: 6 }}>
                    {friends.length}
                  </span>
                )}
              </p>
              <button
                onClick={handleRefreshFriends}
                className="transition-opacity active:opacity-60"
                style={{ background: 'none', border: 'none', padding: 0, lineHeight: 1 }}
              >
                <span style={{ fontSize: 13, display: 'inline-block', transform: refreshing ? 'rotate(180deg)' : 'none', transition: 'transform 0.4s' }}>
                  ↻
                </span>
              </button>
            </div>
            <button
              onClick={handleInvite}
              className="font-sans font-medium transition-opacity active:opacity-60"
              style={{
                fontSize: 12, color: 'var(--accent)',
                background: 'none', border: 'none', padding: 0,
              }}
            >
              + Пригласить
            </button>
          </div>

          {/* Incoming friend requests */}
          {incomingRequests.map((req) => (
            <div
              key={req.friendship_id}
              className="flex items-center gap-3 mb-2 px-3 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--surface)' }}
            >
              <div
                className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                style={{ width: 34, height: 34, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 14, overflow: 'hidden' }}
              >
                {req.photo_url
                  ? <img src={req.photo_url} alt={req.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : req.name?.[0]?.toUpperCase() ?? '?'}
              </div>
              <p className="font-sans flex-1" style={{ fontSize: 13, color: 'var(--text)' }}>{req.name}</p>
              <button
                onClick={() => handleAccept(req)}
                className="font-sans font-medium transition-opacity active:opacity-70"
                style={{
                  fontSize: 12, color: '#fff', background: 'var(--accent)',
                  border: 'none', borderRadius: 9999, padding: '5px 12px',
                }}
              >
                Принять
              </button>
            </div>
          ))}

          {/* Accepted friends list */}
          {friends.length === 0 && incomingRequests.length === 0 && (
            <p className="font-sans" style={{ fontSize: 12, color: 'var(--soft)' }}>
              Пока нет друзей — пригласи первого
            </p>
          )}
          {friends.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {friends.map((f) => (
                <div
                  key={f.friendship_id}
                  className="flex items-center gap-2 px-3 py-2 rounded-full"
                  style={{ backgroundColor: 'var(--surface)' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
                    style={{ width: 22, height: 22, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 10, overflow: 'hidden' }}
                  >
                    {f.photo_url
                      ? <img src={f.photo_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : f.name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                  <span className="font-sans" style={{ fontSize: 12, color: 'var(--text)' }}>{f.name}</span>
                </div>
              ))}
            </div>
          )}
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
