import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { deleteMoment, saveCapsuleSlot, deleteCapsuleSlot } from '../lib/api'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

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

function IconButton({ onClick, label, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center transition-opacity active:opacity-60"
      style={{
        width: 40,
        height: 40,
        borderRadius: '50%',
        border: 'none',
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
      }}
    >
      {children}
    </button>
  )
}

function MoreIcon() {
  return (
    <svg width="18" height="4" viewBox="0 0 18 4" fill="none" aria-hidden="true">
      <circle cx="2" cy="2" r="2" fill="currentColor" />
      <circle cx="9" cy="2" r="2" fill="currentColor" />
      <circle cx="16" cy="2" r="2" fill="currentColor" />
    </svg>
  )
}

function ShareIcon({ color = 'currentColor' }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

function MusicNoteIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2" />
      <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2" />
    </svg>
  )
}

function PersonChip({ person }) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        borderRadius: 9999,
        padding: '4px 12px 4px 4px',
        backgroundColor: 'rgba(237,230,220,0.9)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
        style={{
          width: 24,
          height: 24,
          backgroundColor: person.avatar_color ?? 'var(--accent)',
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
        }}
      >
        {person.photo_url ? (
          <img
            src={person.photo_url}
            alt={person.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          person.name?.[0]?.toUpperCase()
        )}
      </div>
      <span className="font-sans" style={{ fontSize: 14, color: 'var(--text)' }}>
        {person.name}
      </span>
    </div>
  )
}

function MetaChip({ children, icon = null, emoji = false }) {
  return (
    <div
      className="inline-flex items-center gap-1.5"
      style={{
        borderRadius: 9999,
        padding: emoji ? '4px 12px' : '6px 12px',
        backgroundColor: 'rgba(237,230,220,0.9)',
      }}
    >
      {icon && <span style={{ fontSize: 13 }}>{icon}</span>}
      <span
        className="font-sans"
        style={{
          fontSize: emoji ? 18 : 14,
          lineHeight: 1,
          color: emoji ? 'var(--text)' : 'var(--mid)',
        }}
      >
        {children}
      </span>
    </div>
  )
}

function SongCard({ title, artist, cover }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        marginTop: 18,
        borderRadius: 18,
        padding: '10px 12px',
        backgroundColor: 'rgba(237,230,220,0.8)',
      }}
    >
      {cover ? (
        <img
          src={cover}
          alt={title}
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            flexShrink: 0,
            backgroundColor: 'rgba(217,139,82,0.16)',
          }}
        >
          <MusicNoteIcon />
        </div>
      )}
      <div className="min-w-0">
        <p
          className="font-sans font-semibold"
          style={{
            fontSize: 16,
            color: 'var(--text)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
        {artist && (
          <p
            className="font-sans"
            style={{
              marginTop: 3,
              fontSize: 15,
              color: 'var(--mid)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {artist}
          </p>
        )}
      </div>
    </div>
  )
}

export default function MomentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((s) => s.moments)
  const friends = useAppStore((s) => s.friends)
  const removeMoment = useAppStore((s) => s.removeMoment)
  const currentUser = useAppStore((s) => s.currentUser)
  const capsule = useAppStore((s) => s.capsule)
  const addToCapsule = useAppStore((s) => s.addToCapsule)
  const removeFromCapsule = useAppStore((s) => s.removeFromCapsule)
  const moment = moments.find((m) => m.id === id)

  const capsuleSlotIndex = capsule.findIndex((slot) => slot?.id === id)

  const [showMenu, setShowMenu] = useState(false)
  const [showCapsuleSheet, setShowCapsuleSheet] = useState(false)

  const isOwn = !moment?.isShared && moment?.user_id === currentUser?.id

  if (!moment) {
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-4"
        style={{ backgroundColor: 'var(--base)' }}
      >
        <span style={{ fontSize: 36 }}>🌀</span>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>
          Момент не найден
        </p>
        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14 }}
        >
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
      if (error?.name !== 'AbortError') {
        console.error('[MomentDetail] share error:', error)
      } else {
        return
      }
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
  const hasDetails = allPeople.length > 0 || moment.location || moment.mood

  return (
    <div className="flex h-full flex-col animate-fade-in" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex items-center justify-between px-4 pt-topbar pb-4">
        <IconButton onClick={() => navigate(-1)} label="Назад">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M19 12H5" />
            <path d="M12 5l-7 7 7 7" />
          </svg>
        </IconButton>

        <span className="font-sans font-medium" style={{ fontSize: 16, color: 'var(--text)' }}>
          Момент
        </span>

        {isOwn ? (
          <IconButton onClick={() => setShowMenu(true)} label="Открыть меню">
            <MoreIcon />
          </IconButton>
        ) : (
          <div style={{ width: 40, height: 40 }} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div
          style={{
            position: 'relative',
            aspectRatio: '375 / 352',
            minHeight: 320,
            background: 'linear-gradient(180deg, #E2A18A 0%, #D98B52 58%, #8A5634 100%)',
            overflow: 'hidden',
          }}
        >
          {moment.photo_url ? (
            <img
              src={moment.photo_url}
              alt={moment.title || 'Момент'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : null}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(23,20,14,0) 40%, rgba(23,20,14,0.62) 100%)',
            }}
          />

          <div style={{ position: 'absolute', left: 12, right: 12, bottom: 14 }}>
            <h1
              className="font-serif uppercase"
              style={{
                margin: 0,
                fontSize: 'clamp(2.7rem, 12vw, 4rem)',
                lineHeight: 0.9,
                fontWeight: 600,
                letterSpacing: '0.04em',
                color: '#fff',
                textShadow: '0 2px 12px rgba(0,0,0,0.24)',
              }}
            >
              {(moment.title || 'Момент').toLocaleUpperCase('ru-RU')}
            </h1>
          </div>
        </div>

        <div className="px-4" style={{ paddingTop: 16, paddingBottom: isOwn ? 24 : 32 }}>
          <p className="font-sans" style={{ fontSize: 14, color: 'var(--soft)' }}>
            {formatFull(moment.created_at)}
          </p>

          {moment.description && (
            <p
              className="font-sans"
              style={{
                marginTop: 14,
                fontSize: 16,
                lineHeight: 1.5,
                color: 'var(--text)',
              }}
            >
              {moment.description}
            </p>
          )}

          {moment.song_title && (
            <SongCard
              title={moment.song_title}
              artist={moment.song_artist}
              cover={moment.song_cover}
            />
          )}

          {hasDetails && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 18 }}>
              {allPeople.map((person) => (
                <PersonChip key={person.id} person={person} />
              ))}

              {moment.location && <MetaChip icon="📍">{moment.location}</MetaChip>}
              {moment.mood && <MetaChip emoji>{moment.mood}</MetaChip>}
            </div>
          )}
        </div>
      </div>

      {isOwn && (
        <div className="px-4 pt-1 pb-safe">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(`/story/${moment.id}`)}
              className="flex-1 font-sans font-semibold transition-opacity active:opacity-70"
              style={{
                height: 52,
                border: 'none',
                borderRadius: 9999,
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: 16,
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
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--accent)',
                fontSize: 21,
              }}
            >
              📌
            </button>

            <button
              type="button"
              aria-label="Поделиться"
              onClick={handleShare}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'var(--surface)',
                color: 'var(--text)',
              }}
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      )}

      {isOwn && showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)}>
          <div>
            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                navigate(`/edit-moment/${moment.id}`)
              }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{
                background: 'none',
                border: 'none',
                borderBottom: '0.5px solid var(--surface)',
              }}
            >
              <span style={{ fontSize: 18 }}>✏️</span>
              <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>
                Редактировать
              </span>
            </button>

            {capsuleSlotIndex !== -1 ? (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  handleRemoveFromCapsule()
                }}
                className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: '0.5px solid var(--surface)',
                }}
              >
                <span style={{ fontSize: 18 }}>💊</span>
                <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>
                  Убрать из капсулы
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false)
                  setShowCapsuleSheet(true)
                }}
                className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: '0.5px solid var(--surface)',
                }}
              >
                <span style={{ fontSize: 18 }}>💊</span>
                <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>
                  Добавить в капсулу
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                handleDelete()
              }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none' }}
            >
              <span style={{ fontSize: 18 }}>🗑️</span>
              <span className="font-sans" style={{ fontSize: 15, color: '#E05252' }}>
                Удалить
              </span>
            </button>
          </div>
        </BottomSheet>
      )}

      {isOwn && showCapsuleSheet && (
        <BottomSheet onClose={() => setShowCapsuleSheet(false)} title="Добавить в капсулу">
          <div className="pb-4">
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
                  className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                  style={{
                    background: 'none',
                    border: 'none',
                    borderBottom: '0.5px solid var(--surface)',
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: isOccupied && slotMoment.photo_url
                        ? 'none'
                        : isOccupied
                          ? 'linear-gradient(135deg, #C8A478, #8C5830)'
                          : 'var(--surface)',
                      border: isOccupied ? 'none' : '1.5px dashed rgba(217,139,82,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isOccupied && slotMoment.photo_url && (
                      <img
                        src={slotMoment.photo_url}
                        alt={slotMoment.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}
                    {!isOccupied && <span style={{ fontSize: 16, color: 'var(--accent)' }}>+</span>}
                  </div>

                  <div className="flex-1 text-left">
                    <p className="font-sans font-medium" style={{ fontSize: 15, color: 'var(--text)' }}>
                      Слот {slotIndex + 1}
                    </p>
                    <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>
                      {isOccupied ? slotMoment.title : 'Пусто'}
                    </p>
                  </div>

                  {isOccupied && (
                    <span className="font-sans" style={{ fontSize: 12, color: 'var(--soft)' }}>
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
