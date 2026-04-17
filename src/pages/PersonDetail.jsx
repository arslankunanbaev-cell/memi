import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'
import { deletePerson, updatePerson } from '../lib/api'
import { assertSupabase } from '../lib/supabase'
import BottomSheet from '../components/BottomSheet'
import AddMoment from './AddMoment'
import { tgHaptic } from '../lib/telegram'
import { plural } from '../lib/ruPlural'

const CURRENT_YEAR = new Date().getFullYear()
const YEAR_OPTIONS = Array.from({ length: CURRENT_YEAR - 1949 }, (_, i) => CURRENT_YEAR - i)

function yearsKnown(metYear) {
  if (!metYear) return null
  return CURRENT_YEAR - metYear
}

function uniqueMonths(moments) {
  return new Set(moments.map((m) => {
    const d = new Date(m.created_at)
    return `${d.getFullYear()}-${d.getMonth()}`
  })).size
}

// ── EditPersonSheet ───────────────────────────────────────────────────────────
function EditPersonSheet({ person, onClose, onSaved, onDeleted }) {
  const [name, setName]           = useState(person.name)
  const [metYear, setMetYear]     = useState(person.met_year ?? '')
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [error, setError]         = useState(null)
  const [photoFile, setPhotoFile]       = useState(null)
  const [photoPreview, setPhotoPreview] = useState(person.photo_url ?? null)
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
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
      if (photoFile) {
        const sb = assertSupabase()
        const ext = photoFile.name.split('.').pop() || 'jpg'
        const path = `${person.user_id}/people/${Date.now()}.${ext}`
        const { error: uploadError } = await sb.storage
          .from('photos').upload(path, photoFile, { contentType: photoFile.type })
        if (uploadError) throw uploadError
        const { data: urlData } = sb.storage.from('photos').getPublicUrl(path)
        photo_url = urlData.publicUrl
      }
      const updated = await updatePerson(person.id, { name: name.trim(), photoUrl: photo_url, metYear: metYear ? Number(metYear) : null })
      onSaved(updated)
      onClose()
    } catch (err) {
      console.error('[EditPerson] ❌', err)
      setError('Не удалось сохранить. Попробуй ещё раз.')
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (deleting) return
    const confirmed = window.confirm(`Удалить ${person.name}? Моменты останутся.`)
    if (!confirmed) return
    tgHaptic('heavy')
    setDeleting(true)
    try {
      await deletePerson(person.id)
      onDeleted(person.id)
      onClose()
    } catch (err) {
      console.error('[DeletePerson] ❌', err)
      setError('Не удалось удалить.')
      setDeleting(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Редактировать">
      <div className="px-5 flex flex-col gap-4 pb-5">
        {/* Фото */}
        <div className="flex justify-center pt-1">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center justify-center transition-opacity active:opacity-70"
            style={{
              width: 64, height: 64, borderRadius: '50%', overflow: 'hidden',
              border: photoPreview ? 'none' : '2px dashed var(--accent)',
              backgroundColor: photoPreview ? 'transparent' : 'var(--surface)',
            }}
          >
            {photoPreview
              ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 24 }}>📷</span>}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Имя */}
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Имя"
          className="w-full font-sans outline-none"
          style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: 'var(--text)', border: 'none' }}
        />

        {/* Год знакомства */}
        <div className="flex flex-col gap-1">
          <label className="font-sans" style={{ fontSize: 12, color: 'var(--mid)' }}>Год знакомства</label>
          <select
            value={metYear}
            onChange={(e) => setMetYear(e.target.value)}
            className="w-full font-sans outline-none"
            style={{ backgroundColor: 'var(--surface)', borderRadius: 10, padding: '11px 14px', fontSize: 15, color: metYear ? 'var(--text)' : 'var(--soft)', border: 'none', appearance: 'none', WebkitAppearance: 'none' }}
          >
            <option value="">Не указан</option>
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        {error && <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252' }}>{error}</p>}

        {/* Сохранить */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: name.trim() && !saving ? 'var(--accent)' : 'var(--surface)',
            color: name.trim() && !saving ? '#fff' : 'var(--soft)',
            borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none',
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>

        {/* Удалить */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full font-sans transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--surface)', color: '#E05252', borderRadius: 9999, padding: '13px 0', fontSize: 15, border: 'none' }}
        >
          {deleting ? 'Удаление...' : `Удалить ${person.name}`}
        </button>

        <button onClick={onClose} className="font-sans transition-opacity active:opacity-60" style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}>
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

// ── PersonDetail ──────────────────────────────────────────────────────────────
export default function PersonDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const people            = useAppStore((s) => s.people)
  const moments           = useAppStore((s) => s.moments)
  const addMomentStore    = useAppStore((s) => s.addMoment)
  const updatePersonStore = useAppStore((s) => s.updatePerson)
  const removePersonStore = useAppStore((s) => s.removePerson)

  const [showMenu, setShowMenu]       = useState(false)
  const [showEdit, setShowEdit]       = useState(false)
  const [showAddMoment, setShowAddMoment] = useState(false)

  const person = people.find((p) => p.id === id)

  const personMoments = moments.filter(
    (m) => (m.people ?? []).some((p) => p.id === id)
  )

  if (!person) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4" style={{ backgroundColor: 'var(--base)' }}>
        <span style={{ fontSize: 36 }}>👤</span>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 14 }}>Человек не найден</p>
        <button onClick={() => navigate('/people')} style={{ color: 'var(--accent)', background: 'none', border: 'none', fontSize: 14 }}>
          ← К людям
        </button>
      </div>
    )
  }

  const known = yearsKnown(person.met_year)
  const stats = {
    total: personMoments.length,
    months: uniqueMonths(personMoments),
    known,
  }

  const momentCount = personMoments.length

  function handleSaved(updated) {
    updatePersonStore(updated.id, updated)
  }

  function handleDeleted(personId) {
    removePersonStore(personId)
    navigate('/people', { replace: true })
  }

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--base)' }}>
      {/* ── Шапка ─────────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', height: 120, background: 'linear-gradient(135deg, #EDE6DC, #D4B896)', flexShrink: 0 }}>
        {/* Кнопка назад */}
        <button
          onClick={() => navigate('/people')}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'max(0.75rem, env(safe-area-inset-top))',
            left: 16,
            width: 36, height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.85)',
            border: 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#3D2B1A" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>

        {/* Три точки */}
        <button
          onClick={() => setShowMenu(true)}
          className="flex items-center justify-center transition-opacity active:opacity-60"
          style={{
            position: 'absolute',
            top: 'max(0.75rem, env(safe-area-inset-top))',
            right: 16,
            width: 36, height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.85)',
            border: 'none',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span style={{ fontSize: 16, letterSpacing: '-1px', color: '#3D2B1A' }}>•••</span>
        </button>

        {/* Аватар — поверх шапки, выходит за нижний край */}
        <div
          className="flex items-center justify-center rounded-full font-serif flex-shrink-0"
          style={{
            position: 'absolute',
            bottom: -48,
            left: 16,
            width: 96, height: 96,
            borderRadius: '50%',
            border: '3px solid var(--base)',
            backgroundColor: person.photo_url ? 'transparent' : (person.avatar_color ?? 'var(--accent)'),
            overflow: 'hidden',
            zIndex: 10,
          }}
        >
          {person.photo_url ? (
            <img src={person.photo_url} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 36, color: '#fff', fontWeight: 300 }}>{person.name[0].toUpperCase()}</span>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pb-28" style={{ paddingTop: 60 }}>
        <div className="px-4 flex flex-col gap-4">
          {/* Имя + моменты */}
          <div>
            <h1 className="font-serif" style={{ fontSize: 26, color: 'var(--text)', fontWeight: 400 }}>{person.name}</h1>
            <p className="font-sans" style={{ fontSize: 10, color: 'var(--soft)', marginTop: 2 }}>
              {momentCount} {plural.момент(momentCount)} вместе
            </p>
          </div>

          {/* Статистика */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              { label: plural.момент(stats.total),  value: stats.total },
              { label: plural.месяц(stats.months),  value: stats.months },
              { label: stats.known != null ? plural.год(stats.known) : 'знакомы', value: stats.known ?? '—' },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center py-3 rounded-xl"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <span
                  className="font-serif"
                  style={{ fontSize: typeof s.value === 'number' ? 22 : 16, color: 'var(--accent)', fontWeight: 300, lineHeight: 1.1 }}
                >
                  {s.value}
                </span>
                <span className="font-sans" style={{ fontSize: 9, color: 'var(--mid)', marginTop: 2 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Все моменты */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="font-sans font-medium" style={{ fontSize: 12, color: 'var(--text)' }}>Все моменты</p>
              <button
                onClick={() => setShowAddMoment(true)}
                className="flex items-center gap-1 transition-opacity active:opacity-60"
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{ width: 22, height: 22, backgroundColor: 'var(--accent)' }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </div>
                <span className="font-sans" style={{ fontSize: 11, color: 'var(--accent)' }}>Создать</span>
              </button>
            </div>

            {personMoments.length === 0 ? (
              <button
                onClick={() => setShowAddMoment(true)}
                className="w-full flex flex-col items-center py-8 gap-2 transition-opacity active:opacity-70"
                style={{ background: 'none', border: '1.5px dashed rgba(217,139,82,0.35)', borderRadius: 14 }}
              >
                <span style={{ fontSize: 28 }}>✨</span>
                <p className="font-sans font-medium" style={{ fontSize: 13, color: 'var(--accent)' }}>Создать первый момент</p>
                <p className="font-sans" style={{ fontSize: 11, color: 'var(--soft)' }}>с {person.name}</p>
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
                {personMoments.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => navigate(`/moment/${m.id}`)}
                    className="active:opacity-70 transition-opacity"
                    style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: 'none', padding: 0, cursor: 'pointer', backgroundColor: 'var(--surface)' }}
                  >
                    {m.photo_url ? (
                      <img src={m.photo_url} alt={m.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #C8A478, #8C5830)' }} />
                    )}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.6) 0%, transparent 55%)' }} />
                    <span
                      className="font-serif"
                      style={{ position: 'absolute', bottom: 4, left: 4, right: 4, fontSize: 9, color: '#fff', fontWeight: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    >
                      {m.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Кнопки снизу ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-3 px-4"
        style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))', paddingTop: 8 }}
      >
        <button
          onClick={() => window.Telegram?.WebApp?.showAlert('Скоро!')}
          className="flex-1 font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 9999, padding: '13px 0', fontSize: 14, border: 'none' }}
        >
          Сторис с {person.name}
        </button>
        <button
          onClick={() => setShowEdit(true)}
          className="font-sans font-medium transition-opacity active:opacity-70"
          style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', borderRadius: 9999, padding: '13px 18px', fontSize: 14, border: 'none' }}
        >
          Редактировать
        </button>
      </div>

      {/* ── Меню (три точки) ──────────────────────────────────────────────── */}
      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)}>
          <div>
            <button
              onClick={() => { setShowMenu(false); setShowEdit(true) }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none', borderBottom: '0.5px solid var(--surface)' }}
            >
              <span style={{ fontSize: 18 }}>✏️</span>
              <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)' }}>Редактировать</span>
            </button>
            <button
              onClick={async () => {
                setShowMenu(false)
                const confirmed = window.confirm(`Удалить ${person.name}? Моменты останутся.`)
                if (!confirmed) return
                tgHaptic('heavy')
                try {
                  await deletePerson(person.id)
                  removePersonStore(person.id)
                  navigate('/people', { replace: true })
                } catch (err) {
                  console.error('[DeletePerson]', err)
                }
              }}
              className="w-full flex items-center gap-3 px-5 py-4 transition-opacity active:opacity-60"
              style={{ background: 'none', border: 'none' }}
            >
              <span style={{ fontSize: 18 }}>🗑️</span>
              <span className="font-sans" style={{ fontSize: 15, color: '#E05252' }}>Удалить человека</span>
            </button>
          </div>
        </BottomSheet>
      )}

      {/* ── EditPersonSheet ────────────────────────────────────────────────── */}
      {showEdit && (
        <EditPersonSheet
          person={person}
          onClose={() => setShowEdit(false)}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
        />
      )}

      {/* ── AddMoment с предвыбранным человеком ───────────────────────────── */}
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
