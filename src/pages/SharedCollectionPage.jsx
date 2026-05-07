import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import { AppToast } from '../components/FeedbackStates'
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

// ── Member avatar ─────────────────────────────────────────────────────────────

function MemberAvatar({ user, size = 28 }) {
  return (
    <div
      title={user?.name}
      style={{
        width: size, height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        backgroundColor: 'var(--accent-light)',
        border: '2px solid var(--base)',
        flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: Math.round(size * 0.42), fontWeight: 700,
        color: 'var(--accent)',
      }}
    >
      {user?.photo_url
        ? <img src={user.photo_url} alt={user?.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : (user?.name?.[0]?.toUpperCase() ?? '?')}
    </div>
  )
}

// ── Moment grid cell ──────────────────────────────────────────────────────────

function MomentGridCell({ moment, onLongPress }) {
  const navigate = useNavigate()
  const timerRef = useRef(null)
  const longPressedRef = useRef(false)

  function clearLongPressTimer() {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  function handleOpen() {
    if (longPressedRef.current) {
      longPressedRef.current = false
      return
    }
    navigateWithTransition(navigate, `/moment/${moment.id}`)
  }

  return (
    <button
      type="button"
      onClick={handleOpen}
      onTouchStart={() => {
        longPressedRef.current = false
        clearLongPressTimer()
        timerRef.current = setTimeout(() => {
          longPressedRef.current = true
          tgHaptic('medium')
          onLongPress?.(moment)
        }, 420)
      }}
      onTouchMove={clearLongPressTimer}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
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
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.62) 0%, rgba(23,20,14,0.08) 58%, transparent 100%)' }} />
      {moment.mood && (
        <span style={{ position: 'absolute', top: 8, right: 8, fontSize: 17, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.18))' }}>
          {moment.mood}
        </span>
      )}
      <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', width: '82%' }}>
        <div className="font-sans" style={{
          background: 'rgba(255,255,255,0.88)',
          backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
          borderRadius: 999, border: '1px solid rgba(255,255,255,0.58)',
          boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
          color: '#17140E', fontSize: 11, fontWeight: 600,
          overflow: 'hidden', padding: '4px 10px',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
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
        {myMoments.length > 4 && (
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск..."
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 12, padding: '11px 14px',
              fontSize: 15, color: 'var(--text)', border: 'none',
            }}
          />
        )}
        <div className="flex flex-col gap-2" style={{ maxHeight: 360, overflowY: 'auto' }}>
          {filtered.length === 0 && (
            <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 14, padding: '24px 0' }}>
              {myMoments.length === 0
                ? 'У тебя пока нет моментов.\nСначала добавь момент на главной.'
                : 'Все твои моменты уже в коллекции 🎉'}
            </p>
          )}
          {filtered.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => onAdd(moment)}
              className="flex items-center gap-3 text-left transition-opacity active:opacity-60"
              style={{
                backgroundColor: 'var(--moment-surface)', borderRadius: 14,
                padding: '10px 12px', border: 'none', boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                background: moment.photo_url ? 'var(--surface)' : 'linear-gradient(135deg, #BD8A5D, #F0D7A1)',
              }}>
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
                  {moment.location ?? new Date(moment.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div
                className="flex items-center justify-center"
                style={{ width: 30, height: 30, borderRadius: 999, backgroundColor: 'var(--accent-light)', flexShrink: 0 }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
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
        <button type="button" onClick={onOpen}
          className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
          style={{ backgroundColor: 'var(--moment-surface)', padding: '14px 16px', border: 'none' }}
        >
          <span className="flex items-center justify-center rounded-[14px]"
            style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
              <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="font-sans" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 600 }}>Открыть момент</span>
        </button>
        {isOwn && (
          <button type="button" onClick={onRemove}
            className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
            style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
          >
            <span className="flex items-center justify-center rounded-[14px]"
              style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}>
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

// ── Loading state ─────────────────────────────────────────────────────────────

function CollectionLoadingState() {
  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      {/* cover placeholder */}
      <div style={{ height: 200, background: 'linear-gradient(135deg, var(--surface) 0%, var(--moment-surface) 100%)', flexShrink: 0, position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            border: '3px solid rgba(217,139,82,0.25)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </div>
      <div className="px-4" style={{ paddingTop: 18 }}>
        {[180, 120, 220].map((w, i) => (
          <div key={i} style={{
            height: i === 0 ? 28 : 16, width: w, borderRadius: 999,
            backgroundColor: 'var(--surface)', marginBottom: 12,
          }} />
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SharedCollectionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = useAppStore((s) => s.currentUser)
  const myMoments = useAppStore((s) => s.moments.filter((m) => m.user_id === currentUser?.id))
  const updateCollection = useAppStore((s) => s.updateCollection)
  const removeCollection = useAppStore((s) => s.removeCollection)

  const [collection, setCollection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
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
  const momentCount = collection?.moments?.length ?? 0
  const memberCount = collection?.members?.length ?? 0
  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1)
    } else {
      navigate('/archive', { replace: true })
    }
  }, [navigate])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

  const load = useCallback(async () => {
    if (!id) { setLoading(false); setLoadError(true); return }
    setLoading(true)
    setLoadError(false)
    try {
      const data = await getCollectionDetails(id)
      setCollection(data)
    } catch (err) {
      console.error('[SharedCollectionPage] load error:', err)
      setLoadError(true)
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
      navigator.share({ title: collection.name, text: `Присоединяйся к коллекции «${collection.name}» в memi`, url: link }).catch(() => null)
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => setToast('Ссылка скопирована')).catch(() => null)
    }
  }

  async function handleAddMoment(moment) {
    if (!currentUser?.id) return
    tgHaptic('medium')
    setShowAddMoment(false)
    try {
      await addMomentToCollection(id, moment.id, currentUser.id)
      const nextMomentCount = momentCount + 1
      setCollection((prev) => ({
        ...prev,
        moments: [{ ...moment, collectionAddedBy: currentUser.id }, ...(prev?.moments ?? [])],
      }))
      updateCollection(id, { momentCount: nextMomentCount })
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
      const nextMomentCount = Math.max(0, momentCount - 1)
      setCollection((prev) => ({
        ...prev,
        moments: (prev?.moments ?? []).filter((m) => m.id !== moment.id),
      }))
      updateCollection(id, { momentCount: nextMomentCount })
      setToast('Убрано из коллекции')
    } catch (err) {
      console.error('[SharedCollectionPage] remove error:', err)
      setToast('Не удалось убрать')
    }
  }

  async function handleLeave() {
    setShowMenu(false)
    if (!currentUser?.id) return
    tgHaptic('medium')
    try {
      await leaveCollection(id, currentUser.id)
      removeCollection(id)
      goBack()
    } catch (err) {
      console.error('[SharedCollectionPage] leave error:', err)
      setToast('Не удалось выйти')
    }
  }

  async function handleDelete() {
    setShowMenu(false)
    if (!isOwner) return
    tgHaptic('heavy')
    try {
      await deleteCollection(id)
      removeCollection(id)
      goBack()
    } catch (err) {
      console.error('[SharedCollectionPage] delete error:', err)
      setToast('Не удалось удалить')
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
      setToast('Обложка обновлена')
    } catch (err) {
      console.error('[SharedCollectionPage] cover error:', err)
      setToast('Не удалось обновить обложку')
    }
  }

  // ── Loading ──
  if (loading) return <CollectionLoadingState />

  // ── Error / not found ──
  if (loadError || !collection) {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
        <div className="px-4 pt-topbar">
          <button type="button" onClick={goBack}
            className="flex items-center gap-2 font-sans transition-opacity active:opacity-60"
            style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 15, fontWeight: 600, padding: '4px 0' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Назад
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <span style={{ fontSize: 48, marginBottom: 16 }}>🔍</span>
          <p className="font-sans" style={{ color: 'var(--text)', fontSize: 18, fontWeight: 700, margin: 0 }}>
            Коллекция не найдена
          </p>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14, marginTop: 8, lineHeight: 1.5 }}>
            Возможно, она была удалена или ты не являешься её участником
          </p>
          <button type="button" onClick={load}
            className="font-sans transition-opacity active:opacity-70"
            style={{
              marginTop: 24, border: 'none', borderRadius: 999,
              backgroundColor: 'var(--accent)', color: '#fff',
              fontSize: 14, fontWeight: 700, padding: '12px 24px',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            Попробовать снова
          </button>
        </div>
      </div>
    )
  }

  const coverBg = collection.cover_url
    ? `url(${collection.cover_url}) center/cover no-repeat`
    : 'linear-gradient(135deg, #BD8A5D 0%, #D98B52 50%, #F0D7A1 100%)'

  return (
    <div
      {...swipeBackHandlers}
      className="flex h-full flex-col"
      style={{ backgroundColor: 'var(--base)', ...swipeBackHandlers.style }}
    >
      {/* ── Cover ── */}
      <div style={{ position: 'relative', height: 190, flexShrink: 0, background: coverBg }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.78) 0%, rgba(23,20,14,0.06) 55%)' }} />

        {/* Back */}
        <button type="button" onClick={goBack}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)', left: 16,
            width: 36, height: 36, borderRadius: 18, border: 'none',
            background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Menu */}
        <button type="button" onClick={() => { tgHaptic('light'); setShowMenu(true) }}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top) + 12px)', right: 16,
            width: 36, height: 36, borderRadius: 18, border: 'none',
            background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            color: '#fff',
          }}
        >
          <svg width="4" height="16" viewBox="0 0 4 16" fill="currentColor">
            <circle cx="2" cy="2" r="2" /><circle cx="2" cy="8" r="2" /><circle cx="2" cy="14" r="2" />
          </svg>
        </button>

        {/* Name + meta */}
        <div style={{ position: 'absolute', bottom: 14, left: 16, right: isOwner ? 104 : 16 }}>
          <h1 className="font-sans" style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
            {collection.name}
          </h1>
          <div className="flex items-center gap-2" style={{ marginTop: 6 }}>
            <div className="flex">
              {(collection.members ?? []).slice(0, 5).map((member, i) => (
                <div key={member.user_id} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: 5 - i, position: 'relative' }}>
                  <MemberAvatar user={member.user} size={22} />
                </div>
              ))}
            </div>
            <span className="font-sans" style={{ color: 'rgba(255,255,255,0.78)', fontSize: 12 }}>
              {memberCount} {pluralRu(memberCount, 'участник', 'участника', 'участников')}
              {momentCount > 0 && ` · ${momentCount} ${pluralRu(momentCount, 'момент', 'момента', 'моментов')}`}
            </span>
          </div>
        </div>

        {/* Change cover (owner) */}
        {isOwner && (
          <>
            <button type="button" onClick={() => coverInputRef.current?.click()}
              className="flex items-center gap-1 font-sans transition-opacity active:opacity-70"
              style={{
                position: 'absolute', bottom: 14, right: 16,
                background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 999, border: 'none', color: 'rgba(255,255,255,0.9)',
                fontSize: 12, fontWeight: 600, padding: '5px 10px',
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

      {/* ── Scrollable body ── */}
      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingTop: 16, paddingBottom: 32 }}>

        {momentCount === 0 ? (
          /* ── Empty state ── */
          <div
            className="flex flex-col items-center"
            style={{ paddingTop: 24 }}
          >
            {/* Big add button */}
            <button
              type="button"
              onClick={() => { tgHaptic('medium'); setShowAddMoment(true) }}
              className="flex flex-col items-center justify-center gap-3 w-full transition-opacity active:opacity-70"
              style={{
                border: '2px dashed var(--accent)',
                borderRadius: 24,
                background: 'rgba(217,139,82,0.05)',
                padding: '36px 24px',
                marginBottom: 16,
              }}
            >
              <div
                className="flex items-center justify-center"
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  backgroundColor: 'var(--accent)', color: '#fff',
                  boxShadow: 'var(--shadow-accent)',
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-sans" style={{ color: 'var(--text)', fontSize: 16, fontWeight: 700, margin: 0 }}>
                  Добавить момент
                </p>
                <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 4, lineHeight: 1.4 }}>
                  Выбери из своих воспоминаний
                </p>
              </div>
            </button>

            {/* Invite button */}
            <button
              type="button"
              onClick={shareInvite}
              className="flex items-center justify-center gap-2 w-full font-sans transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--moment-surface)',
                border: 'none', borderRadius: 18,
                color: 'var(--deep)', fontSize: 14, fontWeight: 600,
                padding: '14px 0', boxShadow: 'var(--shadow-card)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: 'var(--accent)' }}>
                <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                <path d="M8.6 13.7l6.8 3.6M15.4 6.7 8.6 10.3" stroke="currentColor" strokeWidth="2" />
              </svg>
              Пригласить друга
            </button>
          </div>
        ) : (
          /* ── Moments grid ── */
          <>
            {/* Action bar */}
            <div className="flex gap-2" style={{ marginBottom: 14 }}>
              <button
                type="button"
                onClick={() => { tgHaptic('light'); setShowAddMoment(true) }}
                className="flex flex-1 items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
                style={{
                  backgroundColor: 'var(--accent)', border: 'none', borderRadius: 14,
                  color: '#fff', fontSize: 14, fontWeight: 700,
                  padding: '12px 0', boxShadow: 'var(--shadow-accent)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                </svg>
                Добавить
              </button>
              <button
                type="button"
                onClick={shareInvite}
                className="flex items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
                style={{
                  backgroundColor: 'var(--moment-surface)', border: 'none', borderRadius: 14,
                  color: 'var(--accent)', fontSize: 14, fontWeight: 700,
                  padding: '12px 16px', boxShadow: 'var(--shadow-card)',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="6" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
                  <circle cx="18" cy="19" r="3" stroke="currentColor" strokeWidth="2" />
                  <path d="M8.6 13.7l6.8 3.6M15.4 6.7 8.6 10.3" stroke="currentColor" strokeWidth="2" />
                </svg>
                Пригласить
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
              {(collection.moments ?? []).map((moment, index) => (
                <div key={moment.id} style={{ animation: 'fadeSlideUp 0.25s ease both', animationDelay: `${index * 35}ms` }}>
                  <MomentGridCell
                    moment={moment}
                    onLongPress={(m) => {
                      const ownAdded = m.collectionAddedBy === currentUser?.id
                      const ownMoment = m.user_id === currentUser?.id
                      setActionMoment({ ...m, _isOwn: isOwner || ownAdded || ownMoment })
                    }}
                  />
                </div>
              ))}
            </div>
          </>
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
          onOpen={() => { setActionMoment(null); navigateWithTransition(navigate, `/moment/${actionMoment.id}`) }}
          onRemove={() => handleRemoveMoment(actionMoment)}
        />
      )}

      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title={collection.name}>
          <div className="px-4 pb-4 flex flex-col gap-3">
            <button type="button" onClick={() => { setShowMenu(false); shareInvite() }}
              className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{ backgroundColor: 'var(--moment-surface)', padding: '14px 16px', border: 'none' }}
            >
              <span className="flex items-center justify-center rounded-[14px]"
                style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}>
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
              <button type="button" onClick={handleLeave}
                className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
                style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
              >
                <span className="flex items-center justify-center rounded-[14px]"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
                  <span className="font-sans block" style={{ color: '#D94040', fontSize: 16, fontWeight: 600 }}>Выйти из коллекции</span>
                  <span className="font-sans block" style={{ color: 'rgba(217,64,64,0.7)', fontSize: 12, marginTop: 2 }}>Моменты останутся</span>
                </div>
              </button>
            )}

            {isOwner && (
              <button type="button" onClick={handleDelete}
                className="flex items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
                style={{ backgroundColor: 'rgba(217,64,64,0.07)', padding: '14px 16px', border: 'none' }}
              >
                <span className="flex items-center justify-center rounded-[14px]"
                  style={{ width: 40, height: 40, backgroundColor: 'rgba(217,64,64,0.12)', color: '#D94040', flexShrink: 0 }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none">
                    <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <div>
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
