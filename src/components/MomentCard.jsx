import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import ProfileSongCard from './ProfileSongCard'
import { getMomentDisplayAt } from '../lib/momentTime'
import { navigateWithTransition } from '../lib/navigation'
import { getPhotoCropStyle } from '../lib/photoCrop'
import { useAppStore } from '../store/useAppStore'

function formatTime(iso) {
  if (!iso) return ''

  return new Date(iso).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Avatar({ person, name, photoUrl, fallbackColor }) {
  const initial = (name || person?.name || '?')[0]?.toUpperCase() ?? '?'
  const photo = photoUrl ?? person?.photo_url
  const bg = fallbackColor ?? person?.avatar_color ?? 'var(--accent)'

  return (
    <div
      className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
      style={{
        width: 26,
        height: 26,
        backgroundColor: bg,
        border: '2px solid rgba(255,255,255,0.78)',
        boxShadow: '0 2px 8px rgba(80, 50, 30, 0.12)',
      }}
    >
      {photo ? (
        <img src={photo} alt={name || person?.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <span className="font-sans" style={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>
          {initial}
        </span>
      )}
    </div>
  )
}

function PhotoChip({ children, center = false }) {
  return (
    <div
      className="font-sans type-support"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: 5,
        maxWidth: '100%',
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 999,
        padding: '6px 12px',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
        color: '#17140E',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  )
}

function ParticipantChip({ person, onClick }) {
  const isClickable = typeof onClick === 'function'
  const handleClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onClick?.()
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Открыть профиль ${person.name}` : undefined}
      className={`flex items-center gap-2${isClickable ? ' cursor-pointer transition-opacity active:opacity-60' : ''}`}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              handleClick(event)
            }
          }
        : undefined}
    >
      <Avatar person={person} />
      <span className="font-sans type-support" style={{ color: 'var(--mid)' }}>
        {person.name}
      </span>
    </div>
  )
}

export default function MomentCard({ moment, onLongPress }) {
  const navigate = useNavigate()
  const openingRef = useRef(false)
  const longPressTimerRef = useRef(null)
  const longPressTriggeredRef = useRef(false)
  const currentUser = useAppStore((state) => state.currentUser)
  const friends = useAppStore((state) => state.friends)

  const isShared = moment.isShared || (moment.user_id && moment.user_id !== currentUser?.id)
  const author = isShared
    ? friends.find((friend) => friend.id === moment.user_id) ?? { name: 'Пользователь', photo_url: null }
    : null

  const participants = [
    ...(moment.people ?? []).map((person) => ({
      id: `person-${person.id}`,
      name: person.name,
      photo_url: person.photo_url ?? null,
      avatar_color: person.avatar_color ?? 'var(--accent)',
      profileUserId: person.linked_user_id ?? null,
    })),
    ...(moment.taggedFriends ?? []).map((friend) => ({
      id: `friend-${friend.id}`,
      name: friend.name,
      photo_url: friend.photo_url ?? null,
      avatar_color: 'var(--accent)',
      profileUserId: friend.id,
    })),
  ]

  const openMoment = () => {
    if (openingRef.current) return
    openingRef.current = true
    navigateWithTransition(navigate, `/moment/${moment.id}`)
  }

  const openProfile = (userId) => {
    if (!userId || userId === currentUser?.id) return
    navigateWithTransition(navigate, `/profile/${userId}`)
  }

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handlePointerDown = (event) => {
    if (!onLongPress || event.button > 0) return

    longPressTriggeredRef.current = false
    clearLongPressTimer()
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true
      onLongPress(moment)
    }, 480)
  }

  const handlePointerUp = (event) => {
    clearLongPressTimer()
    if (longPressTriggeredRef.current) {
      event.preventDefault()
      return
    }

    if (event.pointerType === 'mouse') return
    event.preventDefault()
    openMoment()
  }

  const handlePointerCancel = () => {
    clearLongPressTimer()
  }

  const handleContextMenu = (event) => {
    if (!onLongPress) return
    event.preventDefault()
    clearLongPressTimer()
    longPressTriggeredRef.current = true
    onLongPress(moment)
  }

  const handleClick = (event) => {
    if (longPressTriggeredRef.current) {
      event.preventDefault()
      longPressTriggeredRef.current = false
      return
    }

    openMoment()
  }

  return (
    <button
      type="button"
      className="card-hover block w-full overflow-hidden rounded-[22px] cursor-pointer p-0 text-left transition-transform active:scale-[0.985]"
      style={{
        appearance: 'none',
        backgroundColor: 'var(--moment-surface)',
        border: '1px solid rgba(160, 94, 44, 0.08)',
        boxShadow: '0 12px 34px rgba(80, 50, 30, 0.12)',
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerCancel}
      onPointerCancel={handlePointerCancel}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
    >
      {isShared && author && (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{
            borderBottom: '1px solid var(--divider)',
            backgroundColor: 'var(--moment-surface)',
          }}
        >
          <Avatar name={author.name} photoUrl={author.photo_url} />
          <span className="font-sans type-support" style={{ color: 'var(--mid)' }}>
            {author.name}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
        {moment.photo_url ? (
          <img
            src={moment.photo_url}
            alt={moment.title || 'Момент'}
            style={{ width: '100%', height: '100%', ...getPhotoCropStyle(moment), transform: 'scale(1.01)' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #7C5436 0%, #C98957 48%, #F0D0A1 100%)' }} />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, transparent 34%, rgba(0,0,0,0.62) 100%)',
          }}
        />

        <div
          style={{
            position: 'absolute',
            inset: 0,
            boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.25)',
            pointerEvents: 'none',
          }}
        />

        {moment.location && (
          <div style={{ position: 'absolute', top: 12, left: 12, maxWidth: 'calc(100% - 24px)' }}>
            <PhotoChip>
              <span style={{ fontSize: 12 }}>📍</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{moment.location}</span>
            </PhotoChip>
          </div>
        )}

        {moment.title && (
          <div style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 'calc(100% - 104px)' }}>
            <PhotoChip>{moment.title}</PhotoChip>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            right: 12,
            bottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {moment.mood && <span style={{ fontSize: 18 }}>{moment.mood}</span>}
          <div
            className="font-sans type-support"
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderRadius: 10,
              padding: '3px 8px',
              color: '#fff',
            }}
          >
            {formatTime(getMomentDisplayAt(moment))}
          </div>
        </div>
      </div>

      {(moment.description || moment.song_title || participants.length > 0) && (
        <div style={{ padding: '16px 16px 18px' }}>
          {moment.description && (
            <p
              className="font-sans type-body"
              style={{
                color: 'var(--text)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                margin: 0,
              }}
            >
              {moment.description}
            </p>
          )}

          {moment.song_title && (
            <ProfileSongCard
              title={moment.song_title}
              artist={moment.song_artist}
              cover={moment.song_cover}
              previewUrl={moment.song_preview_url}
              as="div"
              stopPropagation
            />
          )}

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 14, paddingTop: 2 }}>
              {participants.map((person) => (
                <ParticipantChip
                  key={person.id}
                  person={person}
                  onClick={person.profileUserId ? () => openProfile(person.profileUserId) : null}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </button>
  )
}
