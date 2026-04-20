import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

function MusicBlock({ title, artist }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--card-alt)', borderRadius: 12,
        padding: '10px 12px', marginTop: 10,
      }}
    >
      <div
        style={{
          width: 32, height: 32, borderRadius: 8, flexShrink: 0,
          background: 'var(--accent-light)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2"/>
          <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2"/>
        </svg>
      </div>
      <div style={{ minWidth: 0 }}>
        <p className="font-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </p>
        {artist && (
          <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 1 }}>{artist}</p>
        )}
      </div>
    </div>
  )
}

export default function MomentCard({ moment }) {
  const navigate = useNavigate()
  const currentUser        = useAppStore((s) => s.currentUser)
  const friends            = useAppStore((s) => s.friends)

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
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{
        backgroundColor: 'var(--card)',
        boxShadow: '0 2px 12px rgba(80,50,30,0.10)',
      }}
      onClick={() => navigate(`/moment/${moment.id}`)}
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

      {/* Photo */}
      <div style={{ position: 'relative', paddingBottom: '75%', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          {moment.photo_url ? (
            <img
              src={moment.photo_url}
              alt={moment.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #E8D5C0, #C8A880)' }} />
          )}
        </div>

        {/* Bottom gradient */}
        <div
          style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)',
            pointerEvents: 'none',
          }}
        />

        {/* TOP-LEFT: location — frosted glass chip */}
        {moment.location && (
          <div style={{ position: 'absolute', top: 10, left: 10 }}>
            <span
              className="font-sans"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: 'rgba(255,255,255,0.88)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                borderRadius: 20, padding: '4px 10px',
                fontSize: 12, fontWeight: 500, color: 'var(--text)',
                boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
                whiteSpace: 'nowrap',
              }}
            >
              📍 {moment.location}
            </span>
          </div>
        )}

        {/* BOTTOM-RIGHT: time + mood */}
        <div style={{ position: 'absolute', bottom: 10, right: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          {moment.mood && <span style={{ fontSize: 16 }}>{moment.mood}</span>}
          <span
            className="font-sans"
            style={{
              background: 'rgba(0,0,0,0.45)', borderRadius: 8,
              padding: '3px 8px', fontSize: 12, fontWeight: 600, color: '#fff',
            }}
          >
            {formatTime(moment.created_at)}
          </span>
        </div>

        {/* BOTTOM-LEFT: title pill */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, maxWidth: 'calc(100% - 90px)' }}>
          <span
            className="font-serif"
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.90)',
              color: 'var(--text)',
              borderRadius: 9999,
              padding: '5px 14px',
              fontSize: 15, fontWeight: 600, letterSpacing: '0.2px',
              maxWidth: '100%',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {moment.title}
          </span>
        </div>
      </div>

      {/* Body */}
      {(moment.description || moment.song_title || hasPeople) && (
        <div style={{ padding: '12px 14px 14px' }}>
          {/* Description */}
          {moment.description && (
            <p
              className="font-sans"
              style={{
                fontSize: 15, color: 'var(--text)', lineHeight: 1.55,
                display: '-webkit-box',
                WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                marginBottom: (moment.song_title || hasPeople) ? 0 : 0,
              }}
            >
              {moment.description}
            </p>
          )}

          {/* Music block */}
          {moment.song_title && (
            <MusicBlock title={moment.song_title} artist={moment.song_artist} />
          )}

          {/* People chips */}
          {hasPeople && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
              {allPeople.map((p) => {
                const linked = p.linked_user_id ? friends.find((f) => f.id === p.linked_user_id) : null
                const photo = linked?.photo_url ?? p.photo_url
                const displayName = linked?.name ?? p.name
                return (
                  <div key={p.id} className="flex items-center gap-1.5">
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0"
                      style={{
                        width: 22, height: 22,
                        backgroundColor: p.avatar_color ?? 'var(--accent)',
                        border: '1.5px solid rgba(255,255,255,0.6)',
                        overflow: 'hidden',
                      }}
                    >
                      {photo
                        ? <img src={photo} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="font-sans" style={{ fontSize: 9, fontWeight: 600, color: '#fff' }}>{displayName[0]?.toUpperCase()}</span>
                      }
                    </div>
                    <span className="font-sans" style={{ fontSize: 13, color: 'var(--mid)', fontWeight: 500 }}>{displayName}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
