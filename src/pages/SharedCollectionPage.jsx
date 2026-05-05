import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import { AppEmptyState, AppToast } from '../components/FeedbackStates'
import { DetailLoadingState } from '../components/LoadingState'
import { useSwipeBack } from '../hooks/useSwipeBack'
import {
  addMomentToCollection,
  deleteCollection,
  getCollectionDetails,
  leaveCollection,
  removeMomentFromCollection,
  updateCollectionCover,
  uploadPhoto,
} from '../lib/api'
import { supabase } from '../lib/supabase'
import { navigateWithTransition } from '../lib/navigation'
import { tgHaptic } from '../lib/telegram'
import { pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'

const BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME ?? 'memi_bot'

// ── Small helpers ─────────────────────────────────────────────────────────────

function MemberAvatar({ user, size = 28 }) {
  return (
    <div
      title={user?.name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: 'var(--accent-light)',
        border: '2px solid rgba(255,255,255,0.6)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.round(size * 0.42),
        fontWeight: 700,
        color: 'var(--accent)',
      }}
    >
      {user?.photo_url
        ? <img src={user.photo_url} alt={user?.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (user?.name?.[0]?.toUpperCase() ?? '?')}
    </div>
  )
}

// Grid cell identical in style to Archive's GridCell
function MomentGridCell({ moment, onLongPress }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)

  function startPress() {
    timerRef.current = setTimeout(() => {
      tgHaptic('medium')
      onLongPress?.(moment)
    }, 420)
  }

  function cancelPress() {
    clearTimeout(timerRef.current)
  }

  return (
    <button
      type="button"
      onClick={() => navigateWithTransition(navigate, `/moment/${moment.id}`)}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchCancel={cancelPress}
      className="transition-opacity active:opacity-75"
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        border: '1px solid rgba(255,255,255,0.58)',
        borderRadius: 18,
        overflow: 'hidden',
        padding: 0,
        cursor: 'pointer',
        background: moment.photo_url
          ? 'none'
          : 'linear-gradient(160deg, #6C7C57 0%, #BD8A5D 55%, #F0D7A1 100%)',
        boxShadow: '0 10px 22px rgba(80,50,30,0.12)',
      }}
    >
      {moment.photo_url && (
        <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.62) 0%, rgba(23,20,14,0.08) 58%, rgba(255,255,255,0.08) 100%)' }} />
      {moment.mood && (
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 17, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}>
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

// ── Add moment sheet ──────────────────────────────────────────────────────────

function AddMomentSheet({ myMoments, alreadyInCollection, onAdd, onClose }) {
  const [search, setSearch] = useState('')

  const filtered = myMoments.filter((m) => {
    if (alreadyInCollection.has(m.id)) return false
    if (!search.trim()) return true
    return (m.title ?? '').toLowerCase().includes(search.toLowerCase())
  })

  return (
    <BottomSheet onClose={onClose} title="Добавить момент">
      <div className="px-4 pb-4 flex flex-col gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию..."
          className="w-full font-sans outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 12,
            padding: '11px 14px',
            fontSize: 15,
            color: 'var(--text)',
            border: 'none',
          }}
        />
        <div className="flex flex-col gap-2" style={{ maxHeight: 340, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 14, padding: '20px 0' }}>
              {myMoments.length === 0
                ? 'У тебя пока нет моментов.'
                : 'Все твои моменты уже в коллекции.'}
            </p>
          )}
          {filtered.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => onAdd(moment)}
              className="flex items-center gap-3 text-left transition-opacity active:opacity-60"
              style={{
                backgroundColor: 'var(--moment-surface)',
                borderRadius: 14,
                padding: '10px 12px',
                border: 'none',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  overflow: 'hidden',
                  flexShrink: 0,
                  background: moment.photo_url
                    ? 'var(--surface)'
                    : 'linear-gradient(135deg, #BD8A5D, #F0D7A1)',
                }}
              >
                {moment.photo_url && (
                  <img src={moment.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans truncate" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, margin: 0 }}>
                  {moment.title || 'Без названия'}
                </p>
                <p className="font-sans truncate" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 2 }}>
                  {moment.mood ? `${moment.mood} · ` : ''}
                  {moment.location
                    ?? new Date(moment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)', flexShrink: 0 }}>
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  )
}

// ── Moment action sheet ───────────────────────────────────────────────────────

function MomentActionSheet({ moment, isOwn, onClose, onOpen, onRemove }) {
  return (
    <BottomSheet onClose={onClose} title={moment.title || 'Момент'}>
      <div className="px-4 pb-4 flex flex-col gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
          style={{ backgroundColor: 'var(--moment-surface)', padding: '14px 16px', border: 'none' }}
        >
          <span
            className="flex items-center justify-center rounded-[14px]"
            style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-sans" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>Открыть момент</span>
        </button>

        {isOwn && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
            style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
          >
            <span
              className="flex items-center justify-center rounded-[14px]"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}
            >
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="font-sans" style={{ color: '#D94040', fontSize: 16, fontWeight: 600 }}>Убрать из коллекции</span>
          </button>
        )}
      </div>
    </BottomSheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function SharedCollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const myMoments = useAppStore((s) => s.moments.filter((m) => m.user_id === currentUser?.id))
  const updateCollection = useAppStore((s) => s.updateCollection)
  const removeCollection = useAppStore((s) => s.removeCollection)

  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)
  const [showAddMoment, setShowAddMoment] = useState(false)
  const [actionMoment, setActionMoment] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const coverInputRef = useRef(null)

  const { swipeBackHandlers } = useSwipeBack({
    enabled: !showMenu && !showAddMoment && !actionMoment,
    fallbackPath: '/archive',
  })

  const isOwner = collection?.created_by === currentUser?.id
  const alreadyInCollection = new Set(collection?.moments?.map((m) => m.id) ?? [])

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    if (!id) return
    try {
      const data = await getCollectionDetails(id)
      setCollection(data)
    } catch (err) {
      console.error('[SharedCollectionPage] load error:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  function shareInvite() {
    if (!collection) return
    tgHaptic('light')
    const link = `https://t.me/${BOT_USERNAME}?start=col_${collection.invite_code}`
    if (navigator.share) {
      navigator.share({
        title: collection.name,
        text: `Присоединяйся к коллекции «${collection.name}» в memi`,
        url: link,
      }).catch(() => null)
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(link)
        .then(() => setToast('Ссылка скопирована'))
        .catch(() => null)
    }
  }

  async function handleAddMoment(moment) {
    if (!currentUser?.id) return
    tgHaptic('medium')
    setShowAddMoment(false)
    try {
      await addMomentToCollection(id, moment.id, currentUser.id)
      setCollection((prev) => ({
        ...prev,
        moments: [{ ...moment, collectionAddedBy: currentUser.id }, ...(prev?.moments ?? [])],
        momentCount: (prev?.momentCount ?? 0) + 1,
      }))
      updateCollection(id, { momentCount: (collection?.momentCount ?? 0) + 1 })
      setToast('Момент добавлен')
    } catch (err) {
      console.error('[SharedCollectionPage] add moment error:', err)
      setToast('Не удалось добавить')
    }
  }

  async function handleRemoveMoment(moment) {
    setActionMoment(null)
    tgHaptic('medium')
    try {
      await removeMomentFromCollection(id, moment.id)
      setCollection((prev) => ({
        ...prev,
        moments: (prev?.moments ?? []).filter((m) => m.id !== moment.id),
        momentCount: Math.max(0, (prev?.momentCount ?? 1) - 1),
      }))
      updateCollection(id, { momentCount: Math.max(0, (collection?.momentCount ?? 1) - 1) })
      setToast('Момент убран из коллекции')
    } catch (err) {
      console.error('[SharedCollectionPage] remove moment error:', err)
    }
  }

  async function handleLeave() {
    setShowMenu(false)
    if (!currentUser?.id) return
    tgHaptic('medium')
    try {
      await leaveCollection(id, currentUser.id)
      removeCollection(id)
      navigate(-1)
    } catch (err) {
      console.error('[SharedCollectionPage] leave error:', err)
    }
  }

  async function handleDelete() {
    setShowMenu(false)
    if (!isOwner) return
    tgHaptic('heavy')
    try {
      await deleteCollection(id)
      removeCollection(id)
      navigate(-1)
    } catch (err) {
      console.error('[SharedCollectionPage] delete error:', err)
    }
  }

  async function handleCoverChange(e) {
    const file = e.target.files?.[0]
    if (!file || !currentUser?.id) return
    try {
      const { photo_url } = await uploadPhoto(supabase, currentUser.id, file, 'collection-covers')
      await updateCollectionCover(id, photo_url)
      setCollection((prev) => ({ ...prev, cover_url: photo_url }))
      updateCollection(id, { cover_url: photo_url })
    } catch (err) {
      console.error('[SharedCollectionPage] cover change error:', err)
    }
  }

  if (loading) return <DetailLoadingState />

  if (!collection) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center px-4"
        style={{ backgroundColor: 'var(--base)' }}
      >
        <AppEmptyState
          title="Коллекция не найдена"
          description="Возможно, она была удалена или ты не являешься её участником."
          primaryLabel="Назад"
          onPrimary={() => navigate(-1)}
        />
      </div>
    )
  }

  const coverBg = collection.cover_url
    ? `url(${collection.cover_url}) center/cover no-repeat`
    : 'linear-gradient(135deg, #BD8A5D 0%, #D98B52 50%, #F0D7A1 100%)'

  const memberCount = collection.members?.length ?? 0
  const momentCount = collection.moments?.length ?? 0

  return (
    <div
      {...swipeBackHandlers}
      className="flex h-full flex-col animate-fade-in"
      style={{ backgroundColor: 'var(--base)', ...swipeBackHandlers.style }}
    >
      {/* ── Cover header ── */}
      <div style={{ position: 'relative', height: 200, flexShrink: 0, background: coverBg }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.72) 0%, rgba(23,20,14,0.1) 60%)' }} />

        {/* Back button */}
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'max(1.25rem, env(safe-area-inset-top))',
            left: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Menu button */}
        <button
          type="button"
          onClick={() => { tgHaptic('light'); setShowMenu(true) }}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'max(1.25rem, env(safe-area-inset-top))',
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 18,
            border: 'none',
            background: 'rgba(0,0,0,0.32)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <svg width="4" height="18" viewBox="0 0 4 18" fill="currentColor">
            <circle cx="2" cy="2" r="2" /><circle cx="2" cy="9" r="2" /><circle cx="2" cy="16" r="2" />
          </svg>
        </button>

        {/* Title + members row */}
        <div style={{ position: 'absolute', bottom: 14, left: 16, right: isOwner ? 100 : 16 }}>
          <h1 className="font-sans" style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: 0, lineHeight: 1.1 }}>
            {collection.name}
          </h1>
          <div className="flex items-center gap-2" style={{ marginTop: 7 }}>
            <div className="flex" style={{ marginRight: 4 }}>
              {(collection.members ?? []).slice(0, 5).map((member, i) => (
                <div key={member.user_id} style={{ marginLeft: i > 0 ? -8 : 0, position: 'relative', zIndex: 5 - i }}>
                  <MemberAvatar user={member.user} size={24} />
                </div>
              ))}
            </div>
            <span className="font-sans" style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12 }}>
              {memberCount} {pluralRu(memberCount, 'участник', 'участника', 'участников')}
              {' · '}
              {momentCount} {pluralRu(momentCount, 'момент', 'момента', 'моментов')}
            </span>
          </div>
        </div>

        {/* Change cover (owner only) */}
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1 font-sans transition-opacity active:opacity-70"
              style={{
                position: 'absolute',
                bottom: 14,
                right: 16,
                background: 'rgba(0,0,0,0.32)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 999,
                border: 'none',
                color: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                fontWeight: 600,
                padding: '5px 10px',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Обложка
            </button>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
          </>
        )}
      </div>

      {/* ── Action buttons ── */}
      <div className="flex gap-2 px-4" style={{ paddingTop: 14, paddingBottom: 4 }}>
        <button
          type="button"
          onClick={() => { tgHaptic('light'); setShowAddMoment(true) }}
          className="flex flex-1 items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)',
            border: 'none',
            borderRadius: 16,
            color: '#fff',
            fontSize: 14,
            fontWeight: 700,
            padding: '13px 0',
            boxShadow: 'var(--shadow-accent)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          Добавить момент
        </button>

        <button
          type="button"
          onClick={shareInvite}
          className="flex items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--moment-surface)',
            border: 'none',
            borderRadius: 16,
            color: 'var(--accent)',
            fontSize: 14,
            fontWeight: 700,
            padding: '13px 16px',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
            <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8.6 13.7l6.8 3.6M15.4 6.7 8.6 10.3" stroke="currentColor" strokeWidth="2" />
          </svg>
          Пригласить
        </button>
      </div>

      {/* ── Moments grid ── */}
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 32, paddingTop: 10 }}>
        {momentCount === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{
              borderRadius: 26,
              minHeight: 200,
              backgroundColor: 'var(--moment-surface)',
              boxShadow: 'var(--shadow-card)',
              padding: '28px 24px',
              marginTop: 4,
            }}
          >
            <span style={{ fontSize: 32, marginBottom: 10 }}>📂</span>
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600, margin: 0 }}>
              Пока пусто
            </p>
            <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 6, lineHeight: 1.4 }}>
              Добавь свои моменты или пригласи друга
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
            {(collection.moments ?? []).map((moment, index) => (
              <div
                key={moment.id}
                style={{ animation: 'fadeSlideUp 0.25s ease both', animationDelay: `${index * 35}ms` }}
              >
                <MomentGridCell
                  moment={moment}
                  onLongPress={(m) => {
                    const ownAdded = m.collectionAddedBy === currentUser?.id
                    const ownMoment = m.user_id === currentUser?.id
                    setActionMoment({ ...m, _isOwn: ownAdded || ownMoment })
                  }}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Sheets ── */}
      {showAddMoment && (
        <AddMomentSheet
          myMoments={myMoments}
          alreadyInCollection={alreadyInCollection}
          onAdd={handleAddMoment}
          onClose={() => setShowAddMoment(false)}
        />
      )}

      {actionMoment && (
        <MomentActionSheet
          moment={actionMoment}
          isOwn={actionMoment._isOwn}
          onClose={() => setActionMoment(null)}
          onOpen={() => {
            setActionMoment(null)
            navigateWithTransition(navigate, `/moment/${actionMoment.id}`)
          }}
          onRemove={() => handleRemoveMoment(actionMoment)}
        />
      )}

      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title={collection.name}>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => { setShowMenu(false); shareInvite() }}
              className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{ backgroundColor: 'var(--moment-surface)', padding: '14px 16px', border: 'none' }}
            >
              <span className="flex items-center justify-center rounded-[14px]" style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M8.6 13.7l6.8 3.6M15.4 6.7 8.6 10.3" stroke="currentColor" strokeWidth="2" />
                </svg>
              </span>
              <span className="min-w-0">
                <span className="font-sans block" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>Пригласить друга</span>
                <span className="font-sans block truncate" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 2 }}>Поделиться ссылкой-инвайтом</span>
              </span>
            </button>

            {!isOwner && (
              <button
                type="button"
                onClick={handleLeave}
                className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
                style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
              >
                <span className="flex items-center justify-center rounded-[14px]" style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <span className="font-sans block" style={{ color: '#D94040', fontSize: 16, fontWeight: 600 }}>Выйти из коллекции</span>
                  <span className="font-sans block" style={{ color: 'rgba(217,64,64,0.7)', fontSize: 12, marginTop: 2 }}>Моменты останутся в коллекции</span>
                </div>
              </button>
            )}

            {isOwner && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
                style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
              >
                <span className="flex items-center justify-center rounded-[14px]" style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div className="min-w-0">
                  <span className="font-sans block" style={{ color: '#D94040', fontSize: 16, fontWeight: 600 }}>Удалить коллекцию</span>
                  <span className="font-sans block" style={{ color: 'rgba(217,64,64,0.7)', fontSize: 12, marginTop: 2 }}>Для всех участников навсегда</span>
                </div>
              </button>
            )}
          </div>
        </BottomSheet>
      )}

      {toast && <AppToast message={toast} onClose={() => setToast(null)} />}
    </div>
  )
}
