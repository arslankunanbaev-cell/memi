import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { updatePerson, deletePerson } from '../lib/api'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

function EditPersonSheet({ person, onClose }) {
  const updatePersonStore = useAppStore((s) => s.updatePerson)
  const removePersonStore = useAppStore((s) => s.removePerson)
  const [name, setName] = useState(person.name)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const [photoPreview, setPhotoPreview] = useState(person.photo_url)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await updatePerson(person.id, { name: name.trim(), photoUrl: person.photo_url })
      updatePersonStore(person.id, { name: name.trim() })
      onClose()
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    tgHaptic('heavy')
    try {
      await deletePerson(person.id)
    } catch { /* offline */ }
    removePersonStore(person.id)
    onClose()
  }

  return (
    <BottomSheet onClose={onClose} title="Редактировать">
      <div className="px-5 flex flex-col gap-5 pb-4">
        {/* Avatar */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="transition-opacity active:opacity-70"
            style={{
              width: 60, height: 60, borderRadius: '50%',
              border: 'none', overflow: 'hidden',
              backgroundColor: person.avatar_color ?? 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span className="font-serif" style={{ fontSize: 22, color: '#fff', fontWeight: 300 }}>
                {person.name[0].toUpperCase()}
              </span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full font-sans outline-none"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: 'var(--text)', border: 'none' }}
        />

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: name.trim() ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() ? '#fff' : 'var(--soft)',
            borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none',
          }}
        >
          {saving ? '...' : 'Сохранить'}
        </button>

        <button
          onClick={handleDelete}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: '#E05252', background: 'none', border: 'none', fontSize: 14 }}
        >
          Удалить человека
        </button>
      </div>
    </BottomSheet>
  )
}

function PersonCard({ person, momentCount, lastPhotos, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-2xl text-left active:opacity-70 transition-opacity w-full"
      style={{ backgroundColor: 'var(--surface)', border: 'none' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
          style={{
            width: 40, height: 40,
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
        <div className="min-w-0">
          <p className="font-sans font-medium truncate" style={{ fontSize: 11, color: 'var(--text)' }}>{person.name}</p>
          <p className="font-sans" style={{ fontSize: 9, color: 'var(--mid)' }}>{momentCount} момент{momentCount === 1 ? '' : 'ов'}</p>
        </div>
      </div>
      {lastPhotos.length > 0 && (
        <div className="flex gap-1">
          {lastPhotos.map((url, i) => (
            <div
              key={i}
              style={{
                width: 14, height: 14, borderRadius: 3, overflow: 'hidden', flexShrink: 0,
                backgroundColor: 'var(--base)',
              }}
            >
              {url ? <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
            </div>
          ))}
        </div>
      )}
    </button>
  )
}

export default function People() {
  const navigate = useNavigate()
  const people  = useAppStore((s) => s.people)
  const moments = useAppStore((s) => s.moments)
  const addPerson = useAppStore((s) => s.addPerson)

  const [editPerson, setEditPerson] = useState(null)
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
        <span className="font-sans font-medium" style={{ fontSize: 15, color: 'var(--text)' }}>Мои люди</span>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'var(--surface)', border: 'none', fontSize: 20, color: 'var(--accent)' }}
        >
          +
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 8 }}>
          {people.map((p) => (
            <PersonCard
              key={p.id}
              person={p}
              momentCount={momentCountFor(p.id)}
              lastPhotos={lastPhotosFor(p.id)}
              onClick={() => setEditPerson(p)}
            />
          ))}
          {/* Add cell */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl p-3 transition-opacity active:opacity-60"
            style={{ border: '1.5px dashed rgba(217,139,82,0.35)', backgroundColor: 'transparent', minHeight: 90, aspectRatio: 'auto' }}
          >
            <span style={{ fontSize: 22, color: 'var(--accent)' }}>+</span>
            <span className="font-sans" style={{ fontSize: 11, color: 'var(--mid)' }}>Добавить</span>
          </button>
        </div>
      </div>

      {editPerson && <EditPersonSheet person={editPerson} onClose={() => setEditPerson(null)} />}
      {showAdd && <AddPersonSheetInline onClose={() => setShowAdd(false)} onAdd={addPerson} />}
    </div>
  )
}

// Inline add person sheet (reuses logic from Onboarding)
const AVATAR_COLORS_LIST = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

function AddPersonSheetInline({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [photoPreview, setPhotoPreview] = useState(null)
  const color = AVATAR_COLORS_LIST[Math.floor(Math.random() * AVATAR_COLORS_LIST.length)]
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoPreview(URL.createObjectURL(file))
  }

  function handleAdd() {
    if (!name.trim()) return
    tgHaptic('medium')
    onAdd({ id: crypto.randomUUID(), name: name.trim(), avatar_color: color, photo_url: photoPreview ?? null })
    onClose()
  }

  return (
    <BottomSheet onClose={onClose} title="Добавить человека">
      <div className="px-5 flex flex-col gap-5 pb-4">
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{ width: 60, height: 60, borderRadius: '50%', border: photoPreview ? 'none' : '2px dashed var(--accent)', backgroundColor: photoPreview ? 'transparent' : 'var(--surface)', overflow: 'hidden' }}
          >
            {photoPreview ? <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>📷</span>}
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
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: name.trim() ? 'var(--accent)' : 'var(--surface)', color: name.trim() ? '#fff' : 'var(--soft)', borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none' }}
        >
          Добавить
        </button>
        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}>Отмена</button>
      </div>
    </BottomSheet>
  )
}
