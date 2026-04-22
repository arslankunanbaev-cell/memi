import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import { deleteCapsuleSlot, deleteMoment, getMomentDetails, saveCapsuleSlot } from '../lib/api'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { getMomentDisplayAt } from '../lib/momentTime'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'

function formatFull(iso) {
  if (!iso) return ''

  const date = new Date(iso)
  const weekday = date.toLocaleDateString('ru-RU', { weekday: 'short' })
  const day = date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const time = date.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return `${weekday} · ${day} · ${time}`
}

function CircleButton({ onClick, children, light = false, ariaLabel }) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      className="flex items-center justify-center transition-opacity active:opacity-60"
      style={{
        width: 36,
        height: 36,
        border: 'none',
        borderRadius: 20,
        background: light ? 'rgba(255,255,255,0.2)' : 'var(--card)',
        backdropFilter: light ? 'blur(8px)' : 'none',
        WebkitBackdropFilter: light ? 'blur(8px)' : 'none',
        color: light ? '#fff' : 'var(--text)',
        boxShadow: light ? 'none' : 'var(--shadow-card)',
      }}
    >
      {children}
    </button>
  )
}

function PersonChip({ person }) {
  return (
    <div
      className="surface-card flex items-center gap-2 rounded-[20px]"
      style={{ padding: '6px 12px 6px 6px', backgroundColor: 'var(--moment-surface)' }}
    >
      <div
        className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          backgroundColor: person.avatar_color ?? 'var(--accent)',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          person.name[0]?.toUpperCase()
        )}
      </div>
      <span className="font-sans" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 500 }}>
        {person.name}
      </span>
    </div>
  )
}

function DetailChip({ children, emoji = false }) {
  return (
    <div
      className="surface-card inline-flex items-center gap-2 rounded-[20px]"
      style={{
        backgroundColor: 'var(--moment-surface)',
        color: emoji ? 'var(--text)' : 'var(--mid)',
        fontSize: emoji ? 20 : 14,
        padding: emoji ? '7px 14px' : '7px 14px',
      }}
    >
      {children}
    </div>
  )
}

function MusicCard({ title, artist, cover }) {
  const safeCover = proxifyCoverUrl(cover)

  return (
    <div
      className="stats-panel-surface flex items-center gap-3"
      style={{ padding: '12px 14px' }}
    >
      {safeCover ? (
        <img src={safeCover} alt={title} style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: 'var(--accent-light)', flexShrink: 0 }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2" />
          </svg>
        </div>
      )}
      <div className="min-w-0">
        <p className="font-sans" style={{ color: 'var(--text)', fontSize: 14, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        {artist && (
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 1 }}>
            {artist}
          </p>
        )}
      </div>
    </div>
  )
}

function MenuAction({ label, danger = false, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
      style={{
        border: 'none',
        backgroundColor: danger ? 'rgba(217, 64, 64, 0.07)' : 'var(--moment-surface)',
        marginBottom: 8,
        padding: '16px 18px',
      }}
    >
      <div
        className="flex items-center justify-center rounded-[14px]"
        style={{
          width: 40,
          height: 40,
          backgroundColor: danger ? 'rgba(217, 64, 64, 0.12)' : 'var(--accent-light)',
          color: danger ? '#D94040' : 'var(--mid)',
          flexShrink: 0,
        }}
      >
        {children}
      </div>
      <span className="font-sans" style={{ color: danger ? '#D94040' : 'var(--text)', fontSize: 17, fontWeight: 500 }}>
        {label}
      </span>
    </button>
  )
}

export default function MomentDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const moments = useAppStore((state) => state.moments)
  const friends = useAppStore((state) => state.friends)
  const currentUser = useAppStore((state) => state.currentUser)
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const removeFromCapsule = useAppStore((state) => state.removeFromCapsule)
  const removeMoment = useAppStore((state) => state.removeMoment)
  const storeMoment = moments.find((entry) => entry.id === id)
  const routePreviewMoment = location.state?.previewMoment?.id === id
    ? location.state.previewMoment
    : null

  const capsuleSlotIndex = capsule.findIndex((slot) => slot?.id === id)
  const [showMenu, setShowMenu] = useState(false)
  const [showCapsuleSheet, setShowCapsuleSheet] = useState(false)
  const [remoteMoment, setRemoteMoment] = useState(routePreviewMoment)
  const [loadingMoment, setLoadingMoment] = useState(false)

  const shouldFetchRemoteMoment = !storeMoment
    || location.state?.forceFetch === true
    || storeMoment?.isFriendFeed === true
  const moment = remoteMoment ?? storeMoment ?? routePreviewMoment
  const momentDisplayAt = getMomentDisplayAt(moment)

  const isOwn = !moment?.isShared && moment?.user_id === currentUser?.id

  useEffect(() => {
    let isActive = true

    setRemoteMoment(routePreviewMoment)

    if (!id || !shouldFetchRemoteMoment) {
      setLoadingMoment(false)
      return () => {
        isActive = false
      }
    }

    setLoadingMoment(true)

    async function loadMoment() {
      try {
        const nextMoment = await getMomentDetails(id)
        if (isActive && nextMoment) {
          setRemoteMoment(nextMoment)
        }
      } catch (error) {
        console.error('[MomentDetail] load error:', error)
      } finally {
        if (isActive) {
          setLoadingMoment(false)
        }
      }
    }

    loadMoment()

    return () => {
      isActive = false
    }
  }, [id, routePreviewMoment, shouldFetchRemoteMoment])

  if (!moment) {
    if (loadingMoment) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--base)' }}>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>
            Загрузка момента...
          </p>
        </div>
      )
    }

    return (
      <div className="flex h-full flex-col items-center justify-center gap-4" style={{ backgroundColor: 'var(--base)' }}>
        <span style={{ fontSize: 36 }}>🌀</span>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>
          Момент не найден
        </p>
        <button type="button" onClick={() => navigate(-1)} style={{ border: 'none', background: 'none', color: 'var(--accent)', fontSize: 14 }}>
          ← Назад
        </button>
      </div>
    )
  }

  async function handleRemoveFromCapsule() {
    removeFromCapsule(capsuleSlotIndex)

    try {
      await deleteCapsuleSlot(currentUser.id, capsuleSlotIndex)
    } catch (error) {
      console.error('[Capsule] delete error:', error)
    }
  }

  async function handleDelete() {
    tgHaptic('heavy')

    try {
      await deleteMoment(moment.id)
    } catch {
      // ignore when offline
    }

    removeMoment(moment.id)
    navigate('/home', { replace: true })
  }

  async function handleShare() {
    tgHaptic('light')

    const shareText = [moment.title, moment.description].filter(Boolean).join('\n')

    try {
      if (navigator.share) {
        await navigator.share({
          title: moment.title || 'Момент',
          text: shareText || moment.title || 'Момент',
        })
        return
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        return
      }
      console.error('[MomentDetail] share error:', error)
    }

    navigate(`/story/${moment.id}`)
  }

  const people = (moment.people ?? []).map((person) => {
    const linkedFriend = person.linked_user_id
      ? friends.find((friend) => friend.id === person.linked_user_id)
      : null

    return {
      id: `person-${person.id}`,
      name: linkedFriend?.name ?? person.name,
      photo_url: linkedFriend?.photo_url ?? person.photo_url ?? null,
      avatar_color: person.avatar_color ?? 'var(--accent)',
    }
  })

  const taggedFriends = (moment.taggedFriends ?? []).map((friend) => ({
    id: `friend-${friend.id}`,
    name: friend.name,
    photo_url: friend.photo_url ?? null,
    avatar_color: 'var(--accent)',
  }))

  const allPeople = [...people, ...taggedFriends]

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="hide-scrollbar flex-1 overflow-y-auto" style={{ paddingBottom: isOwn ? 110 : 40 }}>
        <div
          style={{
            position: 'relative',
            height: 353,
            overflow: 'hidden',
            background: moment.photo_url ? 'none' : 'linear-gradient(175deg, #5A3070 0%, #B04820 20%, #E07828 45%, #F0A840 70%, #F8D880 100%)',
          }}
        >
          {moment.photo_url && (
            <img
              src={moment.photo_url}
              alt={moment.title || 'Момент'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.6) 100%)' }} />

          <div className="flex items-center justify-between px-4 pt-topbar" style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
            <CircleButton onClick={() => navigate(-1)} light ariaLabel="Назад">
              <svg width="10" height="16" viewBox="0 0 10 16" fill="none">
                <path d="M8 2L2 8l6 6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </CircleButton>

            {isOwn ? (
              <CircleButton onClick={() => setShowMenu(true)} light ariaLabel="Открыть меню">
                <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
                  <circle cx="2" cy="2" r="1.5" fill="#fff" />
                  <circle cx="8" cy="2" r="1.5" fill="#fff" />
                  <circle cx="14" cy="2" r="1.5" fill="#fff" />
                </svg>
              </CircleButton>
            ) : (
              <div style={{ width: 36, height: 36 }} />
            )}
          </div>

          <div style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
            <h1
              className="font-serif"
              style={{
                color: '#fff',
                fontSize: 36,
                fontWeight: 700,
                letterSpacing: '-0.03em',
                lineHeight: 1.1,
                margin: 0,
                textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}
            >
              {moment.title || 'Момент'}
            </h1>
          </div>
        </div>

        <div className="px-4" style={{ paddingTop: 20 }}>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
            {formatFull(momentDisplayAt)}
          </p>

          {moment.description && (
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 17, lineHeight: 1.6, marginBottom: 20 }}>
              {moment.description}
            </p>
          )}

          {moment.song_title && (
            <div style={{ marginBottom: 20 }}>
              <MusicCard title={moment.song_title} artist={moment.song_artist} cover={moment.song_cover} />
            </div>
          )}

          {(allPeople.length > 0 || moment.location || moment.mood) && (
            <>
              <div style={{ height: 1, background: 'var(--divider)', marginBottom: 16 }} />

              {allPeople.length > 0 && (
                <>
                  <p
                    className="font-sans font-semibold"
                    style={{
                      color: 'var(--soft)',
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      marginBottom: 10,
                      textTransform: 'uppercase',
                    }}
                  >
                    С кем
                  </p>

                  <div className="flex flex-wrap gap-2" style={{ marginBottom: 20 }}>
                    {allPeople.map((person) => (
                      <PersonChip key={person.id} person={person} />
                    ))}
                  </div>
                </>
              )}

              {(moment.location || moment.mood) && (
                <>
                  <p
                    className="font-sans font-semibold"
                    style={{
                      color: 'var(--soft)',
                      fontSize: 12,
                      letterSpacing: '0.14em',
                      marginBottom: 10,
                      textTransform: 'uppercase',
                    }}
                  >
                    Детали
                  </p>

                  <div className="flex flex-wrap gap-2" style={{ marginBottom: 24 }}>
                    {moment.location && <DetailChip>📍 {moment.location}</DetailChip>}
                    {moment.mood && <DetailChip emoji>{moment.mood}</DetailChip>}
                  </div>
                </>
              )}
            </>
          )}

          {isOwn && (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => navigate(`/story/${moment.id}`)}
                className="font-sans flex-1 transition-opacity active:opacity-70"
                style={{
                  border: 'none',
                  borderRadius: 16,
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 600,
                  padding: '15px',
                }}
              >
                Скачать карточку
              </button>

              <button
                type="button"
                aria-label={capsuleSlotIndex !== -1 ? 'Убрать из капсулы' : 'Добавить в капсулу'}
                onClick={() => (
                  capsuleSlotIndex !== -1
                    ? handleRemoveFromCapsule()
                    : setShowCapsuleSheet(true)
                )}
                className="surface-card flex items-center justify-center rounded-[16px] transition-opacity active:opacity-60"
                style={{ border: 'none', width: 50, height: 50, backgroundColor: 'var(--moment-surface)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <rect x="5" y="4" width="14" height="16" rx="2" stroke="var(--accent)" strokeWidth="2" />
                  <path d="M9 2v4M15 2v4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 10h8M8 14h5" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>

              <button
                type="button"
                aria-label="Поделиться"
                onClick={handleShare}
                className="surface-card flex items-center justify-center rounded-[16px] transition-opacity active:opacity-60"
                style={{ border: 'none', width: 50, height: 50, backgroundColor: 'var(--moment-surface)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <circle cx="18" cy="5" r="3" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="6" cy="12" r="3" stroke="var(--accent)" strokeWidth="2" />
                  <circle cx="18" cy="19" r="3" stroke="var(--accent)" strokeWidth="2" />
                  <path d="M8.6 13.7l6.8 3.6M15.4 6.7L8.6 10.3" stroke="var(--accent)" strokeWidth="2" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {isOwn && showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title="Момент">
          <div className="px-5 pb-4">
            <MenuAction
              label="Редактировать"
              onClick={() => {
                setShowMenu(false)
                navigate(`/edit-moment/${moment.id}`)
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </MenuAction>

            <MenuAction
              label={capsuleSlotIndex !== -1 ? 'Убрать из капсулы' : 'Добавить в капсулу'}
              onClick={() => {
                setShowMenu(false)
                if (capsuleSlotIndex !== -1) {
                  handleRemoveFromCapsule()
                } else {
                  setShowCapsuleSheet(true)
                }
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="4" width="14" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
                <path d="M9 2v4M15 2v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 10h8M8 14h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </MenuAction>

            <MenuAction
              label="Удалить"
              danger
              onClick={() => {
                setShowMenu(false)
                handleDelete()
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <polyline points="3 6 5 6 21 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M10 11v6M14 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" stroke="currentColor" strokeWidth="2" />
              </svg>
            </MenuAction>
          </div>
        </BottomSheet>
      )}

      {isOwn && showCapsuleSheet && (
        <BottomSheet onClose={() => setShowCapsuleSheet(false)} title="Добавить в капсулу">
          <div className="pb-3">
            {[0, 1, 2, 3].map((slotIndex) => {
              const slotMoment = capsule[slotIndex]
              const isOccupied = slotMoment !== null

              return (
                <button
                  key={slotIndex}
                  type="button"
                  onClick={async () => {
                    setShowCapsuleSheet(false)
                    addToCapsule(slotIndex, moment)

                    try {
                      await saveCapsuleSlot(currentUser.id, slotIndex, moment.id)
                    } catch (error) {
                      console.error('[Capsule] save error:', error)
                    }
                  }}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-opacity active:opacity-60"
                  style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
                >
                  <div
                    className="flex items-center justify-center rounded-[8px] overflow-hidden"
                    style={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      background: isOccupied
                        ? (slotMoment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)')
                        : 'var(--surface)',
                      border: isOccupied ? 'none' : '1.5px dashed rgba(217,139,82,0.4)',
                    }}
                  >
                    {isOccupied && slotMoment.photo_url ? (
                      <img src={slotMoment.photo_url} alt={slotMoment.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : !isOccupied ? (
                      <span style={{ color: 'var(--accent)', fontSize: 16 }}>+</span>
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
                      Слот {slotIndex + 1}
                    </p>
                    <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 1 }}>
                      {isOccupied ? slotMoment.title : 'Пусто'}
                    </p>
                  </div>

                  {isOccupied && (
                    <span className="font-sans" style={{ color: 'var(--soft)', fontSize: 12 }}>
                      Заменить
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
