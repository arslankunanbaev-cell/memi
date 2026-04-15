import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson } from '../lib/api'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']

function PersonChip({ person }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full" style={{ backgroundColor: 'var(--surface)' }}>
      <div
        className="flex items-center justify-center rounded-full font-sans font-medium text-white flex-shrink-0"
        style={{
          width: 28,
          height: 28,
          backgroundColor: person.avatar_color,
          fontSize: 12,
        }}
      >
        {person.name[0].toUpperCase()}
      </div>
      <span className="font-sans" style={{ fontSize: 13, color: 'var(--text)' }}>
        {person.name}
      </span>
    </div>
  )
}

function AddPersonSheet({ onClose }) {
  const addPersonStore = useAppStore((s) => s.addPerson)
  const currentUser   = useAppStore((s) => s.currentUser)
  const [name, setName]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)
  const [photoFile, setPhotoFile]     = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

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
      // Сохраняем в Supabase — получаем реальный UUID
      const saved = await createPerson({
        userId:      currentUser?.id,
        name:        name.trim(),
        avatarColor: color,
        photoFile:   photoFile ?? null,
      })
      addPersonStore(saved)   // кладём объект с реальным Supabase id
      onClose()
    } catch (err) {
      console.error('[AddPersonSheet] ❌', err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Добавить человека">
      <div className="px-5 flex flex-col gap-5">
        {/* Avatar circle */}
        <div className="flex justify-center pt-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: photoPreview ? 'none' : '2px dashed var(--accent)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--surface)',
              overflow: 'hidden',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontSize: 22 }}>📷</span>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Name input */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Как зовут?"
          autoFocus
          className="w-full font-sans outline-none"
          style={{
            backgroundColor: 'var(--surface)',
            borderRadius: 10,
            padding: '11px 14px',
            fontSize: 15,
            color: 'var(--text)',
            border: 'none',
          }}
        />

        {/* Error */}
        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>
        )}

        {/* Actions */}
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

        <button
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

export default function Onboarding() {
  const navigate = useNavigate()
  const people = useAppStore((s) => s.people)
  const setOnboarded = useAppStore((s) => s.setOnboarded)
  const [showSheet, setShowSheet] = useState(false)

  function finish() {
    setOnboarded(true)
    navigate('/home', { replace: true })
  }

  return (
    <div
      className="flex flex-col h-full"
      style={{ backgroundColor: 'var(--base)' }}
    >
      {/* Progress bar */}
      <div style={{ height: 2, backgroundColor: 'var(--surface)' }}>
        <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--accent)' }} />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col px-6 pt-12 pb-6 overflow-y-auto">
        {/* Heading */}
        <h1
          className="font-serif"
          style={{ fontSize: 30, color: 'var(--text)', fontWeight: 400, lineHeight: 1.25 }}
        >
          Добавь людей,<br />которых любишь
        </h1>
        <p
          className="font-sans mt-3"
          style={{ fontSize: 14, color: 'var(--mid)', lineHeight: 1.55 }}
        >
          Они будут появляться в твоих моментах
        </p>

        {/* People list */}
        {people.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8">
            {people.map((p) => (
              <PersonChip key={p.id} person={p} />
            ))}
          </div>
        )}

        {/* Empty hint */}
        {people.length === 0 && (
          <div
            className="flex flex-col items-center justify-center mt-12 gap-3 rounded-2xl py-10"
            style={{ backgroundColor: 'var(--surface)' }}
          >
            <span style={{ fontSize: 36 }}>🤍</span>
            <p className="font-sans text-center" style={{ fontSize: 13, color: 'var(--mid)' }}>
              Пока никого нет.<br />Добавь близких людей.
            </p>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div
        className="flex flex-col gap-3 px-6 pb-safe"
        style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={() => setShowSheet(true)}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: 9999,
            padding: '14px 0',
            fontSize: 15,
            border: 'none',
          }}
        >
          {people.length === 0 ? 'Добавить человека' : 'Добавить ещё'}
        </button>

        {people.length > 0 && (
          <button
            onClick={finish}
            className="w-full font-sans font-medium transition-opacity active:opacity-70"
            style={{
              backgroundColor: 'var(--surface)',
              color: 'var(--text)',
              borderRadius: 9999,
              padding: '14px 0',
              fontSize: 15,
              border: 'none',
            }}
          >
            Далее →
          </button>
        )}

        <button
          onClick={finish}
          className="font-sans transition-opacity active:opacity-60 py-2"
          style={{ color: 'var(--mid)', fontSize: 13, background: 'none', border: 'none' }}
        >
          Пропустить
        </button>
      </div>

      {showSheet && <AddPersonSheet onClose={() => setShowSheet(false)} />}
    </div>
  )
}
