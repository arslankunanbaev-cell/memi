import { useNavigate } from 'react-router-dom'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MomentCard({ moment }) {
  const navigate = useNavigate()
  const hasPeople = moment.people?.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden active:opacity-80 transition-opacity cursor-pointer"
      style={{ backgroundColor: 'var(--surface)' }}
      onClick={() => navigate(`/moment/${moment.id}`)}
    >
      {/* Photo / gradient top */}
      <div style={{ position: 'relative', height: 130, overflow: 'hidden' }}>
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
            background: 'linear-gradient(to top, rgba(23,20,14,0.55) 0%, transparent 55%)',
          }}
        />

        {/* Title pill */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            maxWidth: 'calc(100% - 16px)',
          }}
        >
          <span
            className="font-serif"
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.90)',
              color: 'var(--text)',
              borderRadius: 9999,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 400,
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
      <div style={{ padding: '10px 12px', borderRadius: '0 0 14px 14px' }}>
        {/* Description */}
        {moment.description && (
          <p
            className="font-sans"
            style={{
              fontSize: 11,
              color: 'var(--mid)',
              lineHeight: 1.55,
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

        {/* Song row */}
        {moment.song_title && (
          <div
            className="flex items-center gap-2"
            style={{
              borderTop: '0.5px solid var(--base)',
              paddingTop: 7,
              marginBottom: 7,
            }}
          >
            {moment.song_cover ? (
              <img
                src={moment.song_cover}
                alt="cover"
                style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  backgroundColor: 'var(--surface)',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                }}
              >
                🎵
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p
                className="font-sans"
                style={{
                  fontSize: 11,
                  color: 'var(--text)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {moment.song_title}
              </p>
              {moment.song_artist && (
                <p
                  className="font-sans"
                  style={{ fontSize: 10, color: 'var(--soft)' }}
                >
                  {moment.song_artist}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* People avatars */}
          {hasPeople && (
            <div className="flex -space-x-1">
              {moment.people.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-center rounded-full font-sans font-medium text-white"
                  style={{
                    width: 18,
                    height: 18,
                    backgroundColor: p.avatar_color ?? 'var(--accent)',
                    fontSize: 9,
                    border: '1.5px solid var(--surface)',
                    flexShrink: 0,
                  }}
                  title={p.name}
                >
                  {p.name[0].toUpperCase()}
                </div>
              ))}
            </div>
          )}

          {/* Time */}
          <span className="font-sans" style={{ fontSize: 10, color: 'var(--soft)' }}>
            {formatTime(moment.created_at)}
          </span>

          {/* Location pill */}
          {moment.location && (
            <span
              className="font-sans"
              style={{
                fontSize: 10,
                color: 'var(--mid)',
                backgroundColor: 'var(--base)',
                borderRadius: 9999,
                padding: '2px 7px',
              }}
            >
              📍 {moment.location}
            </span>
          )}

          {/* Mood emoji */}
          {moment.mood && (
            <span style={{ fontSize: 13 }}>{moment.mood}</span>
          )}
        </div>
      </div>
    </div>
  )
}
