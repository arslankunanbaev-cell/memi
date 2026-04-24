import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { proxifyCoverUrl } from '../lib/imageProxy'
import { useAppStore } from '../store/useAppStore'
import { updateMoment as updateMomentApi, createPerson, uploadPhoto } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import SongSearchSheet from '../components/SongSearchSheet'
import BottomSheet from '../components/BottomSheet'
import SectionLabel from '../components/SectionLabel'
import { tgHaptic } from '../lib/telegram'

const MOODS = ['😊', '🥹', '😌', '🤩', '😔', '🥰', '😤', '🌀', '🫶', '💭']
const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']
const VISIBILITY_OPTIONS = [
  { value: 'friends', label: '\u0412\u0441\u0435\u043c \u0434\u0440\u0443\u0437\u044c\u044f\u043c' },
  { value: 'private', label: '\u0422\u043e\u043b\u044c\u043a\u043e \u044f' },
]

function FormCard({ children, style = {} }) {
  return (
    <div style={{
      backgroundColor: 'var(--moment-surface)',
      borderRadius: 18,
      padding: '18px',
      boxShadow: 'var(--shadow-card)',
      ...style,
    }}>
      {children}
    </div>
  )
}

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
      <div className="px-4 flex flex-col gap-5 pb-5">
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
            backgroundColor: 'var(--moment-surface)', borderRadius: 12,
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

  const [visibility, setVisibility] = useState(moment?.visibility === 'private' ? 'private' : 'friends')

  // UI state
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState(null)
  const [showAddPerson, setShowAddPerson] = useState(false)
  const songCover = proxifyCoverUrl(song?.cover ?? null)
  const outerSectionLabelClassName = 'mb-2'

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
      <div className="flex items-center justify-between px-4 pt-topbar" style={{ borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}>
        <button
          onClick={() => navigate(-1)}
          className="font-sans type-action transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', background: 'none', border: 'none' }}
        >
          Отмена
        </button>
        <h2 className="font-serif type-sheet-title" style={{ color: 'var(--text)' }}>
          Редактировать момент
        </h2>
        <button
          onClick={handleSave}
          disabled={!title.trim() || saving}
          className="font-sans type-button transition-opacity active:opacity-60"
          style={{
            color: title.trim() && !saving ? 'var(--accent)' : 'var(--soft)',
            background: 'none',
            border: 'none',
          }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pt-6 pb-10">
        <div className="flex flex-col gap-7">
          {error && (
            <p className="font-sans type-meta text-center" style={{ color: '#E05252' }}>
              {error}
            </p>
          )}

          {/* Photo */}
          <div>
            <SectionLabel className={outerSectionLabelClassName}>Фото</SectionLabel>
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
                <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span className="font-sans type-support" style={{ color: 'var(--soft)' }}>Добавить фото</span>
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
              className="w-full font-serif type-sheet-title outline-none bg-transparent"
              style={{
                color: 'var(--text)',
                borderBottom: '1.5px solid var(--divider)',
                paddingBottom: 12, marginBottom: 20, fontWeight: 400,
              }}
            />
            <SectionLabel>Описание</SectionLabel>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опиши этот момент..."
              rows={3}
              maxLength={1000}
              className="w-full font-sans type-body outline-none bg-transparent resize-none"
              style={{ color: 'var(--text)' }}
            />
          </FormCard>

          {/* Mood */}
          <div>
            <SectionLabel className={outerSectionLabelClassName}>Настроение</SectionLabel>
            <div className="flex flex-wrap gap-3">
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

          {/* Location */}
          <FormCard>
            <SectionLabel>Место</SectionLabel>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Где это было?"
              maxLength={80}
              className="w-full font-sans outline-none bg-transparent"
              style={{ fontSize: 15, color: 'var(--text)' }}
            />
          </FormCard>

          {/* Song */}
          <div>
            <SectionLabel className={outerSectionLabelClassName}>Трек</SectionLabel>
            {song ? (
              <div
                className="stats-panel-surface flex items-center gap-3"
                style={{ padding: '12px 14px' }}
              >
                {songCover ? (
                  <img src={songCover} alt={song.name} style={{ width: 38, height: 38, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
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
                  backgroundColor: 'var(--moment-surface)', borderRadius: 16,
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

          {/* People */}
          <div>
            <SectionLabel className={outerSectionLabelClassName}>С кем</SectionLabel>
            <div className="flex flex-wrap gap-3">
              {allPeople.map((p) => {
                const active = selectedPeople.includes(p.id)
                return (
                  <button
                    key={p.id}
                    onClick={() => togglePerson(p.id)}
                    className="flex items-center gap-2 transition-all active:opacity-70"
                    style={{
                      borderRadius: 9999,
                      padding: '7px 14px 7px 9px',
                      backgroundColor: active ? 'var(--accent)' : 'var(--moment-surface)',
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
              <button
                onClick={() => setShowAddPerson(true)}
                className="flex items-center gap-2 transition-opacity active:opacity-70"
                style={{
                  borderRadius: 9999,
                  padding: '7px 14px 7px 9px',
                  backgroundColor: 'var(--moment-surface)',
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
                  {allPeople.length === 0 ? 'Добавить человека' : 'Новый'}
                </span>
              </button>
            </div>
          </div>

          {/* Visibility */}
          <div>
            <SectionLabel className={outerSectionLabelClassName}>Видимость</SectionLabel>
            <div className="flex gap-3">
              {VISIBILITY_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setVisibility(value)}
                  className="font-sans font-medium transition-opacity active:opacity-70"
                  style={{
                    padding: '9px 18px', borderRadius: 9999, fontSize: 13, border: 'none',
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
