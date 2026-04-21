import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

function formatTime(iso) {
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
        border: '2px solid rgba(255,255,255,0.65)',
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

function MusicBlock({ title, artist, cover }) {
  return (
    <div
      className="flex items-center gap-3"
      style={{
        marginTop: 12,
        backgroundColor: 'var(--card-alt)',
        borderRadius: 14,
        padding: '12px 14px',
      }}
    >
      {cover ? (
        <img
          src={cover}
          alt={title}
          style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
        />
      ) : (
        <div
          className="flex items-center justify-center"
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: 'var(--accent-light)',
            flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2" />
            <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2" />
          </svg>
        </div>
      )}

      <div className="min-w-0">
        <p
          className="font-sans"
          style={{
            color: 'var(--text)',
            fontSize: 14,
            fontWeight: 600,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
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

function PhotoChip({ children, center = false }) {
  return (
    <div
      className="font-sans"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'flex-start',
        gap: 5,
        maxWidth: '100%',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        borderRadius: 999,
        padding: '5px 12px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
        color: 'var(--text)',
        fontSize: 13,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {children}
    </div>
  )
}

export default function MomentCard({ moment }) {
  const navigate = useNavigate()
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
    })),
    ...(moment.taggedFriends ?? []).map((friend) => ({
      id: `friend-${friend.id}`,
      name: friend.name,
      photo_url: friend.photo_url ?? null,
      avatar_color: 'var(--accent)',
    })),
  ]

  return (
    <article
      className="overflow-hidden rounded-[20px] cursor-pointer"
      style={{
        backgroundColor: '#FFFDFB',
        boxShadow: 'var(--shadow-card)',
      }}
      onClick={() => navigate(`/moment/${moment.id}`)}
    >
      {isShared && author && (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid var(--divider)' }}
        >
          <Avatar name={author.name} photoUrl={author.photo_url} />
          <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, fontWeight: 500 }}>
            {author.name}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', aspectRatio: '4 / 3', overflow: 'hidden' }}>
        {moment.photo_url ? (
          <img
            src={moment.photo_url}
            alt={moment.title || 'Момент'}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(160deg, #7C5436 0%, #C98957 48%, #F0D0A1 100%)' }} />
        )}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom, transparent 42%, rgba(0,0,0,0.58) 100%)',
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
          <div style={{ position: 'absolute', left: 12, bottom: 12, maxWidth: 'calc(100% - 100px)' }}>
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
            className="font-sans"
            style={{
              background: 'rgba(0,0,0,0.45)',
              borderRadius: 10,
              padding: '3px 8px',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {formatTime(moment.created_at)}
          </div>
        </div>
      </div>

      {(moment.description || moment.song_title || participants.length > 0) && (
        <div style={{ padding: '14px 16px 16px' }}>
          {moment.description && (
            <p
              className="font-sans"
              style={{
                color: 'var(--text)',
                fontSize: 15,
                lineHeight: 1.55,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {moment.description}
            </p>
          )}

          {moment.song_title && (
            <MusicBlock
              title={moment.song_title}
              artist={moment.song_artist}
              cover={moment.song_cover}
            />
          )}

          {participants.length > 0 && (
            <div className="flex flex-wrap gap-2" style={{ marginTop: 12 }}>
              {participants.map((person) => (
                <div key={person.id} className="flex items-center gap-2">
                  <Avatar person={person} />
                  <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, fontWeight: 500 }}>
                    {person.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </article>
  )
}
