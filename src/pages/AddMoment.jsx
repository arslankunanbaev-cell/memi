import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tgHaptic } from '../lib/telegram'
import { useAppStore } from '../store/useAppStore'
import { saveMoment, createPerson, addMomentParticipants } from '../lib/api'
import SongSearchSheet from '../components/SongSearchSheet'
import BottomSheet from '../components/BottomSheet'

const MOODS  = ['😊', '🥹', '😌', '🤩', '😔', '🥰', '😤', '🌀', '🫶', '💭']
const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

function SectionLabel({ children }) {
  return (
    <p className="font-sans uppercase" style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--soft)', marginBottom: 10 }}>
      {children}
    </p>
  )
}

function FormCard({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'var(--card)',
      borderRadius: 16,
      padding: '14px 16px',
      boxShadow: '0 2px 12px rgba(80,50,30,0.08)',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ── Add person mini sheet ─────────────────────────────────────────────────────
function AddPersonMiniSheet({ currentUserId, onClose, onCreated }) {
  const [name, setName]       = useState('')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)
  const [color]  = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef  = useRef(null)
  const [photoFile, setPhotoFile]         = useState(null)
  const [photoPreview, setPhotoPreview]   = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleAdd() {
    if (!name.trim() || saving) return
    tgHaptic('medium')
    setSaving(true)
    setError(null)
    try {
      const saved = await createPerson({
        userId:      currentUserId,
        name:        name.trim(),
        avatarColor: color,
        photoFile:   photoFile ?? null,
      })
      onCreated(saved)
      onClose()
    } catch (err) {
      console.error('[AddPersonMini] ❌', err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Новый человек">
      <div className="px-4 flex flex-col gap-4 pb-5">
        <div className="flex justify-center pt-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
              border: photoPreview ? 'none' : '2px dashed var(--accent)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--card)',
            }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 20 }}>📷</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как зовут?"
          autoFocus
          className="w-full font-sans outline-none"
          style={{
            backgroundColor: 'var(--card)', borderRadius: 12,
            padding: '12px 14px', fontSize: 15, color: 'var(--text)',
            border: name.trim() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            boxShadow: '0 2px 8px rgba(80,50,30,0.08)',
          }}
        />

        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>
        )}

        <button
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--card)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none',
          }}
        >
          {saving ? 'Сохранение...' : 'Добавить и выбрать'}
        </button>

        <button
          onClick={onClose}
          className="font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AddMoment({ onClose, afterSave, initialPeopleIds }) {
  const navigate = useNavigate()
  const currentUser  = useAppStore((s) => s.currentUser)
  const people       = useAppStore((s) => s.people)
  const friends      = useAppStore((s) => s.friends)
  const addMoment    = useAppStore((s) => s.addMoment)
  const addPerson    = useAppStore((s) => s.addPerson)
  const addRecentLocation = useAppStore((s) => s.addRecentLocation)

  const [title, setTitle]       = useState('')
  const [body, setBody]         = useState('')
  const [mood, setMood]         = useState('')
  const [location, setLocation] = useState('')
  const [selectedPeople, setSelectedPeople] = useState(initialPeopleIds ?? [])
  const [momentDate, setMomentDate] = useState(() => new Date().toISOString().slice(0, 10))

  const [song, setSong]           = useState(null)
  const [showSongSheet, setShowSongSheet] = useState(false)

  const photoRef = useRef(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const [visibility, setVisibility] = useState('private')
  const [taggedFriends, setTaggedFriends] = useState([])
  const [showAddPerson, setShowAddPerson] = useState(false)

  function handlePersonCreated(person) {
    addPerson(person)
    setSelectedPeople((prev) => [...prev, person.id])
  }

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
      console.log('[AddMoment] ── handleSave called ──')
      console.log('[AddMoment] currentUser:', JSON.stringify(currentUser))

      if (!currentUser) throw new Error('currentUser не загружен.')
      if (!currentUser.id) throw new Error(`currentUser.id отсутствует: ${JSON.stringify(currentUser)}`)

      const fields = {
        title: title.trim(),
        description: body.trim() || null,
        mood: mood || null,
        location: location.trim() || null,
        visibility,
        song_title:  song?.name   ?? null,
        song_artist: song?.artist ?? null,
        song_cover:  song?.cover  ?? null,
        created_at: (() => {
          const now = new Date()
          const [y, m, d] = momentDate.split('-').map(Number)
          return new Date(y, m - 1, d, now.getHours(), now.getMinutes()).toISOString()
        })(),
      }
      if (location.trim()) addRecentLocation(location.trim())

      const saved = await saveMoment({
        userId: currentUser?.id ?? 'local',
        fields,
        photoFile,
        peopleIds: selectedPeople,
      })

      if (taggedFriends.length > 0) {
        try {
          await addMomentParticipants(saved.id, taggedFriends)
        } catch (participantErr) {
          console.warn('[AddMoment] ⚠ participant insert failed (non-fatal):', participantErr?.message)
        }
      }

      const full = { ...saved, people: people.filter((p) => selectedPeople.includes(p.id)) }
      addMoment(full)

      if (afterSave) {
        afterSave(full)
      } else {
        navigate('/moment-saved', { state: { moment: saved }, replace: false })
      }
    } catch (err) {
      console.error(err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--base)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 pt-topbar">
        <button
          onClick={onClose}
          className="font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 15, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
        <h2 className="font-serif" style={{ fontSize: 20, color: 'var(--text)', fontWeight: 400 }}>
          Новый момент
        </h2>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="font-sans font-semibold transition-opacity active:opacity-60"
          style={{
            color: title.trim() && !saving ? 'var(--accent)' : 'var(--soft)',
            fontSize: 15, background: 'none', border: 'none',
          }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-5">
        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>
        )}

        {/* Photo */}
        <div>
          <SectionLabel>Фото</SectionLabel>
          <button
            onClick={() => photoRef.current?.click()}
            className="w-full transition-opacity active:opacity-70"
            style={{
              height: photoPreview ? 200 : 90,
              borderRadius: 16,
              border: photoPreview ? 'none' : '1.5px dashed rgba(201,122,58,0.5)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--card)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: photoPreview ? 'none' : '0 2px 12px rgba(80,50,30,0.08)',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div className="flex flex-col items-center gap-2">
                <span style={{ fontSize: 28 }}>📷</span>
                <span className="font-sans" style={{ fontSize: 13, color: 'var(--soft)' }}>Добавить фото</span>
              </div>
            )}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Title + Description */}
        <FormCard>
          <SectionLabel>Заголовок</SectionLabel>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Название момента..."
            maxLength={80}
            className="w-full font-serif outline-none bg-transparent"
            style={{
              fontSize: 22, color: 'var(--text)',
              borderBottom: '1px solid rgba(180,150,120,0.2)',
              paddingBottom: 10, marginBottom: 16, fontWeight: 300,
            }}
          />
          <SectionLabel>Описание</SectionLabel>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Опиши этот момент..."
            rows={3}
            maxLength={1000}
            className="w-full font-sans outline-none bg-transparent resize-none"
            style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6 }}
          />
        </FormCard>

        {/* Mood */}
        <div>
          <SectionLabel>Настроение</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? '' : m)}
                className="transition-transform active:scale-90"
                style={{
                  width: 42, height: 42, borderRadius: 12, fontSize: 20,
                  backgroundColor: mood === m ? 'var(--card)' : 'transparent',
                  border: mood === m ? '2px solid var(--accent)' : '2px solid rgba(180,150,120,0.2)',
                  boxShadow: mood === m ? '0 2px 8px rgba(80,50,30,0.12)' : 'none',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Location + Date */}
        <FormCard>
          <SectionLabel>Место</SectionLabel>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Где это было?"
            maxLength={80}
            className="w-full font-sans outline-none bg-transparent"
            style={{
              fontSize: 15, color: 'var(--text)',
              borderBottom: '1px solid rgba(180,150,120,0.2)',
              paddingBottom: 10, marginBottom: 16,
            }}
          />
          <SectionLabel>Дата</SectionLabel>
          <input
            type="date"
            value={momentDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && setMomentDate(e.target.value)}
            className="w-full font-sans outline-none bg-transparent"
            style={{
              fontSize: 15, color: 'var(--text)',
              appearance: 'none', WebkitAppearance: 'none',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%237A6A5A' stroke-width='2' stroke-linecap='round' xmlns='http://www.w3.org/2000/svg'%3E%3Crect x='3' y='4' width='18' height='18' rx='2'/%3E%3Cpath d='M16 2v4M8 2v4M3 10h18'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0 center',
              paddingRight: 28,
            }}
          />
        </FormCard>

        {/* Song */}
        <div>
          <SectionLabel>Трек</SectionLabel>
          {song ? (
            <div
              className="flex items-center gap-3"
              style={{ backgroundColor: 'var(--card)', borderRadius: 16, padding: '12px 14px', boxShadow: '0 2px 12px rgba(80,50,30,0.08)' }}
            >
              {song.cover ? (
                <img src={song.cover} alt={song.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{
                  width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                  backgroundColor: 'var(--accent-light)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2"/>
                    <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2"/>
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-sans" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {song.name}
                </p>
                <p className="font-sans" style={{ fontSize: 12, color: 'var(--mid)', marginTop: 1 }}>{song.artist}</p>
              </div>
              <button
                onClick={() => setSong(null)}
                style={{ color: 'var(--soft)', background: 'none', border: 'none', fontSize: 20, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSongSheet(true)}
              className="w-full font-sans transition-opacity active:opacity-70 flex items-center gap-3"
              style={{
                backgroundColor: 'var(--card)', borderRadius: 16,
                padding: '12px 14px', fontSize: 15, color: 'var(--mid)',
                border: 'none', textAlign: 'left',
                boxShadow: '0 2px 12px rgba(80,50,30,0.08)',
              }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                backgroundColor: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M9 18V5l12-2v13" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="6" cy="18" r="3" stroke="var(--accent)" strokeWidth="2"/>
                  <circle cx="18" cy="16" r="3" stroke="var(--accent)" strokeWidth="2"/>
                </svg>
              </div>
              Найти трек...
            </button>
          )}
        </div>

        {/* People + unlinked friends — single "С кем" section */}
        {(() => {
          const linkedUserIds = new Set(people.map((p) => p.linked_user_id).filter(Boolean))
          const unlinkedFriends = friends.filter((f) => !linkedUserIds.has(f.id))
          return (
            <div>
              <SectionLabel>С кем</SectionLabel>
              <div className="flex flex-wrap gap-2">
                {people.map((p) => {
                  const active = selectedPeople.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePerson(p.id)}
                      className="flex items-center gap-2 transition-all active:opacity-70"
                      style={{
                        borderRadius: 9999,
                        padding: '7px 14px 7px 9px',
                        backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(80,50,30,0.08)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full font-sans font-medium overflow-hidden"
                        style={{
                          width: 24, height: 24,
                          backgroundColor: active ? 'rgba(255,255,255,0.3)' : (p.avatar_color ?? 'var(--accent)'),
                          color: '#fff', fontSize: 10, flexShrink: 0,
                          border: active ? 'none' : '2px solid rgba(255,255,255,0.6)',
                        }}
                      >
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : p.name[0].toUpperCase()}
                      </div>
                      <span className="font-sans" style={{ fontSize: 14, color: active ? '#fff' : 'var(--text)', fontWeight: active ? 500 : 400 }}>
                        {p.name}
                      </span>
                    </button>
                  )
                })}

                {unlinkedFriends.map((f) => {
                  const active = taggedFriends.includes(f.id)
                  return (
                    <button
                      key={f.id}
                      onClick={() =>
                        setTaggedFriends((prev) =>
                          prev.includes(f.id) ? prev.filter((id) => id !== f.id) : [...prev, f.id]
                        )
                      }
                      className="flex items-center gap-2 transition-all active:opacity-70"
                      style={{
                        borderRadius: 9999,
                        padding: '7px 14px 7px 9px',
                        backgroundColor: active ? 'var(--accent)' : 'var(--card)',
                        border: 'none',
                        boxShadow: '0 2px 8px rgba(80,50,30,0.08)',
                      }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full font-sans font-medium overflow-hidden"
                        style={{
                          width: 24, height: 24,
                          backgroundColor: active ? 'rgba(255,255,255,0.3)' : 'var(--accent)',
                          color: '#fff', fontSize: 10, flexShrink: 0,
                          border: '2px solid rgba(255,255,255,0.6)',
                        }}
                      >
                        {f.photo_url
                          ? <img src={f.photo_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : f.name?.[0]?.toUpperCase() ?? '?'}
                      </div>
                      <span className="font-sans" style={{ fontSize: 14, color: active ? '#fff' : 'var(--text)', fontWeight: active ? 500 : 400 }}>
                        {f.name}
                      </span>
                    </button>
                  )
                })}

                <button
                  onClick={() => setShowAddPerson(true)}
                  className="flex items-center gap-2 transition-opacity active:opacity-70"
                  style={{
                    borderRadius: 9999,
                    padding: '7px 14px 7px 9px',
                    backgroundColor: 'var(--card)',
                    border: '1.5px dashed rgba(201,122,58,0.4)',
                    boxShadow: '0 2px 8px rgba(80,50,30,0.06)',
                  }}
                >
                  <div
                    className="flex items-center justify-center rounded-full"
                    style={{
                      width: 24, height: 24,
                      backgroundColor: 'rgba(201,122,58,0.12)',
                      color: 'var(--accent)', fontSize: 16, flexShrink: 0, lineHeight: 1,
                    }}
                  >
                    +
                  </div>
                  <span className="font-sans" style={{ fontSize: 14, color: 'var(--accent)' }}>
                    {people.length === 0 && unlinkedFriends.length === 0 ? 'Добавить человека' : 'Новый'}
                  </span>
                </button>
              </div>
            </div>
          )
        })()}

        {/* Visibility */}
        <div>
          <SectionLabel>Видимость</SectionLabel>
          <div className="flex gap-2">
            {[{ value: 'private', label: '🔒 Только я' }, { value: 'public', label: '🌐 Открыто' }].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className="font-sans font-medium transition-opacity active:opacity-70"
                style={{
                  padding: '9px 18px', borderRadius: 9999, fontSize: 13, border: 'none',
                  backgroundColor: visibility === value ? 'var(--accent)' : 'var(--card)',
                  color: visibility === value ? '#fff' : 'var(--mid)',
                  boxShadow: visibility === value ? 'none' : '0 2px 8px rgba(80,50,30,0.08)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showSongSheet && (
        <SongSearchSheet
          onClose={() => setShowSongSheet(false)}
          onSelect={(track) => setSong(track)}
        />
      )}

      {showAddPerson && (
        <AddPersonMiniSheet
          currentUserId={currentUser?.id}
          onClose={() => setShowAddPerson(false)}
          onCreated={handlePersonCreated}
        />
      )}
    </div>
  )
}
