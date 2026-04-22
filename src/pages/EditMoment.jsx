import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { updateMoment as updateMomentApi, createPerson, uploadPhoto } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import SongSearchSheet from '../components/SongSearchSheet'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

const MOODS = ['😊', '🥹', '😌', '🤩', '😔', '🥰', '😤', '🌀', '🫶', '💭']
const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']
const VISIBILITY_OPTIONS = [
  { value: 'private', label: 'Только я' },
  { value: 'friends', label: 'Друзья' },
  { value: 'public', label: 'Открыто' },
]

function AddPersonMiniSheet({ currentUserId, onClose, onCreated }) {
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const addPerson = useAppStore((s) => s.addPerson)

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
      addPerson(saved)
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
      <div className="px-5 flex flex-col gap-4 pb-5">
        <div className="flex justify-center pt-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{
              width: 56, height: 56, borderRadius: '50%', overflow: 'hidden',
              border: photoPreview ? 'none' : '2px dashed var(--accent)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--moment-surface)',
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
            backgroundColor: 'var(--moment-surface)', borderRadius: 10,
            padding: '11px 14px', fontSize: 15, color: 'var(--text)', border: 'none',
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
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--moment-surface)',
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

export default function EditMoment() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser     = useAppStore((s) => s.currentUser)
  const allPeople       = useAppStore((s) => s.people)
  const moments         = useAppStore((s) => s.moments)
  const updateMomentStore = useAppStore((s) => s.updateMoment)

  const moment = moments.find((m) => m.id === id)

  // Form state — initialised from moment
  const [title, setTitle]       = useState(moment?.title ?? '')
  const [description, setDescription] = useState(moment?.description ?? '')
  const [mood, setMood]         = useState(moment?.mood ?? '')
  const [location, setLocation] = useState(moment?.location ?? '')
  const [selectedPeople, setSelectedPeople] = useState(
    () => (moment?.people ?? []).map((p) => p.id)
  )

  // Song: map from moment fields to song object
  const [song, setSong] = useState(
    moment?.song_title
      ? { name: moment.song_title, artist: moment.song_artist ?? '', cover: moment.song_cover ?? null }
      : null
  )
  const [showSongSheet, setShowSongSheet] = useState(false)

  // Photo
  const photoRef = useRef(null)
  const [newPhotoFile, setNewPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview]       = useState(moment?.photo_url ?? null)

  const [visibility, setVisibility] = useState(moment?.visibility ?? 'private')

  // UI state
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [showAddPerson, setShowAddPerson] = useState(false)

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

  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setNewPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  function togglePerson(personId) {
    setSelectedPeople((prev) =>
      prev.includes(personId) ? prev.filter((p) => p !== personId) : [...prev, personId]
    )
  }

  function handlePersonCreated(person) {
    setSelectedPeople((prev) => [...prev, person.id])
  }

  async function handleSave() {
    if (!title.trim() || saving) return
    tgHaptic('medium')
    setSaving(true)
    setError(null)
    try {
      let photo_url  = moment.photo_url
      let photo_path = moment.photo_path ?? null
      if (newPhotoFile) {
        const sb = assertSupabase()
        const result = await uploadPhoto(sb, currentUser.id, newPhotoFile)
        photo_url  = result.photo_url
        photo_path = result.photo_path
      }

      const updated = await updateMomentApi(moment.id, {
        title: title.trim(),
        description: description.trim() || null,
        mood: mood || null,
        location: location.trim() || null,
        visibility,
        song_title:  song?.name   ?? null,
        song_artist: song?.artist ?? null,
        song_cover:  song?.cover  ?? null,
        photo_url,
        photo_path,
      })

      // Update people links: delete all, insert new
      const sb = assertSupabase()
      await sb.from('moment_people').delete().eq('moment_id', moment.id)
      if (selectedPeople.length > 0) {
        await sb.from('moment_people').insert(
          selectedPeople.map((personId) => ({ moment_id: moment.id, person_id: personId }))
        )
      }

      // Build full moment with people objects
      const fullPeople = allPeople.filter((p) => selectedPeople.includes(p.id))
      const fullMoment = { ...updated, people: fullPeople }
      updateMomentStore(moment.id, fullMoment)

      navigate(-1)
    } catch (err) {
      console.error('[EditMoment]', err)
      setError('Не удалось сохранить')
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: 'var(--base)' }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 pt-topbar"
        style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 15, fontWeight: 500, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
        <span className="font-serif" style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>
          Редактировать момент
        </span>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="font-sans font-medium transition-opacity active:opacity-60"
          style={{
            color: title.trim() && !saving ? 'var(--accent)' : 'var(--soft)',
            fontSize: 15,
            background: 'none',
            border: 'none',
          }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-10 flex flex-col gap-6" style={{ paddingTop: 20 }}>
        {/* Error */}
        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>
            {error}
          </p>
        )}

        {/* Photo */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Фото
          </p>
          <button
            onClick={() => photoRef.current?.click()}
            className="w-full transition-opacity active:opacity-70"
            style={{
              aspectRatio: '16 / 9',
              minHeight: photoPreview ? undefined : 180,
              borderRadius: 20,
              border: photoPreview ? 'none' : '2px dashed var(--accent-light)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--moment-surface)',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: photoPreview ? 'none' : 'var(--shadow-card)',
            }}
          >
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div
                  style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                  }}
                >
                  <span className="font-sans" style={{ fontSize: 12, color: '#fff' }}>Изменить фото</span>
                </div>
              </>
            ) : (
              <span style={{ fontSize: 28 }}>📷</span>
            )}
          </button>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
        </div>

        {/* Mood emoji picker */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Настроение
          </p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m}
                onClick={() => setMood(mood === m ? '' : m)}
                className="transition-transform active:scale-90"
                style={{
                  width: 46, height: 46, borderRadius: 14, fontSize: 24,
                  backgroundColor: mood === m ? 'var(--accent-pale)' : 'var(--moment-surface)',
                  border: 'none',
                  boxShadow: mood === m ? '0 0 0 1.5px var(--accent), var(--shadow-card)' : 'var(--shadow-card)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
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
              borderBottom: '1.5px solid var(--divider)',
              paddingBottom: 8, fontWeight: 300,
            }}
          />
        </div>

        {/* Description */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Описание
          </p>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Опиши этот момент..."
            rows={4}
            maxLength={1000}
            className="w-full font-sans outline-none bg-transparent resize-none"
            style={{ fontSize: 15, color: 'var(--text)', lineHeight: 1.6 }}
          />
        </div>

        {/* Location */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Место
          </p>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Где это было?"
            maxLength={80}
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--moment-surface)', borderRadius: 14,
              padding: '12px 14px', fontSize: 15, color: 'var(--text)', border: 'none',
              boxShadow: 'var(--shadow-card)',
            }}
          />
        </div>

        {/* Song */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Трек
          </p>
          {song ? (
            <div
              className="stats-panel-surface flex items-center gap-3"
              style={{ padding: '12px 14px' }}
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
                backgroundColor: 'var(--moment-surface)', borderRadius: 14,
                padding: '12px 14px', fontSize: 15, color: 'var(--mid)',
                border: 'none', textAlign: 'left',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              🎵 &nbsp;Найти трек...
            </button>
          )}
        </div>

        {/* People */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-3" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            С кем
          </p>
          <div className="flex flex-wrap gap-2">
            {allPeople.map((p) => {
              const active = selectedPeople.includes(p.id)
              return (
                <button
                  key={p.id}
                  onClick={() => togglePerson(p.id)}
                  className="flex items-center gap-2 transition-all active:opacity-70"
                  style={{
                    borderRadius: 9999,
                    padding: '6px 12px 6px 8px',
                    backgroundColor: active ? 'var(--accent)' : 'var(--moment-surface)',
                    border: 'none',
                    boxShadow: active ? 'none' : 'var(--shadow-card)',
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
            <button
              onClick={() => setShowAddPerson(true)}
              className="flex items-center gap-2 transition-opacity active:opacity-70"
              style={{
                borderRadius: 9999,
                padding: '6px 12px 6px 8px',
                backgroundColor: 'var(--moment-surface)',
                border: '1.5px dashed rgba(217,139,82,0.5)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 22, height: 22,
                  backgroundColor: 'rgba(217,139,82,0.15)',
                  color: 'var(--accent)', fontSize: 14, flexShrink: 0, lineHeight: 1,
                }}
              >
                +
              </div>
              <span className="font-sans" style={{ fontSize: 13, color: 'var(--accent)' }}>
                {allPeople.length === 0 ? 'Добавить человека' : 'Новый'}
              </span>
            </button>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <p className="font-sans uppercase tracking-widest mb-2" style={{ fontSize: 12, fontWeight: 600, color: 'var(--soft)', letterSpacing: '0.14em' }}>
            Видимость
          </p>
          <div className="flex gap-2">
            {VISIBILITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setVisibility(value)}
                className="font-sans font-medium transition-opacity active:opacity-70"
                style={{
                  padding: '8px 18px', borderRadius: 9999, fontSize: 13, border: 'none',
                  backgroundColor: visibility === value ? 'var(--accent)' : 'var(--moment-surface)',
                  color: visibility === value ? '#fff' : 'var(--mid)',
                  boxShadow: visibility === value ? 'none' : 'var(--shadow-card)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Song search bottom sheet */}
      {showSongSheet && (
        <SongSearchSheet
          onClose={() => setShowSongSheet(false)}
          onSelect={(track) => { setSong(track); setShowSongSheet(false) }}
        />
      )}

      {/* Add person mini sheet */}
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
