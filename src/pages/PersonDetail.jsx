import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import BottomSheet from '../components/BottomSheet'
import { deletePerson, updatePerson, uploadPhoto } from '../lib/api'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
import { assertSupabase } from '../lib/supabase'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, index) => CURRENT_YEAR - index)

function yearsKnown(metYear) {
  if (!metYear) return null
  return CURRENT_YEAR - metYear
}

function uniqueMonths(moments) {
  return new Set(
    moments.map((moment) => {
      const date = new Date(getMomentDisplayAt(moment))
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

function formatMomentDate(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(value))
    .replace(/\u00A0/g, ' ')
    .replace('.', '')
    .trim()
}

function navigateBack(navigate) {
  if (window.history.length > 1) {
    navigate(-1)
    return
  }

  navigate('/people')
}

function BackIcon({ color = 'currentColor' }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path
        d="M8 2L2 8l6 6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MoreIcon({ color = '#3D2B1A' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="18" cy="12" r="1.8" fill={color} />
    </svg>
  )
}

function PlusIcon({ color = 'currentColor' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function EditIcon({ color = 'currentColor' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 20h9"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m16.5 3.5 4 4L8 20l-5 1 1-5 12.5-12.5Z"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon({ color = 'currentColor' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 7h16" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path d="M9 3h6" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
      <path
        d="M18 7l-1 12a2 2 0 0 1-2 1H9a2 2 0 0 1-2-1L6 7"
        stroke={color}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v5M14 11v5" stroke={color} strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function CameraIcon({ color = 'currentColor' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 8a2 2 0 0 1 2-2h2.1a2 2 0 0 0 1.63-.84L10.9 3.5A2 2 0 0 1 12.53 2.7h1.04a2 2 0 0 1 1.63.8l1.17 1.66A2 2 0 0 0 18 6h2a2 2 0 0 1 2 2v9.5a2.5 2.5 0 0 1-2.5 2.5h-15A2.5 2.5 0 0 1 2 17.5V8.5A2.5 2.5 0 0 1 4.5 6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="13" r="4" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

function ChevronDownIcon({ color = 'var(--mid)' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="m6 9 6 6 6-6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SheetActionButton({ label, danger = false, onClick, disabled = false, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-4 rounded-[22px] text-left transition-opacity active:opacity-70 disabled:opacity-60"
      style={{
        border: `1px solid ${danger ? 'rgba(217, 64, 64, 0.12)' : 'rgba(160, 94, 44, 0.08)'}`,
        backgroundColor: danger ? 'rgba(217, 64, 64, 0.06)' : 'var(--base)',
        padding: '16px 18px',
      }}
    >
      <div
        className="flex items-center justify-center rounded-[16px]"
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          backgroundColor: danger ? 'rgba(217, 64, 64, 0.12)' : 'rgba(217, 139, 82, 0.12)',
          color: danger ? '#D45757' : 'var(--deep)',
        }}
      >
        {children}
      </div>

      <span
        className="font-sans"
        style={{
          color: danger ? '#D45757' : 'var(--text)',
          fontSize: 16,
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </button>
  )
}

function PersonMomentCard({ moment, featured = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative w-full overflow-hidden text-left transition-opacity active:opacity-80"
      style={{
        border: 'none',
        padding: 0,
        borderRadius: featured ? 24 : 20,
        aspectRatio: featured ? '1.35 / 1' : '0.92 / 1.16',
        background: moment.photo_url
          ? 'none'
          : 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 55%, #E8CAA1 100%)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {moment.photo_url && (
        <img
          src={moment.photo_url}
          alt={moment.title || 'Момент'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(23,20,14,0.72) 0%, rgba(23,20,14,0.1) 56%, transparent 100%)',
        }}
      />

      {getMomentDisplayAt(moment) && (
        <div style={{ position: 'absolute', top: 12, left: 12 }}>
          <span
            className="font-sans"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 9999,
              backgroundColor: 'rgba(255,255,255,0.88)',
              color: 'var(--text)',
              fontSize: 11,
              fontWeight: 600,
              padding: '5px 10px',
            }}
          >
            {formatMomentDate(getMomentDisplayAt(moment))}
          </span>
        </div>
      )}

      <div style={{ position: 'absolute', left: 14, right: 14, bottom: 14 }}>
        <p
          className="font-serif"
          style={{
            margin: 0,
            color: '#fff',
            fontSize: featured ? 22 : 16,
            fontWeight: 600,
            lineHeight: 1.02,
            textShadow: '0 6px 18px rgba(0,0,0,0.22)',
          }}
        >
          {moment.title || 'Без названия'}
        </p>
      </div>
    </button>
  )
}

function EditPersonSheet({ person, onClose, onSaved, onDelete }) {
  const [name, setName] = useState(person.name)
  const [metYear, setMetYear] = useState(person.met_year ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(person.photo_url ?? null)
  const fileRef = useRef(null)

  function handleFile(event) {
    const file = event.target.files?.[0]
    if (!file) return

    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSave() {
    if (!name.trim() || saving) return

    tgHaptic('medium')
    setSaving(true)
    setError(null)

    try {
      let photo_url = person.photo_url ?? null
      let photo_path = person.photo_path ?? null

      if (photoFile) {
        const supabase = assertSupabase()
        const result = await uploadPhoto(supabase, person.user_id, photoFile, 'people')
        photo_url = result.photo_url
        photo_path = result.photo_path
      }

      const updated = await updatePerson(person.id, {
        name: name.trim(),
        photoUrl: photo_url,
        photoPath: photo_path,
        metYear: metYear ? Number(metYear) : null,
      })

      onSaved(updated)
      onClose()
    } catch (err) {
      console.error('[EditPerson]', err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return

    setDeleting(true)
    setError(null)

    try {
      const deleted = await onDelete()

      if (!deleted) {
        setDeleting(false)
      }
    } catch (err) {
      console.error('[DeletePerson]', err)
      setError('Не удалось удалить человека.')
      setDeleting(false)
    }
  }

  const fieldStyle = {
    width: '100%',
    backgroundColor: 'var(--moment-surface)',
    border: '1px solid rgba(160, 94, 44, 0.12)',
    borderRadius: 18,
    padding: '14px 16px',
    fontSize: 15,
    color: 'var(--text)',
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
    outline: 'none',
  }

  return (
    <BottomSheet onClose={onClose} title="Редактировать">
      <div className="px-4 pb-5 flex flex-col gap-5">
        <div
          className="surface-card rounded-[28px]"
          style={{
            padding: '18px 18px',
            border: '1px solid rgba(160, 94, 44, 0.08)',
          }}
        >
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-4 text-left transition-opacity active:opacity-70"
            style={{ background: 'none', border: 'none', padding: 0 }}
          >
            <div
              className="relative flex items-center justify-center overflow-hidden rounded-full"
              style={{
                width: 84,
                height: 84,
                flexShrink: 0,
                background: photoPreview
                  ? 'transparent'
                  : 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 100%)',
                boxShadow: '0 10px 24px rgba(80,50,30,0.16)',
              }}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt={person.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <span
                  className="font-serif"
                  style={{ color: '#fff', fontSize: 34, fontWeight: 600 }}
                >
                  {person.name[0]?.toUpperCase()}
                </span>
              )}

              <div
                className="absolute flex items-center justify-center rounded-full"
                style={{
                  right: 4,
                  bottom: 4,
                  width: 26,
                  height: 26,
                  backgroundColor: 'rgba(255,255,255,0.94)',
                  color: 'var(--deep)',
                  boxShadow: '0 4px 14px rgba(80,50,30,0.16)',
                }}
              >
                <CameraIcon color="var(--deep)" />
              </div>
            </div>

            <div className="min-w-0">
              <p className="section-label" style={{ margin: 0 }}>
                Фото
              </p>
              <p
                className="font-sans"
                style={{
                  margin: '8px 0 0',
                  color: 'var(--text)',
                  fontSize: 15,
                  fontWeight: 600,
                }}
              >
                Обновить фото человека
              </p>
              <p
                className="font-sans"
                style={{ margin: '4px 0 0', color: 'var(--mid)', fontSize: 13, lineHeight: 1.45 }}
              >
                Нажми на аватар, чтобы выбрать новое фото.
              </p>
            </div>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        <div className="flex flex-col gap-3">
          <label className="section-label">Имя</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Имя"
            autoFocus
            className="font-sans"
            style={fieldStyle}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="section-label">Год знакомства</label>

          <div style={{ position: 'relative' }}>
            <select
              value={metYear}
              onChange={(event) => setMetYear(event.target.value)}
              className="font-sans"
              style={{
                ...fieldStyle,
                paddingRight: 44,
                color: metYear ? 'var(--text)' : 'var(--soft)',
                appearance: 'none',
                WebkitAppearance: 'none',
              }}
            >
              <option value="">Не указан</option>
              {YEAR_OPTIONS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <div
              className="pointer-events-none absolute inset-y-0 right-4 flex items-center"
            >
              <ChevronDownIcon />
            </div>
          </div>
        </div>

        {error && (
          <p className="font-sans text-center" style={{ margin: 0, fontSize: 12, color: '#D45757' }}>
            {error}
          </p>
        )}

        <div
          className="surface-card rounded-[28px]"
          style={{
            padding: 14,
            border: '1px solid rgba(160, 94, 44, 0.08)',
          }}
        >
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim() || saving}
              className="w-full font-sans transition-opacity active:opacity-70 disabled:opacity-60"
              style={{
                border: 'none',
                borderRadius: 9999,
                backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
                color: name.trim() && !saving ? '#fff' : 'var(--soft)',
                fontSize: 16,
                fontWeight: 700,
                padding: '16px 18px',
                boxShadow: name.trim() && !saving ? 'var(--shadow-accent)' : 'none',
              }}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="w-full font-sans transition-opacity active:opacity-70 disabled:opacity-60"
              style={{
                border: '1px solid rgba(217, 64, 64, 0.12)',
                borderRadius: 9999,
                backgroundColor: 'rgba(217, 64, 64, 0.06)',
                color: '#D45757',
                fontSize: 15,
                fontWeight: 600,
                padding: '15px 18px',
              }}
            >
              {deleting ? 'Удаление...' : `Удалить ${person.name}`}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="font-sans transition-opacity active:opacity-60"
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--mid)',
            fontSize: 14,
            fontWeight: 500,
            padding: '2px 0',
          }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const people = useAppStore((state) => state.people)
  const moments = useAppStore((state) => state.moments)
  const addMomentStore = useAppStore((state) => state.addMoment)
  const updatePersonStore = useAppStore((state) => state.updatePerson)
  const removePersonStore = useAppStore((state) => state.removePerson)

  const [showMenu, setShowMenu] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showAddMoment, setShowAddMoment] = useState(false)

  const person = people.find((entry) => entry.id === id)

  if (!person) {
    return (
      <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
        <div className="px-4 pt-topbar">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigateBack(navigate)}
              className="flex items-center gap-2 transition-opacity active:opacity-60"
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 0',
                color: 'var(--mid)',
                fontSize: 15,
                fontWeight: 500,
              }}
            >
              <BackIcon />
              Назад
            </button>

            <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
              Человек
            </span>

            <div style={{ width: 60 }} />
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-4">
          <div
            className="surface-card-strong w-full text-center"
            style={{
              borderRadius: 28,
              maxWidth: 360,
              padding: '32px 24px',
            }}
          >
            <p className="font-sans" style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>
              Человек не найден
            </p>
            <button
              type="button"
              onClick={() => navigate('/people')}
              className="font-sans transition-opacity active:opacity-60"
              style={{
                marginTop: 14,
                border: 'none',
                background: 'none',
                color: 'var(--accent)',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Вернуться к людям
            </button>
          </div>
        </div>
      </div>
    )
  }

  const personMoments = moments
    .filter((moment) => (
      (moment.people ?? []).some((entry) => entry.id === id)
    ))
    .slice()
    .sort(compareMomentsByDisplayAt)
  const known = yearsKnown(person.met_year)
  const momentCount = personMoments.length
  const statItems = [
    { value: momentCount, label: plural.момент(momentCount) },
    { value: uniqueMonths(personMoments), label: plural.месяц(uniqueMonths(personMoments)) },
    { value: known ?? '—', label: known != null ? plural.год(known) : 'год не указан' },
  ]

  async function handleDeletePerson() {
    const confirmed = window.confirm(`Удалить ${person.name}? Моменты останутся.`)
    if (!confirmed) return false

    tgHaptic('heavy')
    await deletePerson(person.id)
    removePersonStore(person.id)
    navigate('/people', { replace: true })
    return true
  }

  function handleSaved(updated) {
    updatePersonStore(updated.id, updated)
  }

  function handleStoryPress() {
    if (window.Telegram?.WebApp?.showAlert) {
      window.Telegram.WebApp.showAlert('Сторис скоро появятся.')
      return
    }

    window.alert('Сторис скоро появятся.')
  }

  return (
    <div className="flex h-full flex-col animate-fade-in" style={{ backgroundColor: 'var(--base)' }}>
      <div className="px-4 pt-topbar">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateBack(navigate)}
            className="flex items-center gap-2 transition-opacity active:opacity-60"
            style={{
              background: 'none',
              border: 'none',
              padding: '8px 0',
              color: 'var(--mid)',
              fontSize: 15,
              fontWeight: 500,
            }}
          >
            <BackIcon />
            Назад
          </button>

          <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
            Человек
          </span>

          <div className="flex justify-end" style={{ width: 60 }}>
            <button
              type="button"
              aria-label="Открыть меню человека"
              onClick={() => setShowMenu(true)}
              className="flex items-center justify-center transition-opacity active:opacity-60"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                backgroundColor: 'rgba(255,255,255,0.82)',
                border: '1px solid rgba(160, 94, 44, 0.12)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <MoreIcon />
            </button>
          </div>
        </div>
      </div>

      <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 170 }}>
        <div
          className="surface-card-strong"
          style={{
            marginTop: 20,
            backgroundColor: 'var(--moment-surface)',
            borderRadius: 28,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: 108,
              background: `
                radial-gradient(circle at top right, rgba(255,255,255,0.34), transparent 34%),
                linear-gradient(180deg, var(--deep) 0%, var(--accent) 56%, var(--accent-light) 100%)
              `,
            }}
          />

          <div style={{ padding: '0 20px 20px' }}>
            <div className="flex items-end gap-3" style={{ marginTop: -38 }}>
              <div
                className="flex items-center justify-center overflow-hidden rounded-full"
                style={{
                  width: 76,
                  height: 76,
                  flexShrink: 0,
                  background: person.photo_url
                    ? 'transparent'
                    : `linear-gradient(160deg, ${person.avatar_color ?? 'var(--deep)'} 0%, var(--accent) 100%)`,
                  color: '#fff',
                  border: '4px solid var(--moment-surface)',
                  boxShadow: '0 6px 18px rgba(80,50,30,0.18)',
                }}
              >
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt={person.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <span className="font-serif" style={{ fontSize: 30, fontWeight: 600 }}>
                    {person.name[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <h1
                className="font-serif"
                style={{
                  margin: 0,
                  color: 'var(--text)',
                  fontSize: 38,
                  fontWeight: 600,
                  lineHeight: 0.92,
                }}
              >
                {person.name}
              </h1>

              <div className="flex flex-wrap gap-2" style={{ marginTop: 16 }}>
                <span
                  className="font-sans"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    borderRadius: 9999,
                    backgroundColor: 'rgba(217, 139, 82, 0.1)',
                    border: '1px solid rgba(160, 94, 44, 0.12)',
                    color: 'var(--deep)',
                    fontSize: 14,
                    fontWeight: 500,
                    padding: '8px 12px',
                  }}
                >
                  {momentCount} {plural.момент(momentCount)} вместе
                </span>

                {person.met_year && (
                  <span
                    className="font-sans"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      borderRadius: 9999,
                      backgroundColor: 'var(--base)',
                      border: '1px solid rgba(160, 94, 44, 0.12)',
                      color: 'var(--mid)',
                      fontSize: 14,
                      fontWeight: 500,
                      padding: '8px 12px',
                    }}
                  >
                    С {person.met_year} года
                  </span>
                )}
              </div>
            </div>

            <div className="stats-panel-surface" style={{ marginTop: 20 }}>
              <div className="grid grid-cols-3" style={{ position: 'relative' }}>
                {statItems.map((item, index) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center justify-center"
                    style={{
                      minHeight: 98,
                      padding: '16px 10px 14px',
                      borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)',
                    }}
                  >
                    <span
                      className="font-sans"
                      style={{
                        color: 'var(--accent)',
                        fontSize: typeof item.value === 'number' ? 32 : 28,
                        fontWeight: 700,
                        lineHeight: 0.95,
                        textAlign: 'center',
                      }}
                    >
                      {item.value}
                    </span>
                    <span
                      className="font-sans"
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        fontWeight: 500,
                        lineHeight: 1.2,
                        color: 'var(--deep)',
                        textAlign: 'center',
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section style={{ marginTop: 26 }}>
          <div className="flex items-center justify-between gap-3">
            <h2
              className="font-sans"
              style={{
                margin: 0,
                color: 'var(--text)',
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              Все моменты
            </h2>

            <button
              type="button"
              onClick={() => setShowAddMoment(true)}
              className="inline-flex items-center gap-2 transition-opacity active:opacity-70"
              style={{
                border: '1px solid rgba(160, 94, 44, 0.12)',
                borderRadius: 9999,
                backgroundColor: 'rgba(255,255,255,0.84)',
                color: 'var(--deep)',
                padding: '8px 12px',
              }}
            >
              <span
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 20,
                  height: 20,
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                <PlusIcon color="#fff" />
              </span>
              <span className="font-sans" style={{ fontSize: 14, fontWeight: 600 }}>
                Создать
              </span>
            </button>
          </div>

          {personMoments.length === 0 ? (
            <div
              className="surface-card-strong"
              style={{
                marginTop: 14,
                backgroundColor: 'var(--moment-surface)',
                borderRadius: 24,
                padding: '34px 24px',
                textAlign: 'center',
              }}
            >
              <div
                className="mx-auto flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  backgroundColor: 'rgba(217, 139, 82, 0.12)',
                  color: 'var(--accent)',
                }}
              >
                <PlusIcon color="var(--accent)" />
              </div>

              <p
                className="font-sans"
                style={{
                  margin: '16px 0 0',
                  color: 'var(--text)',
                  fontSize: 17,
                  fontWeight: 700,
                }}
              >
                Пока нет сохранённых моментов
              </p>
              <p
                className="font-sans"
                style={{
                  margin: '6px 0 0',
                  color: 'var(--mid)',
                  fontSize: 14,
                  lineHeight: 1.5,
                }}
              >
                Создай первый момент с {person.name}, и он появится здесь.
              </p>

              <button
                type="button"
                onClick={() => setShowAddMoment(true)}
                className="font-sans transition-opacity active:opacity-70"
                style={{
                  marginTop: 20,
                  border: 'none',
                  borderRadius: 9999,
                  backgroundColor: 'var(--accent)',
                  color: '#fff',
                  fontSize: 15,
                  fontWeight: 700,
                  padding: '14px 20px',
                  boxShadow: 'var(--shadow-accent)',
                }}
              >
                Создать первый момент
              </button>
            </div>
          ) : (
            <div
              className="surface-card-strong"
              style={{
                marginTop: 14,
                backgroundColor: 'var(--moment-surface)',
                borderRadius: 24,
                padding: 16,
              }}
            >
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: personMoments.length === 1 ? '1fr' : 'repeat(2, minmax(0, 1fr))',
                }}
              >
                {personMoments.map((moment) => (
                  <PersonMomentCard
                    key={moment.id}
                    moment={moment}
                    featured={personMoments.length === 1}
                    onClick={() => navigate(`/moment/${moment.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <div
        className="px-4"
        style={{
          paddingTop: 16,
          paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
          background: 'linear-gradient(180deg, rgba(247,244,240,0) 0%, rgba(247,244,240,0.9) 22%, var(--base) 44%)',
        }}
      >
        <div
          className="surface-card-strong flex items-center gap-3"
          style={{
            borderRadius: 28,
            padding: 12,
          }}
        >
          <button
            type="button"
            onClick={handleStoryPress}
            className="font-sans flex-1 transition-opacity active:opacity-70"
            style={{
              border: 'none',
              borderRadius: 9999,
              backgroundColor: 'var(--accent)',
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              padding: '16px 18px',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            Сторис с {person.name}
          </button>

          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="font-sans transition-opacity active:opacity-70"
            style={{
              border: '1px solid rgba(160, 94, 44, 0.12)',
              borderRadius: 9999,
              backgroundColor: 'var(--base)',
              color: 'var(--text)',
              fontSize: 15,
              fontWeight: 600,
              padding: '16px 18px',
            }}
          >
            Редактировать
          </button>
        </div>
      </div>

      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title="Действия">
          <div className="px-4 pb-4 flex flex-col gap-4">
            <SheetActionButton
              label="Редактировать"
              onClick={() => {
                setShowMenu(false)
                setShowEdit(true)
              }}
            >
              <EditIcon color="var(--deep)" />
            </SheetActionButton>

            <SheetActionButton
              label="Удалить человека"
              danger
              onClick={async () => {
                setShowMenu(false)

                try {
                  await handleDeletePerson()
                } catch (err) {
                  console.error('[DeletePerson]', err)
                }
              }}
            >
              <TrashIcon color="#D45757" />
            </SheetActionButton>

            <button
              type="button"
              onClick={() => setShowMenu(false)}
              className="font-sans transition-opacity active:opacity-60"
              style={{
                border: 'none',
                background: 'none',
                color: 'var(--mid)',
                fontSize: 15,
                fontWeight: 500,
                padding: '10px 0 4px',
              }}
            >
              Отмена
            </button>
          </div>
        </BottomSheet>
      )}

      {showEdit && (
        <EditPersonSheet
          person={person}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
          onDelete={handleDeletePerson}
        />
      )}

      {showAddMoment && (
        <AddMoment
          onClose={() => setShowAddMoment(false)}
          initialPeopleIds={[person.id]}
          afterSave={(moment) => {
            addMomentStore(moment)
            setShowAddMoment(false)
          }}
        />
      )}
    </div>
  )
}
