import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { saveMoment } from '../lib/api'
import SongSearchSheet from '../components/SongSearchSheet'

const EMOJIS = ['✨', '❄️', '🌅', '🌿', '🎵', '📖', '☕', '🌙', '💫', '🌊', '🍃', '🕯️']
const MOODS  = ['😊', '🥹', '😌', '🤩', '😔', '🥰', '😤', '🌀', '🫶', '💭']

export default function AddMoment({ onClose }) {
  const navigate = useNavigate()
  const currentUser  = useAppStore((s) => s.currentUser)
  const people       = useAppStore((s) => s.people)
  const addMoment    = useAppStore((s) => s.addMoment)
  const addRecentLocation = useAppStore((s) => s.addRecentLocation)

  // Form state
  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [emoji, setEmoji]       = useState('✨')
  const [mood, setMood]         = useState('')
  const [location, setLocation] = useState('')
  const [selectedPeople, setSelectedPeople] = useState([])

  // Song
  const [song, setSong]           = useState(null) // { name, artist, cover }
  const [showSongSheet, setShowSongSheet] = useState(false)

  // Photo
  const photoRef = useRef(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  // Saving
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function togglePerson(id) {
    setSelectedPeople((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    )
  }

  async function handleSave() {
    if (!title.trim() || saving) return
    tgHaptic('medium')
    setSaving(true)
    setError(null)
    try {
      const fields = {
        title: title.trim(),
        description: body.trim() || null,
        mood: mood || null,
        location: location.trim() || null,
        song_title:  song?.name   ?? null,
        song_artist: song?.artist ?? null,
        song_cover:  song?.cover  ?? null,
      }
      if (location.trim()) addRecentLocation(location.trim())

      console.log('[AddMoment] currentUser at save time:', currentUser)
      console.log('[AddMoment] fields:', fields)

      const saved = await saveMoment({
        userId: currentUser?.id ?? 'local',
        fields,
        photoFile,
        peopleIds: selectedPeople,
      })

      addMoment({ ...saved, people: people.filter((p) => selectedPeople.includes(p.id)) })
      navigate('/moment-saved', { state: { moment: saved }, replace: false })
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
      >
        <button
          onClick={onClose}
          className="font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
        <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text)', fontWeight: 400 }}>
          Новый момент
        </h2>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="font-sans font-medium transition-opacity active:opacity-60"
          style={{
            color: title.trim() && !saving ? 'var(--accent)' : 'var(--soft)',
            fontSize: 14,
            background: 'none',
            border: 'none',
          }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10 flex flex-col gap-6">
        {/* Error */}
        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>
            {error}
          </p>
        )}

        {/* Photo */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Фото
          </p>
          <button
            onClick={() => photoRef.current?.click()}
            className="w-full transition-opacity active:opacity-70"
            style={{
              height: photoPreview ? 160 : 80,
              borderRadius: 14,
              border: photoPreview ? 'none' : '2px dashed var(--soft)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--surface)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 28 }}>📷</span>
            )}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Mood emoji picker */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Настроение
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? '' : m)}
                className="transition-transform active:scale-90"
                style={{
                  width: 40, height: 40, borderRadius: 10, fontSize: 20,
                  backgroundColor: mood === m ? 'var(--surface)' : 'transparent',
                  border: mood === m ? '2px solid var(--accent)' : '2px solid transparent',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Заголовок
          </p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название момента..."
            maxLength={80}
            className="w-full font-serif outline-none bg-transparent"
            style={{
              fontSize: 22, color: 'var(--text)',
              borderBottom: '1px solid var(--surface)',
              paddingBottom: 8, fontWeight: 300,
            }}
          />
        </div>

        {/* Description */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Описание
          </p>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Опиши этот момент..."
            rows={4}
            maxLength={1000}
            className="w-full font-sans outline-none bg-transparent resize-none"
            style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6 }}
          />
        </div>

        {/* Location */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Место
          </p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Где это было?"
            maxLength={80}
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--surface)', borderRadius: 10,
              padding: '10px 12px', fontSize: 14, color: 'var(--text)', border: 'none',
            }}
          />
        </div>

        {/* Song */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 10, color: 'var(--soft)' }}>
            Трек
          </p>
          {song ? (
            <div
              className="flex items-center gap-3"
              style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '10px 12px' }}
            >
              {song.cover ? (
                <img src={song.cover} alt={song.name} style={{ width: 34, height: 34, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <span style={{ fontSize: 22 }}>🎵</span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-sans" style={{ fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.name}
                </p>
                <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>{song.artist}</p>
              </div>
              <button
                onClick={() => setSong(null)}
                style={{ color: 'var(--soft)', background: 'none', border: 'none', fontSize: 18, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSongSheet(true)}
              className="w-full font-sans transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--surface)', borderRadius: 10,
                padding: '10px 12px', fontSize: 14, color: 'var(--mid)',
                border: 'none', textAlign: 'left',
              }}
            >
              🎵 &nbsp;Найти трек...
            </button>
          )}
        </div>

        {/* People */}
        {people.length > 0 && (
          <div>
            <p className="font-sans uppercase tracking-widest mb-3" style={{ fontSize: 10, color: 'var(--soft)' }}>
              С кем
            </p>
            <div className="flex flex-wrap gap-2">
              {people.map((p) => {
                const active = selectedPeople.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePerson(p.id)}
                    className="flex items-center gap-2 transition-opacity active:opacity-70"
                    style={{
                      borderRadius: 9999,
                      padding: '6px 12px 6px 8px',
                      backgroundColor: active ? 'var(--accent)' : 'var(--surface)',
                      border: 'none',
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full font-sans font-medium"
                      style={{
                        width: 22, height: 22,
                        backgroundColor: active ? 'rgba(255,255,255,0.3)' : (p.avatar_color ?? 'var(--accent)'),
                        color: '#fff', fontSize: 10, flexShrink: 0,
                      }}
                    >
                      {p.name[0].toUpperCase()}
                    </div>
                    <span className="font-sans" style={{ fontSize: 13, color: active ? '#fff' : 'var(--text)' }}>
                      {p.name}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Song search bottom sheet */}
      {showSongSheet && (
        <SongSearchSheet
          onClose={() => setShowSongSheet(false)}
          onSelect={(track) => setSong(track)}
        />
      )}
    </div>
  )
}
