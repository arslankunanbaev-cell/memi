import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { deleteMoment, saveCapsuleSlot, deleteCapsuleSlot } from '../lib/api'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

function formatFull(iso) {
  const d = new Date(iso)
  const weekday = d.toLocaleDateString('ru-RU', { weekday: 'short' })
  const date = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  return `${weekday} · ${date} · ${time}`
}

export default function MomentDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const moments = useAppStore((s) => s.moments)
  const removeMoment = useAppStore((s) => s.removeMoment)
  const currentUser = useAppStore((s) => s.currentUser)
  const capsule = useAppStore((s) => s.capsule)
  const addToCapsule = useAppStore((s) => s.addToCapsule)
  const removeFromCapsule = useAppStore((s) => s.removeFromCapsule)
  const moment = moments.find((m) => m.id === id)

  const capsuleSlotIndex = capsule.findIndex((s) => s?.id === id)

  const [showMenu, setShowMenu] = useState(false)
  const [showCapsuleSheet, setShowCapsuleSheet] = useState(false)

  const isOwn = !moment?.isShared && moment?.user_id === currentUser?.id

  if (!moment) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ backgroundColor: 'var(--base)' }}>
        <span style={{ fontSize: 36 }}>🌀</span>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>Момент не найден</p>
        <button onClick={() => navigate(-1)} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14 }}>
          ← Назад
        </button>
      </div>
    )
  }

  async function handleRemoveFromCapsule() {
    removeFromCapsule(capsuleSlotIndex)
    try {
      await deleteCapsuleSlot(currentUser.id, capsuleSlotIndex)
    } catch (err) {
      console.error('[Capsule] delete error:', err)
    }
  }

  async function handleDelete() {
    tgHaptic('heavy')
    try {
      await deleteMoment(moment.id)
    } catch { /* ignore if offline */ }
    removeMoment(moment.id)
    navigate('/home', { replace: true })
  }

  const allPeople = [
    ...(moment.people ?? []),
    ...(moment.taggedFriends ?? []).map((u) => ({ ...u, avatar_color: null })),
  ]
  const hasPeople = allPeople.length > 0

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Topbar */}
      <div
        className="flex items-center justify-between px-4 py-3 pt-topbar"
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
        <span className="font-sans font-medium" style={{ fontSize: 16, color: 'var(--text)' }}>Момент</span>
        {isOwn ? (
          <button
            onClick={() => setShowMenu(true)}
            className="flex items-center justify-center transition-opacity active:opacity-60"
            style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none' }}
          >
            <span style={{ fontSize: 18, letterSpacing: '-1px', color: 'var(--text)' }}>•••</span>
          </button>
        ) : (
          <div style={{ width: 36 }} />
        )}
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {/* Photo zone */}
        <div style={{ position: 'relative', height: 360, overflow: 'hidden' }}>
          {moment.photo_url ? (
            <img src={moment.photo_url} alt={moment.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #C8A478, #8C5830)' }} />
          )}
          {/* Gradient overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.72) 0%, transparent 55%)' }} />
          {/* Title */}
          <div style={{ position: 'absolute', bottom: 16, left: 16, right: 16 }}>
            <h1
              className="font-serif uppercase"
              style={{ fontSize: 40, color: '#fff', fontWeight: 600, lineHeight: 1.1, letterSpacing: '1.5px' }}
            >
              {moment.title}
            </h1>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Date */}
          <p className="font-sans" style={{ fontSize: 13, color: 'var(--soft)', letterSpacing: '0.3px' }}>
            {formatFull(moment.created_at)}
          </p>

          {/* Description */}
          {moment.description && (
            <p className="font-sans" style={{ fontSize: 16, color: 'var(--text)', lineHeight: 1.65 }}>
              {moment.description}
            </p>
          )}

          {/* Song block */}
          {moment.song_title && (
            <div
              className="flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface)', borderRadius: 12, padding: '9px 11px' }}
            >
              {moment.song_cover ? (
                <img src={moment.song_cover} alt={moment.song_title} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: 8, backgroundColor: 'var(--base)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 22 }}>🎵</div>
              )}
              <div className="min-w-0">
                <p className="font-sans font-medium" style={{ fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{moment.song_title}</p>
                {moment.song_artist && (
                  <p className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>{moment.song_artist}</p>
                )}
              </div>
            </div>
          )}

          {/* Meta row */}
          {(hasPeople || moment.location || moment.mood) && (
            <div
              className="flex items-center flex-wrap gap-3 pt-3"
              style={{ borderTop: '0.5px solid var(--surface)' }}
            >
              {hasPeople && allPeople.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--surface)', borderRadius: 9999, padding: '3px 9px 3px 3px' }}
                >
                  <div
                    className="flex items-center justify-center rounded-full font-sans font-medium text-white flex-shrink-0"
                    style={{ width: 22, height: 22, backgroundColor: p.avatar_color ?? 'var(--accent)', fontSize: 10, overflow: 'hidden' }}
                  >
                    {p.photo_url
                      ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : p.name[0].toUpperCase()}
                  </div>
                  <span className="font-sans" style={{ fontSize: 14, color: 'var(--text)' }}>{p.name}</span>
                </div>
              ))}
              {moment.location && (
                <span
                  className="font-sans flex items-center gap-1"
                  style={{ fontSize: 13, color: 'var(--mid)', backgroundColor: 'var(--surface)', borderRadius: 9999, padding: '4px 10px' }}
                >
                  📍 {moment.location}
                </span>
              )}
              {moment.mood && (
                <span style={{ fontSize: 16 }}>{moment.mood}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions — only for own moments */}
      {isOwn && <div
        className="flex items-center gap-3 px-4"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', paddingTop: 8 }}
      >
        <button
          onClick={() => navigate(`/story/${moment.id}`)}
          className="flex-1 font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none' }}
        >
          Скачать карточку
        </button>
        <button
          onClick={() => capsuleSlotIndex !== -1 ? handleRemoveFromCapsule() : setShowCapsuleSheet(true)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none', fontSize: 18,
            backgroundColor: capsuleSlotIndex !== -1 ? 'var(--accent)' : 'var(--surface)',
          }}
        >
          💊
        </button>
        <button
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
        </button>
      </div>}

      {/* Three-dot menu — only for own moments */}
      {isOwn && showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)}>
          <div>
            <button
              onClick={() => { setShowMenu(false); navigate(`/edit-moment/${moment.id}`) }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
            >
              <span style={{ fontSize: 18 }}>✏️</span>
              <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>Редактировать</span>
            </button>
            {capsuleSlotIndex !== -1 ? (
              <button
                onClick={() => { setShowMenu(false); handleRemoveFromCapsule() }}
                className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
              >
                <span style={{ fontSize: 18 }}>💊</span>
                <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>Убрать из капсулы</span>
              </button>
            ) : (
              <button
                onClick={() => { setShowMenu(false); setShowCapsuleSheet(true) }}
                className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
              >
                <span style={{ fontSize: 18 }}>💊</span>
                <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>Добавить в капсулу</span>
              </button>
            )}
            <button
              onClick={() => { setShowMenu(false); handleDelete() }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none' }}
            >
              <span style={{ fontSize: 18 }}>🗑️</span>
              <span className="font-sans" style={{ fontSize: 15, color: '#E05252' }}>Удалить</span>
            </button>
          </div>
        </BottomSheet>
      )}

      {/* Capsule slot picker — only for own moments */}
      {isOwn && showCapsuleSheet && (
        <BottomSheet onClose={() => setShowCapsuleSheet(false)} title="Добавить в капсулу">
          <div className="pb-4">
            {[0, 1, 2, 3].map((slotIndex) => {
              const slotMoment = capsule[slotIndex]
              const isOccupied = slotMoment !== null
              return (
                <button
                  key={slotIndex}
                  onClick={async () => {
                    setShowCapsuleSheet(false)
                    addToCapsule(slotIndex, moment)
                    try {
                      await saveCapsuleSlot(currentUser.id, slotIndex, moment.id)
                    } catch (err) {
                      console.error('[Capsule] save error:', err)
                    }
                  }}
                  className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
                  style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
                >
                  <div
                    style={{
                      width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                      background: isOccupied && slotMoment.photo_url
                        ? 'none'
                        : isOccupied
                          ? 'linear-gradient(135deg, #C8A478, #8C5830)'
                          : 'var(--surface)',
                      border: isOccupied ? 'none' : '1.5px dashed rgba(217,139,82,0.4)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    {isOccupied && slotMoment.photo_url && (
                      <img src={slotMoment.photo_url} alt={slotMoment.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
                    <span className="font-sans" style={{ fontSize: 12, color: 'var(--soft)' }}>Заменить</span>
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
