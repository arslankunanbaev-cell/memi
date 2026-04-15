import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson } from '../lib/api'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

// ── Карточка человека ─────────────────────────────────────────────────────────
function PersonCard({ person, momentCount, lastPhotos, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 text-left active:opacity-70 transition-opacity w-full"
      style={{ backgroundColor: 'var(--surface)', borderRadius: 14, padding: 14, border: 'none', cursor: 'pointer' }}
    >
      {/* Аватар */}
      <div
        className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
        style={{
          width: 44, height: 44,
          backgroundColor: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
          overflow: 'hidden',
        }}
      >
        {person.photo_url ? (
          <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontSize: 18, color: '#fff', fontWeight: 300 }}>{person.name[0].toUpperCase()}</span>
        )}
      </div>

      {/* Имя + кол-во моментов */}
      <div className="min-w-0">
        <p className="font-sans font-medium truncate" style={{ fontSize: 12, color: 'var(--text)' }}>{person.name}</p>
        <p className="font-sans" style={{ fontSize: 10, color: 'var(--mid)', marginTop: 2 }}>
          {momentCount} момент{momentCount === 1 ? '' : momentCount < 5 ? 'а' : 'ов'}
        </p>
      </div>

      {/* Три последних фото */}
      {lastPhotos.length > 0 && (
        <div className="flex gap-1">
          {lastPhotos.map((url, i) => (
            <div
              key={i}
              style={{ width: 18, height: 18, borderRadius: 3, overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--base)' }}
            >
              {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
          ))}
        </div>
      )}
    </button>
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
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Добавить человека">
      <div className="px-5 flex flex-col gap-4 pb-5">
        <div className="flex justify-center pt-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{ width: 60, height: 60, borderRadius: '50%', overflow: 'hidden', border: photoPreview ? 'none' : '2px dashed var(--accent)', backgroundColor: photoPreview ? 'transparent' : 'var(--surface)' }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 22 }}>📷</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как зовут?"
          autoFocus
          className="w-full font-sans outline-none"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: 'var(--text)', border: 'none' }}
        />

        {error && <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>}

        <button
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)', color: name.trim() && !saving ? '#fff' : 'var(--soft)', borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none' }}
        >
          {saving ? 'Сохранение...' : 'Добавить'}
        </button>

        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}>
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
        <span className="font-sans" style={{ fontSize: 16, fontWeight: 500, color: 'var(--text)' }}>Люди</span>
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
