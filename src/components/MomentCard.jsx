import { useNavigate } from 'react-router-dom'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MomentCard({ moment }) {
  const navigate = useNavigate()
  const hasPeople = moment.people?.length > 0

  return (
    <div
      className="rounded-2xl overflow-hidden active:opacity-80 transition-opacity cursor-pointer flex"
      style={{ backgroundColor: 'var(--surface)', boxShadow: '0 2px 14px rgba(23,20,14,0.10)', minHeight: 120 }}
      onClick={() => navigate(`/moment/${moment.id}`)}
    >
      {/* Left: Photo */}
      <div style={{ position: 'relative', width: 120, flexShrink: 0 }}>
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
        {/* subtle right-side fade to blend into card body */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, transparent 60%, rgba(237,230,220,0.45) 100%)',
          }}
        />
      </div>

      {/* Right: Content */}
      <div
        style={{
          flex: 1,
          padding: '10px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 0,
        }}
      >
        {/* Title pill */}
        <div>
          <span
            className="font-serif"
            style={{
              display: 'inline-block',
              backgroundColor: 'rgba(255,255,255,0.90)',
              color: 'var(--text)',
              borderRadius: 9999,
              padding: '5px 14px',
              fontSize: 14,
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

        {/* Description */}
        {moment.description && (
          <p
            className="font-sans"
            style={{
              fontSize: 12,
              color: 'var(--mid)',
              lineHeight: 1.5,
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Song row */}
        {moment.song_title && (
          <div className="flex items-center gap-2">
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
                  fontSize: 12,
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
                <p className="font-sans" style={{ fontSize: 11, color: 'var(--soft)', margin: 0 }}>
                  {moment.song_artist}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-2 flex-wrap">
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

          <span className="font-sans" style={{ fontSize: 11, color: 'var(--soft)' }}>
            {formatTime(moment.created_at)}
          </span>

          {moment.location && (
            <span
              className="font-sans"
              style={{
                fontSize: 11,
                color: 'var(--mid)',
                backgroundColor: 'var(--base)',
                borderRadius: 9999,
                padding: '2px 7px',
              }}
            >
              📍 {moment.location}
            </span>
          )}

          {moment.mood && (
            <span style={{ fontSize: 13 }}>{moment.mood}</span>
          )}
        </div>
      </div>
    </div>
  )
}
