import { useMemo, useState } from 'react'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { deleteCapsuleSlot, saveCapsuleSlot, updatePublicProfile } from '../lib/api'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'
import { PublicProfileContent } from './PublicProfile'

function uniqueMonths(moments) {
  return new Set(
    moments.map((moment) => {
      const date = new Date(moment.created_at)
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''

  const date = new Date(createdAt)
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function CapsuleTile({ slot, index, onEmpty, onFilled }) {
  const [showMenu, setShowMenu] = useState(false)

  if (!slot) {
    return (
      <button
        type="button"
        onClick={onEmpty}
        className="flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: 20,
          border: '1.5px dashed var(--accent-light)',
          background: 'repeating-linear-gradient(45deg, var(--card-alt), var(--card-alt) 4px, var(--base) 4px, var(--base) 12px)',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: 'var(--accent-light)' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 5v14M5 12h14" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="font-sans" style={{ color: 'var(--soft)', fontSize: 12, fontWeight: 500 }}>
          Добавить
        </span>
      </button>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowMenu(true)}
        className="transition-opacity active:opacity-80"
        style={{
          position: 'relative',
          aspectRatio: '3 / 4',
          border: 'none',
          borderRadius: 20,
          overflow: 'hidden',
          padding: 0,
          boxShadow: 'var(--shadow-card)',
          background: slot.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
        }}
      >
        {slot.photo_url && (
          <img src={slot.photo_url} alt={slot.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        )}

        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.6) 0%, transparent 58%)' }} />

        <div
          className="font-sans"
          style={{
            position: 'absolute',
            top: 10,
            left: 10,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            borderRadius: 8,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
            padding: '2px 8px',
          }}
        >
          0{index + 1}
        </div>

        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <div
            className="font-sans"
            style={{
              display: 'inline-flex',
              maxWidth: '100%',
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 999,
              boxShadow: '0 1px 6px rgba(0,0,0,0.14)',
              color: 'var(--text)',
              fontSize: 12,
              fontWeight: 500,
              overflow: 'hidden',
              padding: '4px 10px',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {slot.title || 'Без названия'}
          </div>
        </div>
      </button>

      {showMenu && (
        <BottomSheet onClose={() => setShowMenu(false)} title="Капсула">
          <div className="px-5 pb-4">
            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                onEmpty()
              }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'var(--base)',
                marginBottom: 8,
                padding: '16px 18px',
              }}
            >
              <div
                className="flex items-center justify-center rounded-[14px]"
                style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)' }}
              >
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>↻</span>
              </div>
              <span className="font-sans" style={{ color: 'var(--text)', fontSize: 17, fontWeight: 500 }}>
                Заменить
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMenu(false)
                onFilled()
              }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'rgba(224, 82, 82, 0.07)',
                padding: '16px 18px',
              }}
            >
              <div
                className="flex items-center justify-center rounded-[14px]"
                style={{ width: 40, height: 40, backgroundColor: 'rgba(224, 82, 82, 0.12)' }}
              >
                <span style={{ color: '#E05252', fontSize: 18 }}>✕</span>
              </div>
              <span className="font-sans" style={{ color: '#E05252', fontSize: 17, fontWeight: 500 }}>
                Убрать из капсулы
              </span>
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}

function PickMomentSheet({ onClose, onPick, onCreateNew }) {
  const moments = useAppStore((state) => state.moments)
  const currentUser = useAppStore((state) => state.currentUser)
  const ownMoments = moments.filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)

  return (
    <BottomSheet onClose={onClose} title="В капсулу">
      <div className="pb-3">
        <button
          type="button"
          onClick={() => {
            onClose()
            onCreateNew()
          }}
          className="flex w-full items-center gap-3 px-5 py-4 text-left transition-opacity active:opacity-60"
          style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
        >
          <div
            className="flex items-center justify-center rounded-[10px]"
            style={{ width: 36, height: 36, backgroundColor: 'var(--accent)', color: '#fff', flexShrink: 0 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
              Создать момент
            </p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 1 }}>
              Новый, сразу в капсулу
            </p>
          </div>
          <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
        </button>

        {ownMoments.length > 0 && (
          <p
            className="font-sans font-semibold"
            style={{
              color: 'var(--soft)',
              fontSize: 12,
              letterSpacing: '0.14em',
              margin: '12px 20px 8px',
              textTransform: 'uppercase',
            }}
          >
            Или выбери существующий
          </p>
        )}

        {ownMoments.length === 0 && (
          <p className="font-sans text-center" style={{ color: 'var(--mid)', fontSize: 13, padding: '20px 0 8px' }}>
            Пока нет моментов, создай первый выше.
          </p>
        )}

        {ownMoments.map((moment) => (
          <button
            key={moment.id}
            type="button"
            onClick={() => {
              onPick(moment)
              onClose()
            }}
            className="flex w-full items-center gap-3 px-5 py-3 text-left transition-opacity active:opacity-60"
            style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                overflow: 'hidden',
                flexShrink: 0,
                background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
              }}
            >
              {moment.photo_url && (
                <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <span
              className="font-sans flex-1"
              style={{
                color: 'var(--text)',
                fontSize: 14,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {moment.title}
            </span>
            <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

function PublicProfileToggle({ checked, disabled, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      className="flex items-center transition-opacity active:opacity-70"
      style={{
        width: 50,
        height: 30,
        padding: 3,
        borderRadius: 999,
        border: 'none',
        backgroundColor: checked ? 'var(--accent)' : 'var(--surface)',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: '#fff',
          boxShadow: '0 2px 8px rgba(23,20,14,0.18)',
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          transition: 'transform 0.18s ease',
        }}
      />
    </button>
  )
}

function ChevronRightIcon({ color = 'var(--soft)' }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path
        d="M2 2l6 6-6 6"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function BackArrowIcon({ color = 'currentColor' }) {
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

function PublicProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 18.5a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 7.5h2.5M19.75 6.25v2.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PublicProfileSheet({ currentUser, publicMoments, onClose, onSaved }) {
  const [enabled, setEnabled] = useState(currentUser?.public_profile_enabled === true)
  const [bio, setBio] = useState(currentUser?.bio ?? '')
  const [featuredMomentId, setFeaturedMomentId] = useState(() => (
    publicMoments.some((moment) => moment.id === currentUser?.featured_moment_id)
      ? currentUser.featured_moment_id
      : null
  ))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function handleSave() {
    if (!currentUser?.id || saving) return

    setSaving(true)
    setError(null)

    try {
      const selectedFeaturedMomentId = publicMoments.some((moment) => moment.id === featuredMomentId)
        ? featuredMomentId
        : null

      const updated = await updatePublicProfile(currentUser.id, {
        publicProfileEnabled: enabled,
        bio,
        featuredMomentId: selectedFeaturedMomentId,
      })

      onSaved(updated)
      onClose()
    } catch (saveError) {
      console.error('[PublicProfile] save settings error:', saveError)
      setError('Не удалось сохранить. Попробуй еще раз.')
      setSaving(false)
    }
  }

  return (
    <BottomSheet onClose={onClose} title="Публичный профиль">
      <div className="px-5 pb-5">
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 18 }}>
          <div className="min-w-0">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
              Показывать профиль другим
            </p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 3 }}>
              Другие смогут видеть ваши открытые воспоминания
            </p>
          </div>

          <PublicProfileToggle
            checked={enabled}
            disabled={saving}
            onChange={() => setEnabled((prev) => !prev)}
            label="Показывать профиль другим"
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <p
            className="font-sans font-semibold"
            style={{ color: 'var(--soft)', fontSize: 12, letterSpacing: '0.14em', marginBottom: 10, textTransform: 'uppercase' }}
          >
            О себе
          </p>
          <textarea
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="Пара слов о себе"
            rows={2}
            maxLength={140}
            className="w-full resize-none font-sans outline-none"
            style={{
              backgroundColor: 'var(--base)',
              borderRadius: 16,
              border: 'none',
              color: 'var(--text)',
              fontSize: 14,
              lineHeight: 1.5,
              padding: '14px 16px',
              boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <p
            className="font-sans font-semibold"
            style={{ color: 'var(--soft)', fontSize: 12, letterSpacing: '0.14em', marginBottom: 10, textTransform: 'uppercase' }}
          >
            Главное воспоминание
          </p>

          {publicMoments.length === 0 ? (
            <div
              className="font-sans"
              style={{
                backgroundColor: 'var(--base)',
                borderRadius: 16,
                color: 'var(--mid)',
                fontSize: 13,
                lineHeight: 1.5,
                padding: '14px 16px',
              }}
            >
              Сначала сделай хотя бы один момент открытым, и его можно будет выбрать здесь.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setFeaturedMomentId(null)}
                className="flex w-full items-center justify-between rounded-[16px] text-left transition-opacity active:opacity-60"
                style={{
                  border: featuredMomentId ? '1.5px solid transparent' : '1.5px solid rgba(160, 94, 44, 0.32)',
                  backgroundColor: featuredMomentId ? 'var(--base)' : 'rgba(217, 139, 82, 0.08)',
                  color: 'var(--text)',
                  padding: '13px 15px',
                }}
              >
                <span className="font-sans" style={{ fontSize: 14, fontWeight: 500 }}>
                  Без главного воспоминания
                </span>
                {!featuredMomentId && (
                  <span className="font-sans" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                    Выбрано
                  </span>
                )}
              </button>

              {publicMoments.map((moment) => {
                const isSelected = featuredMomentId === moment.id

                return (
                  <button
                    key={moment.id}
                    type="button"
                    onClick={() => setFeaturedMomentId(moment.id)}
                    className="flex w-full items-center gap-3 rounded-[16px] text-left transition-opacity active:opacity-60"
                    style={{
                      border: isSelected ? '1.5px solid rgba(160, 94, 44, 0.32)' : '1.5px solid transparent',
                      backgroundColor: isSelected ? 'rgba(217, 139, 82, 0.08)' : 'var(--base)',
                      padding: '11px 12px',
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        overflow: 'hidden',
                        flexShrink: 0,
                        background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
                      }}
                    >
                      {moment.photo_url && (
                        <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="font-sans"
                        style={{
                          color: 'var(--text)',
                          fontSize: 14,
                          fontWeight: 600,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {moment.title || 'Без названия'}
                      </p>
                      <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 2 }}>
                        {sinceLabel(moment.created_at)}
                      </p>
                    </div>

                    {isSelected && (
                      <span className="font-sans" style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>
                        Выбрано
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {error && (
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252', marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: saving ? 'var(--surface)' : 'var(--accent)',
            color: saving ? 'var(--soft)' : '#fff',
            borderRadius: 9999,
            padding: '13px 0',
            fontSize: 15,
            border: 'none',
            marginBottom: 10,
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Отмена
        </button>
      </div>
    </BottomSheet>
  )
}

function PublicProfileEntryCard({ onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface-card flex w-full items-center gap-3 rounded-[24px] text-left transition-opacity active:opacity-60"
      style={{
        padding: '16px 18px',
        marginBottom: 18,
        backgroundColor: 'var(--moment-surface)',
        border: 'none',
      }}
      data-testid="profile-public-entry"
    >
      <div
        className="flex items-center justify-center rounded-[14px] flex-shrink-0"
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'var(--base)',
          color: 'var(--accent)',
        }}
      >
        <PublicProfileIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
          Публичный профиль
        </p>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>
          Что видят другие
        </p>
      </div>

      <div className="flex items-center justify-center flex-shrink-0" style={{ color: 'var(--soft)' }}>
        <ChevronRightIcon />
      </div>
    </button>
  )
}

function PublicPreviewSettingsCard({ checked, disabled, onChange, onEdit, error }) {
  return (
    <section
      className="surface-card rounded-[24px]"
      style={{ padding: 16, backgroundColor: 'var(--moment-surface)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="flex items-center justify-center rounded-[14px] flex-shrink-0"
          style={{
            width: 40,
            height: 40,
            backgroundColor: 'var(--base)',
            color: 'var(--accent)',
          }}
        >
          <PublicProfileIcon />
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
            Показывать профиль другим
          </p>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>
            Профиль виден всем
          </p>
        </div>

        <PublicProfileToggle
          checked={checked}
          disabled={disabled}
          onChange={onChange}
          label={'\u041f\u043e\u043a\u0430\u0437\u044b\u0432\u0430\u0442\u044c \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u0434\u0440\u0443\u0433\u0438\u043c'}
        />
      </div>

      {error && (
        <p className="font-sans" style={{ color: '#E05252', fontSize: 12, marginTop: 12 }}>
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={onEdit}
        data-testid="public-profile-edit-button"
        className="font-sans transition-opacity active:opacity-60"
        style={{
          marginTop: 12,
          padding: 0,
          border: 'none',
          background: 'none',
          color: 'var(--accent)',
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Редактировать
      </button>
    </section>
  )
}

export default function Profile() {
  const currentUser = useAppStore((state) => state.currentUser)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const moments = useAppStore((state) => state.moments)
  const people = useAppStore((state) => state.people)
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const removeFromCapsule = useAppStore((state) => state.removeFromCapsule)

  const [pickSlot, setPickSlot] = useState(null)
  const [addMomentSlot, setAddMomentSlot] = useState(null)
  const [showPublicProfileSheet, setShowPublicProfileSheet] = useState(false)
  const [savingPublicVisibility, setSavingPublicVisibility] = useState(false)
  const [publicProfileError, setPublicProfileError] = useState(null)
  const [activeScreen, setActiveScreen] = useState(0)

  const ownMoments = useMemo(
    () => moments.filter((moment) => !moment.isShared && moment.user_id === currentUser?.id),
    [moments, currentUser?.id],
  )
  const publicMoments = useMemo(
    () => ownMoments.filter((moment) => moment.visibility === 'public'),
    [ownMoments],
  )

  const stats = useMemo(() => ({
    total: ownMoments.length,
    months: uniqueMonths(ownMoments),
    people: people.length,
  }), [ownMoments, people])
  const publicProfileEnabled = currentUser?.public_profile_enabled === true

  async function handleAddToCapsule(slotIndex, moment) {
    addToCapsule(slotIndex, moment)

    try {
      await saveCapsuleSlot(currentUser.id, slotIndex, moment.id)
    } catch (error) {
      console.error('[Capsule] save error:', error)
    }
  }

  async function handleRemoveFromCapsule(slotIndex) {
    removeFromCapsule(slotIndex)

    try {
      await deleteCapsuleSlot(currentUser.id, slotIndex)
    } catch (error) {
      console.error('[Capsule] delete error:', error)
    }
  }

  async function handleTogglePublicProfile() {
    if (!currentUser?.id || savingPublicVisibility) return

    setSavingPublicVisibility(true)
    setPublicProfileError(null)

    try {
      const updated = await updatePublicProfile(currentUser.id, {
        publicProfileEnabled: !publicProfileEnabled,
      })
      setCurrentUser(updated)
    } catch (error) {
      console.error('[PublicProfile] toggle error:', error)
      setPublicProfileError('\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u043d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438.')
    } finally {
      setSavingPublicVisibility(false)
    }
  }

  const name = currentUser?.name || '\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c'
  const since = sinceLabel(currentUser?.created_at)

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex-1 overflow-hidden">
        {activeScreen === 0 ? (
          <div
            className="flex h-full min-w-0 flex-col overflow-hidden"
            data-testid="profile-main-screen"
            aria-hidden={false}
          >
            <div className="px-4 pt-topbar" style={{ paddingBottom: 20 }}>
              <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 17, fontWeight: 600 }}>
                Профиль
              </span>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 108 }}>
              <section
                className="surface-card rounded-[24px]"
                style={{ padding: 20, marginBottom: 12, backgroundColor: 'var(--moment-surface)' }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                    style={{
                      width: 64,
                      height: 64,
                      background: currentUser?.photo_url ? 'transparent' : 'linear-gradient(160deg, #854E2A 0%, #D98B52 58%, #F0C88E 100%)',
                      border: '3px solid rgba(255,255,255,0.8)',
                      color: '#fff',
                      fontSize: 24,
                      fontWeight: 700,
                    }}
                  >
                    {currentUser?.photo_url ? (
                      <img
                        src={currentUser.photo_url}
                        alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                        }}
                      />
                    ) : (
                      name[0]?.toUpperCase() ?? 'M'
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="font-sans truncate" style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, margin: 0 }}>
                      {name}
                    </p>
                    {since && (
                      <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 3 }}>
                        с memi с {since}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2" style={{ marginTop: 18 }}>
                  {[
                    { value: stats.total, label: pluralRu(stats.total, 'момент', 'момента', 'моментов') },
                    { value: stats.months, label: pluralRu(stats.months, 'месяц', 'месяца', 'месяцев') },
                    { value: stats.people, label: pluralRu(stats.people, 'человек', 'человека', 'человек') },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex flex-col items-center rounded-[14px]"
                      style={{ backgroundColor: 'var(--base)', padding: '12px 8px' }}
                    >
                      <span className="font-serif" style={{ color: 'var(--accent)', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>
                        {item.value}
                      </span>
                      <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 11, marginTop: 4 }}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <PublicProfileEntryCard onOpen={() => setActiveScreen(1)} />

              <section>
                <div className="flex items-baseline gap-2" style={{ marginBottom: 14 }}>
                  <span className="font-sans" style={{ color: 'var(--text)', fontSize: 17, fontWeight: 700 }}>
                    Капсула
                  </span>
                  <span className="font-sans" style={{ color: 'var(--mid)', fontSize: 13 }}>
                    · моменты на всю жизнь
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {capsule.map((slot, index) => (
                    <CapsuleTile
                      key={index}
                      slot={slot}
                      index={index}
                      onEmpty={() => setPickSlot(index)}
                      onFilled={() => handleRemoveFromCapsule(index)}
                    />
                  ))}
                </div>
              </section>
            </div>
          </div>
        ) : (
          <div
            className="flex h-full min-w-0 flex-col overflow-hidden"
            data-testid="profile-preview-screen"
            aria-hidden={false}
          >
            <div className="px-4 pt-topbar" style={{ paddingBottom: 8 }}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveScreen(0)}
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
                  <BackArrowIcon />
                  Назад
                </button>

                <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                  Публичный профиль
                </span>

                <div style={{ width: 60 }} />
              </div>
            </div>

            <PublicProfileContent
              profileUser={currentUser}
              moments={publicMoments}
              publicMomentsTotal={publicMoments.length}
              displayName={name}
              statusStat={{
                value: publicProfileEnabled ? '✓' : '○',
                label: publicProfileEnabled ? 'открыт' : 'скрыт',
                valueColor: publicProfileEnabled ? 'var(--deep)' : 'var(--soft)',
              }}
              topContent={(
                <PublicPreviewSettingsCard
                  checked={publicProfileEnabled}
                  disabled={savingPublicVisibility}
                  onChange={handleTogglePublicProfile}
                  onEdit={() => {
                    setPublicProfileError(null)
                    setShowPublicProfileSheet(true)
                  }}
                  error={publicProfileError}
                />
              )}
              contentPaddingBottom={108}
            />
          </div>
        )}
      </div>

      <BottomNav active="profile" />

      {pickSlot !== null && (
        <PickMomentSheet
          onClose={() => setPickSlot(null)}
          onPick={(moment) => handleAddToCapsule(pickSlot, moment)}
          onCreateNew={() => setAddMomentSlot(pickSlot)}
        />
      )}

      {addMomentSlot !== null && (
        <AddMoment
          onClose={() => setAddMomentSlot(null)}
          afterSave={(moment) => {
            handleAddToCapsule(addMomentSlot, moment)
            setAddMomentSlot(null)
          }}
        />
      )}

      {showPublicProfileSheet && (
        <PublicProfileSheet
          currentUser={currentUser}
          publicMoments={publicMoments}
          onClose={() => setShowPublicProfileSheet(false)}
          onSaved={(updatedUser) => {
            setCurrentUser(updatedUser)
            setPublicProfileError(null)
          }}
        />
      )}
    </div>
  )
}
