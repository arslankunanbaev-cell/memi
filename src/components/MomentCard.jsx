import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MomentCard({ moment }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const currentUser = useAppStore((s) => s.currentUser)
  const friends = useAppStore((s) => s.friends)

  const isShared = moment.isShared || (moment.user_id && moment.user_id !== currentUser?.id)
  const author = isShared
    ? (friends.find((f) => f.id === moment.user_id) ?? { name: 'Пользователь', photo_url: null })
    : null

  const allPeople = [
    ...(moment.people ?? []),
    ...(moment.taggedFriends ?? []).map((u) => ({ ...u, avatar_color: null })),
  ]
  const hasPeople = allPeople.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-transform duration-150 ease-out active:scale-[0.97]"
      style={{ backgroundColor: 'var(--surface)', boxShadow: '0 2px 14px rgba(23,20,14,0.10)' }}
      onClick={() => expanded ? navigate(`/moment/${moment.id}`) : setExpanded(true)}
    >
      {/* Author strip — shown only for friends' moments */}
      {isShared && author && (
        <div className="flex items-center gap-2 px-3 py-2" style={{ borderBottom: '0.5px solid var(--base)' }}>
          <div
            className="flex items-center justify-center rounded-full font-sans font-medium flex-shrink-0"
            style={{ width: 20, height: 20, backgroundColor: 'var(--accent)', color: '#fff', fontSize: 9, overflow: 'hidden' }}
          >
            {author.photo_url
              ? <img src={author.photo_url} alt={author.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : author.name[0]?.toUpperCase()}
          </div>
          <span className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>{author.name}</span>
        </div>
      )}

      {/* Photo / gradient top */}
      <div style={{ position: 'relative', height: expanded ? 275 : 225, overflow: 'hidden', transition: 'height 0.3s ease' }}>
        {moment.photo_url ? (
          <img
            src={moment.photo_url}
            alt={moment.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #E8D5C0, #C8A880)',
            }}
          />
        )}

        {/* Gradient overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 45%, transparent 70%)',
          }}
        />

        {/* Title pill */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, maxWidth: 'calc(100% - 16px)' }}>
          <span
            className="font-serif"
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.90)',
              color: 'var(--text)',
              borderRadius: 9999,
              padding: '5px 14px',
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: '0.2px',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {moment.title}
          </span>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        {/* Description */}
        {moment.description && (
          <p
            className="font-sans"
            style={{
              fontSize: 14,
              color: 'var(--mid)',
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              marginBottom: 8,
            }}
          >
            {moment.description}
          </p>
        )}

        {/* Bottom rows: music (if any) + meta */}
        <div className="flex flex-col gap-1.5" style={{ minWidth: 0 }}>
          {/* Song row */}
          {moment.song_title && (
            <div className="flex items-center gap-1.5" style={{ minWidth: 0 }}>
              {moment.song_cover ? (
                <img
                  src={moment.song_cover}
                  alt="cover"
                  style={{ width: 28, height: 28, borderRadius: 5, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 5,
                    backgroundColor: 'var(--base)',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                  }}
                >
                  🎵
                </div>
              )}
              <div style={{ minWidth: 0 }}>
                <p
                  className="font-sans"
                  style={{
                    fontSize: 13,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: 0,
                  }}
                >
                  {moment.song_title}
                </p>
                {moment.song_artist && (
                  <p className="font-sans" style={{ fontSize: 12, color: 'var(--soft)', margin: 0 }}>
                    {moment.song_artist}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Time · location · mood row */}
          <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
            <span className="font-sans" style={{ fontSize: 12, color: 'var(--soft)', flexShrink: 0 }}>
              {formatTime(moment.created_at)}
            </span>

            {moment.location && (
              <span
                className="font-sans"
                style={{
                  fontSize: 12,
                  color: 'var(--mid)',
                  backgroundColor: 'var(--base)',
                  borderRadius: 9999,
                  padding: '2px 7px',
                  flexShrink: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: 90,
                }}
              >
                📍 {moment.location}
              </span>
            )}

            {moment.mood && (
              <span style={{ fontSize: 13, flexShrink: 0 }}>{moment.mood}</span>
            )}
          </div>
        </div>

        {/* People chips */}
        {hasPeople && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
            {allPeople.map((p) => {
              const linked = p.linked_user_id ? friends.find((f) => f.id === p.linked_user_id) : null
              const photo = linked?.photo_url ?? p.photo_url
              const displayName = linked?.name ?? p.name
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--base)', borderRadius: 9999, padding: '3px 9px 3px 3px' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-serif text-white flex-shrink-0"
                    style={{ width: 20, height: 20, backgroundColor: p.avatar_color ?? 'var(--accent)', fontSize: 9, fontWeight: 300, overflow: 'hidden' }}
                  >
                    {photo
                      ? <img src={photo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : displayName[0]?.toUpperCase()}
                  </div>
                  <span className="font-sans" style={{ fontSize: 13, color: 'var(--text)' }}>{displayName}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
