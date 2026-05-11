import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { createPerson } from '../lib/api'
import { trackEvent } from '../lib/analytics'
import BottomSheet from '../components/BottomSheet'
import { tgHaptic } from '../lib/telegram'

const AVATAR_COLORS = ['#D98B52', '#A05E2C', '#8A7A6A', '#B8A898', '#6B8F71', '#7A6B8A']
const SAMPLE_NAMES = ['Мама', 'Алишер', 'Сестра']

function CameraIcon({ size = 26 }) {
  return (
    <svg width={size} height={Math.round(size * 0.84)} viewBox="0 0 26 22" fill="none" aria-hidden="true">
      <path d="M9.5 1.5L7.5 4.5H3C1.9 4.5 1 5.4 1 6.5V19.5C1 20.6 1.9 21.5 3 21.5H23C24.1 21.5 25 20.6 25 19.5V6.5C25 5.4 24.1 4.5 23 4.5H18.5L16.5 1.5H9.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="13" cy="13" r="4.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Avatar({ person, size = 44 }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-full font-sans"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        background: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
        border: '2px solid rgba(255,255,255,0.78)',
        color: '#fff',
        fontSize: Math.round(size * 0.36),
        fontWeight: 700,
        boxShadow: '0 8px 18px rgba(80,50,30,0.12)',
      }}
    >
      {person.photo_url ? (
        <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        person.name?.[0]?.toUpperCase()
      )}
    </div>
  )
}

function PersonChip({ person }) {
  return (
    <div
      className="flex items-center gap-2"
      style={{
        minWidth: 0,
        borderRadius: 999,
        padding: '6px 10px 6px 6px',
        background: 'rgba(255,255,255,0.62)',
        border: '1px solid rgba(160,94,44,0.1)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.64)',
      }}
    >
      <Avatar person={person} size={30} />
      <span className="truncate font-sans" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
        {person.name}
      </span>
    </div>
  )
}

function SampleAvatar({ name, index }) {
  return (
    <div
      className="flex items-center justify-center rounded-full font-sans"
      style={{
        width: 46,
        height: 46,
        marginLeft: index === 0 ? 0 : -13,
        background: AVATAR_COLORS[index],
        border: '3px solid rgba(255,255,255,0.82)',
        color: '#fff',
        fontSize: 16,
        fontWeight: 700,
        boxShadow: '0 10px 22px rgba(80,50,30,0.15)',
      }}
    >
      {name[0]}
    </div>
  )
}

function MemoryPreview({ peopleCount }) {
  return (
    <section
      className="mt-8 overflow-hidden"
      style={{
        borderRadius: 28,
        background:
          'radial-gradient(circle at 16% 0%, rgba(255,255,255,0.88), transparent 36%), linear-gradient(135deg, rgba(217,139,82,0.18), rgba(255,255,255,0.72) 54%, rgba(237,230,220,0.9))',
        border: '1px solid rgba(160,94,44,0.1)',
        boxShadow: 'var(--shadow-card-strong)',
      }}
    >
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-sans" style={{ margin: 0, color: 'var(--mid)', fontSize: 12, fontWeight: 600 }}>
              Первый момент
            </p>
            <p className="font-serif" style={{ marginTop: 4, color: 'var(--text)', fontSize: 26, fontWeight: 600, lineHeight: 1, letterSpacing: 0 }}>
              Вечер, который хочется помнить
            </p>
          </div>
          <div
            className="flex items-center justify-center"
            style={{
              width: 38,
              height: 38,
              flexShrink: 0,
              borderRadius: 14,
              background: 'var(--accent)',
              color: '#fff',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <CameraIcon size={19} />
          </div>
        </div>

        <div
          className="mt-5"
          style={{
            minHeight: 132,
            borderRadius: 22,
            background:
              'linear-gradient(160deg, rgba(160,94,44,0.88), rgba(217,139,82,0.78) 45%, rgba(245,235,221,0.96)), radial-gradient(circle at 75% 18%, rgba(255,255,255,0.72), transparent 34%)',
            padding: 14,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.26)',
          }}
        >
          <div className="flex h-full min-h-[104px] flex-col justify-between">
            <div className="flex items-center">
              {SAMPLE_NAMES.map((name, index) => (
                <SampleAvatar key={name} name={name} index={index} />
              ))}
            </div>
            <p className="font-sans" style={{ margin: 0, maxWidth: 230, color: '#FFF8F0', fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
              Отмечай людей в моментах, чтобы память собиралась вокруг тех, кто рядом.
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className="flex items-center justify-center rounded-full"
            style={{ width: 23, height: 23, background: 'var(--accent-pale)', color: 'var(--accent)', flexShrink: 0 }}
          >
            <CheckIcon />
          </span>
          <p className="font-sans" style={{ margin: 0, color: 'var(--mid)', fontSize: 13, lineHeight: 1.35 }}>
            {peopleCount > 0 ? `${peopleCount} уже добавлено. Можно идти дальше.` : 'Добавь хотя бы одного близкого сейчас или вернись к этому позже.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function AddPersonSheet({ onClose }) {
  const addPersonStore = useAppStore((s) => s.addPerson)
  const currentUser = useAppStore((s) => s.currentUser)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [color] = useState(() => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)])
  const fileRef = useRef(null)
  const [photoFile, setPhotoFile] = useState(null)
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
      const saved = await createPerson({
        userId: currentUser?.id,
        name: name.trim(),
        avatarColor: color,
        photoFile: photoFile ?? null,
      })
      addPersonStore(saved)
      onClose()
    } catch (err) {
      console.error('[AddPersonSheet] create person failed', err)
      setError(err?.message || 'Не удалось сохранить. Попробуй еще раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Кого будем помнить?">
      <div className="px-4 flex flex-col gap-5 pb-2">
        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center gap-1 transition-opacity active:opacity-70"
            style={{
              width: 88,
              height: 88,
              borderRadius: '50%',
              border: photoPreview ? '3px solid rgba(255,255,255,0.78)' : '1.5px dashed rgba(217,139,82,0.58)',
              background: photoPreview ? 'transparent' : 'linear-gradient(180deg, rgba(255,255,255,0.62), rgba(245,235,221,0.62))',
              color: 'var(--accent)',
              overflow: 'hidden',
              boxShadow: photoPreview ? '0 12px 28px rgba(80,50,30,0.16)' : 'none',
            }}
          >
            {photoPreview ? (
              <img src={photoPreview} alt="Превью" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <CameraIcon />
                <span className="font-sans" style={{ fontSize: 12, fontWeight: 600 }}>Фото</span>
              </>
            )}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <label className="flex flex-col gap-2 font-sans" style={{ color: 'var(--text)', fontSize: 13, fontWeight: 600 }}>
          Имя
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Например, Лола"
            autoFocus
            className="w-full font-sans outline-none"
            style={{
              backgroundColor: 'var(--moment-surface)',
              borderRadius: 16,
              padding: '14px 15px',
              fontSize: 16,
              color: 'var(--text)',
              border: name.trim() ? '1.5px solid rgba(217,139,82,0.5)' : '1.5px solid rgba(160,94,44,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.72)',
            }}
          />
        </label>

        <p className="font-sans" style={{ margin: 0, fontSize: 13, color: 'var(--mid)', lineHeight: 1.45 }}>
          Потом ты сможешь отмечать этого человека в моментах, фото и коллекциях.
        </p>

        {error && (
          <p className="font-sans text-center" style={{ margin: 0, fontSize: 13, color: '#D94040' }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleAdd}
          disabled={!name.trim() || saving}
          className="flex w-full items-center justify-center gap-2 font-sans transition-opacity active:opacity-70 disabled:active:opacity-100"
          style={{
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 18,
            padding: '14px 0',
            fontSize: 15,
            fontWeight: 700,
            border: 'none',
            boxShadow: name.trim() && !saving ? 'var(--shadow-accent)' : 'none',
          }}
        >
          {saving ? 'Сохраняю...' : 'Добавить'}
        </button>

        <button
          type="button"
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

  function finish(method) {
    tgHaptic('light')
    void trackEvent('onboarding_completed', { method })
    setOnboarded(true)
    navigate('/home', { replace: true })
  }

  function openAddSheet() {
    tgHaptic('light')
    setShowSheet(true)
  }

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex-1 overflow-y-auto px-4 pt-topbar pb-5">
        <div className="flex items-center justify-between gap-3">
          <p className="font-serif" style={{ margin: 0, color: 'var(--text)', fontSize: 28, fontWeight: 600, lineHeight: 1, letterSpacing: 0 }}>
            memi
          </p>
          <button
            type="button"
            onClick={() => finish('skipped')}
            className="font-sans transition-opacity active:opacity-60"
            style={{
              border: '1px solid rgba(160,94,44,0.1)',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.48)',
              color: 'var(--mid)',
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Позже
          </button>
        </div>

        <div className="mt-9">
          <h1
            className="font-serif"
            style={{ margin: 0, color: 'var(--text)', fontSize: 38, fontWeight: 600, lineHeight: 0.95, letterSpacing: 0 }}
          >
            Собери круг близких
          </h1>
          <p className="font-sans" style={{ marginTop: 14, marginBottom: 0, color: 'var(--mid)', fontSize: 15, lineHeight: 1.55 }}>
            Memi станет личнее, когда в твоих моментах появятся люди, с которыми они связаны.
          </p>
        </div>

        <MemoryPreview peopleCount={people.length} />

        {people.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="font-sans" style={{ margin: 0, color: 'var(--soft)', fontSize: 12, fontWeight: 600 }}>
                Уже в твоем круге
              </p>
              <p className="font-sans" style={{ margin: 0, color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>
                {people.length}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {people.map((person) => (
                <PersonChip key={person.id} person={person} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="px-4 pb-safe">
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={openAddSheet}
            className="flex w-full items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
            style={{
              backgroundColor: 'var(--accent)',
              color: '#fff',
              borderRadius: 20,
              padding: '15px 0',
              fontSize: 16,
              fontWeight: 700,
              border: 'none',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            <PlusIcon />
            {people.length === 0 ? 'Добавить близкого' : 'Добавить еще'}
          </button>

          {people.length > 0 && (
            <button
              type="button"
              onClick={() => finish('completed')}
              className="flex w-full items-center justify-center gap-2 font-sans transition-opacity active:opacity-70"
              style={{
                backgroundColor: 'var(--moment-surface)',
                color: 'var(--text)',
                borderRadius: 20,
                padding: '14px 0',
                fontSize: 15,
                fontWeight: 700,
                border: '1px solid rgba(160,94,44,0.1)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              Продолжить
              <ArrowIcon />
            </button>
          )}
        </div>
      </div>

      {showSheet && <AddPersonSheet onClose={() => setShowSheet(false)} />}
    </div>
  )
}
