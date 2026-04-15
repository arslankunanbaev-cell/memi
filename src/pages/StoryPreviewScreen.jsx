import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { tg } from '../lib/telegram'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Polaroid template ─────────────────────────────────────────────────────────

function PolaroidCard({ moment }) {
  const hasPeople = moment.people?.length > 0

  return (
    <div
      style={{
        backgroundColor: '#F7F4F0',
        borderRadius: 4,
        padding: '18px 18px 22px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        height: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: memi + date */}
      <div className="flex items-center justify-between">
        <span
          className="font-serif"
          style={{ fontSize: 15, color: 'var(--text)', fontWeight: 300, letterSpacing: '2px' }}
        >
          memi
        </span>
        <span
          className="font-sans"
          style={{ fontSize: 9, color: 'var(--soft)', letterSpacing: '0.3px' }}
        >
          {formatDate(moment.created_at)}
        </span>
      </div>

      {/* Photo in white frame */}
      <div
        style={{
          transform: 'rotate(-1.5deg)',
          backgroundColor: '#fff',
          padding: '8px 8px 32px',
          boxShadow: '0 2px 12px rgba(23,20,14,0.10)',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Photo or gradient */}
        <div
          style={{
            width: '100%',
            paddingBottom: '75%',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {moment.photo_url ? (
            <img
              src={moment.photo_url}
              alt={moment.title}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(135deg, #E8D5C0, #C8A880)',
              }}
            />
          )}
        </div>

        {/* Mood emoji */}
        {moment.mood && (
          <span
            style={{
              position: 'absolute', top: 14, right: 14, fontSize: 20,
              filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.2))',
            }}
          >
            {moment.mood}
          </span>
        )}

        {/* Tag pill bottom-right */}
        <div
          style={{
            position: 'absolute', bottom: 8, right: 8,
          }}
        >
          <span
            className="font-sans"
            style={{
              backgroundColor: 'var(--accent)', color: '#fff',
              borderRadius: 9999, padding: '2px 8px',
              fontSize: 8, fontWeight: 500, letterSpacing: '0.3px',
            }}
          >
            момент
          </span>
        </div>
      </div>

      {/* Title */}
      <h2
        className="font-serif"
        style={{
          fontSize: 20, color: 'var(--text)', fontWeight: 400,
          lineHeight: 1.2, margin: 0,
          overflow: 'hidden', display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}
      >
        {moment.title}
      </h2>

      {/* Description */}
      {moment.description && (
        <p
          className="font-sans"
          style={{
            fontSize: 10, color: 'var(--mid)', lineHeight: 1.55, margin: 0,
            overflow: 'hidden', display: '-webkit-box',
            WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
          }}
        >
          {moment.description}
        </p>
      )}

      {/* Divider */}
      <div style={{ height: '0.5px', backgroundColor: 'var(--surface)', flexShrink: 0 }} />

      {/* Song */}
      {moment.song_title && (
        <div className="flex items-center gap-2">
          {moment.song_cover ? (
            <img
              src={moment.song_cover}
              alt={moment.song_title}
              style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }}
            />
          ) : (
            <span style={{ fontSize: 14, flexShrink: 0 }}>🎵</span>
          )}
          <div className="min-w-0">
            <p
              className="font-sans font-medium"
              style={{ fontSize: 9, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
            >
              {moment.song_title}
            </p>
            {moment.song_artist && (
              <p className="font-sans" style={{ fontSize: 8, color: 'var(--mid)' }}>
                {moment.song_artist}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Meta: people + location */}
      {(hasPeople || moment.location) && (
        <div className="flex items-center gap-2 flex-wrap">
          {hasPeople && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {moment.people.slice(0, 3).map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-center rounded-full text-white font-sans font-medium"
                    style={{
                      width: 14, height: 14,
                      backgroundColor: p.avatar_color ?? 'var(--accent)',
                      fontSize: 7, border: '1px solid #F7F4F0', flexShrink: 0,
                    }}
                  >
                    {p.name[0].toUpperCase()}
                  </div>
                ))}
              </div>
              <span className="font-sans" style={{ fontSize: 8, color: 'var(--mid)' }}>
                {moment.people.map((p) => p.name).join(', ')}
              </span>
            </div>
          )}
          {moment.location && (
            <span
              className="font-sans"
              style={{
                fontSize: 8, color: 'var(--mid)',
                backgroundColor: 'var(--surface)',
                borderRadius: 9999, padding: '2px 6px',
              }}
            >
              📍 {moment.location}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Template thumbnails ────────────────────────────────────────────────────────

const TEMPLATES = [
  { id: 'polaroid', label: 'Поляроид' },
  { id: 'minimal',  label: 'Минимал' },
  { id: 'dark',     label: 'Тёмный' },
]

function TemplateThumbnail({ template, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 flex-shrink-0 transition-opacity active:opacity-70"
      style={{ background: 'none', border: 'none' }}
    >
      <div
        style={{
          width: 56,
          aspectRatio: '9/16',
          borderRadius: 8,
          border: active ? '2px solid var(--accent)' : '2px solid var(--surface)',
          backgroundColor: template.id === 'dark' ? '#17140E' : 'var(--surface)',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          className="font-serif"
          style={{
            fontSize: 9,
            color: template.id === 'dark' ? 'rgba(255,255,255,0.4)' : 'var(--soft)',
            letterSpacing: '1px',
          }}
        >
          memi
        </span>
      </div>
      <span
        className="font-sans"
        style={{ fontSize: 9, color: active ? 'var(--accent)' : 'var(--mid)' }}
      >
        {template.label}
      </span>
    </button>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StoryPreviewScreen() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((s) => s.moments)
  const moment  = moments.find((m) => m.id === id)

  const [activeTemplate, setActiveTemplate] = useState('polaroid')

  function handleGetInTelegram() {
    alert('Бот пришлёт карточку в чат')
    tg?.close()
  }

  if (!moment) {
    return (
      <div
        className="flex flex-col items-center justify-center h-full gap-4"
        style={{ backgroundColor: 'var(--base)' }}
      >
        <span style={{ fontSize: 36 }}>🌀</span>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>Момент не найден</p>
        <button
          onClick={() => navigate(-1)}
          style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14 }}
        >
          ← Назад
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="font-sans font-medium" style={{ fontSize: 15, color: 'var(--text)' }}>Сторис</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Preview */}
      <div className="flex-1 flex flex-col items-center justify-center overflow-hidden px-6 py-2">
        <div
          style={{
            width: '100%',
            maxWidth: 300,
            aspectRatio: '9/16',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 8px 40px rgba(23,20,14,0.15)',
          }}
        >
          <PolaroidCard moment={moment} />
        </div>
      </div>

      {/* Template selector */}
      <div className="flex gap-4 px-5 py-3 overflow-x-auto justify-center" style={{ scrollbarWidth: 'none' }}>
        {TEMPLATES.map((t) => (
          <TemplateThumbnail
            key={t.id}
            template={t}
            active={activeTemplate === t.id}
            onClick={() => setActiveTemplate(t.id)}
          />
        ))}
      </div>

      {/* Action */}
      <div
        className="px-5"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))', paddingTop: 8 }}
      >
        <button
          onClick={handleGetInTelegram}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)', color: '#fff',
            borderRadius: 9999, padding: '14px 0',
            fontSize: 15, border: 'none',
          }}
        >
          Получить в Telegram
        </button>
      </div>
    </div>
  )
}
