import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson } from '../lib/api'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

// ── Карточка человека ─────────────────────────────────────────────────────────
function PersonCard({ person, momentCount, lastPhotos, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-3 active:opacity-70 transition-opacity w-full"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 14, padding: '16px 12px 14px', border: 'none', cursor: 'pointer' }}
    >
      {/* Аватар */}
      <div
        className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
        style={{
          width: 72, height: 72,
          backgroundColor: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
          overflow: 'hidden',
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 28, color: '#fff', fontWeight: 300 }}>{person.name[0].toUpperCase()}</span>
        )}
      </div>

      {/* Имя + кол-во моментов */}
      <div className="min-w-0 w-full text-center">
        <p className="font-sans font-medium truncate" style={{ fontSize: 15, color: 'var(--text)' }}>{person.name}</p>
        <p className="font-sans" style={{ fontSize: 11, color: 'var(--mid)', marginTop: 2 }}>
          {momentCount} {plural.момент(momentCount)}
        </p>
      </div>

      {/* Три последних фото */}
      {lastPhotos.length > 0 && (
        <div className="flex gap-1 justify-center">
          {lastPhotos.map((url, i) => (
            <div
              key={i}
              style={{ width: 22, height: 22, borderRadius: 4, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--base)' }}
            >
              {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="22" viewBox="0 0 26 22" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9.5 1.5L7.5 4.5H3C1.9 4.5 1 5.4 1 6.5V19.5C1 20.6 1.9 21.5 3 21.5H23C24.1 21.5 25 20.6 25 19.5V6.5C25 5.4 24.1 4.5 23 4.5H18.5L16.5 1.5H9.5Z" stroke="var(--accent)" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="13" cy="13" r="4.5" stroke="var(--accent)" strokeWidth="1.5"/>
    </svg>
  )
}

// ── Шит добавления человека ───────────────────────────────────────────────────
function AddPersonSheet({ onClose, onCreated }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const [name, setName]     = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)

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
        userId: currentUser?.id,
        name: name.trim(),
        avatarColor: color,
        photoFile: photoFile ?? null,
      })
      onCreated(saved)
      onClose()
    } catch (err) {
      console.error('[AddPerson] ❌', err)
      setError(err?.message || 'Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose}>
      <div className="px-5 flex flex-col gap-5 pb-2">
        {/* Title */}
        <p className="font-sans text-center font-medium" style={{ fontSize: 17, color: 'var(--text)' }}>
          Добавить человека
        </p>

        {/* Avatar circle */}
        <div className="flex justify-center">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-70"
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: photoPreview ? 'none' : '1.5px dashed var(--accent)',
              backgroundColor: 'transparent',
              overflow: photoPreview ? 'hidden' : 'visible',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            ) : (
              <>
                <CameraIcon />
                <span className="font-sans" style={{ fontSize: 11, color: 'var(--accent)' }}>Фото</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Name input */}
        <div className="flex flex-col gap-2">
          <label className="font-sans" style={{ fontSize: 13, color: 'var(--mid)' }}>Как зовут?</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите имя"
            autoFocus
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--surface)',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 15,
              color: 'var(--text)',
              border: name.trim() ? '1.5px solid var(--accent)' : '1.5px solid transparent',
            }}
          />
          <p className="font-sans" style={{ fontSize: 12, color: 'var(--accent)', lineHeight: 1.45 }}>
            Имя появится в карточках моментов, когда ты отметишь этого человека
          </p>
        </div>

        {error && <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>}

        <button
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 9999,
            padding: '13px 0',
            fontSize: 15,
            border: 'none',
          }}
        >
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>

        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}>
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Главный экран ─────────────────────────────────────────────────────────────
export default function People() {
  const navigate  = useNavigate()
  const people    = useAppStore((s) => s.people)
  const moments   = useAppStore((s) => s.moments)
  const addPerson = useAppStore((s) => s.addPerson)

  const [showAdd, setShowAdd] = useState(false)

  function momentCountFor(personId) {
    return moments.filter((m) => (m.people ?? []).some((p) => p.id === personId)).length
  }

  function lastPhotosFor(personId) {
    return moments
      .filter((m) => (m.people ?? []).some((p) => p.id === personId) && m.photo_url)
      .slice(0, 3)
      .map((m) => m.photo_url)
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* Топбар */}
      <div
        className="flex items-center justify-between px-4"
        style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 12 }}
      >
        <span className="font-serif" style={{ fontSize: 28, fontWeight: 600, color: 'var(--text)' }}>Люди</span>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 30, height: 30, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none', fontSize: 18, color: 'var(--accent)' }}
        >
          +
        </button>
      </div>

      {/* Сетка */}
      <div className="flex-1 overflow-y-auto pb-28 px-4">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 4, paddingBottom: 8 }}>
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              momentCount={momentCountFor(p.id)}
              lastPhotos={lastPhotosFor(p.id)}
              onClick={() => navigate(`/people/${p.id}`)}
            />
          ))}

          {/* Ячейка "Добавить" */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
            style={{
              borderRadius: 14, minHeight: 110,
              border: '1.5px dashed rgba(217,139,82,0.35)',
              backgroundColor: 'transparent',
              cursor: 'pointer',
            }}
          >
            <div
              className="flex items-center justify-center rounded-full"
              style={{ width: 32, height: 32, backgroundColor: 'rgba(217,139,82,0.15)' }}
            >
              <span style={{ fontSize: 18, color: 'var(--accent)', lineHeight: 1 }}>+</span>
            </div>
            <span className="font-sans" style={{ fontSize: 11, color: 'var(--accent)' }}>Добавить</span>
          </button>
        </div>
      </div>

      <BottomNav active="people" />

      {showAdd && (
        <AddPersonSheet
          onClose={() => setShowAdd(false)}
          onCreated={addPerson}
        />
      )}
    </div>
  )
}
