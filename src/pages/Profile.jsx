import { useMemo, useState } from 'react'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { deleteCapsuleSlot, openStarsPayment, saveCapsuleSlot, updatePublicProfile } from '../lib/api'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'
import { PublicProfileContent } from './PublicProfile'

function uniqueMonths(moments) {
  return new Set(
    moments.map((moment) => {
      const date = new Date(getMomentDisplayAt(moment))
      return `${date.getFullYear()}-${date.getMonth()}`
    }),
  ).size
}

function sinceLabel(createdAt) {
  if (!createdAt) return ''

  const date = new Date(createdAt)
  return `${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()}`
}

function EditPencilIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14.5 5.5l4 4"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.75V20h3.25L18 9.25 14.75 6 4 16.75Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13 7.75 16.25 11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
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
          <div className="px-4 pb-4">
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
  const ownMoments = moments
    .filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)
    .slice()
    .sort(compareMomentsByDisplayAt)

  return (
    <BottomSheet onClose={onClose} title="В капсулу">
      <div className="pb-3">
        <button
          type="button"
          onClick={() => {
            onClose()
            onCreateNew()
          }}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-60"
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
              margin: '12px 16px 8px',
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
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-60"
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

function MoreIcon({ color = '#3D2B1A' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.8" fill={color} />
      <circle cx="12" cy="12" r="1.8" fill={color} />
      <circle cx="18" cy="12" r="1.8" fill={color} />
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
      <div className="px-4 pb-5">
        <div className="flex items-start justify-between gap-3" style={{ marginBottom: 20 }}>
          <div className="min-w-0">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>
              Показывать профиль другим
            </p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 4 }}>
              {'\u0415\u0441\u043b\u0438 \u043f\u0440\u043e\u0444\u0438\u043b\u044c \u043e\u0442\u043a\u0440\u044b\u0442, \u0434\u0440\u0443\u0437\u044c\u044f \u0443\u0432\u0438\u0434\u044f\u0442 \u043c\u043e\u043c\u0435\u043d\u0442\u044b \u0441 \u0434\u043e\u0441\u0442\u0443\u043f\u043e\u043c \u00ab\u0412\u0441\u0435\u043c \u0434\u0440\u0443\u0437\u044c\u044f\u043c\u00bb'}
            </p>
          </div>

          <PublicProfileToggle
            checked={enabled}
            disabled={saving}
            onChange={() => setEnabled((prev) => !prev)}
            label="Показывать профиль другим"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
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
            className="w-full resize-none profile-bio-copy outline-none"
            style={{
              backgroundColor: 'var(--base)',
              borderRadius: 16,
              border: 'none',
              color: 'var(--text)',
              padding: '14px 16px',
              boxShadow: 'inset 0 0 0 1px rgba(160, 94, 44, 0.08)',
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
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
              {'\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0441\u0434\u0435\u043b\u0430\u0439 \u0445\u043e\u0442\u044f \u0431\u044b \u043e\u0434\u0438\u043d \u043c\u043e\u043c\u0435\u043d\u0442 \u0432\u0438\u0434\u0438\u043c\u044b\u043c \u0434\u043b\u044f \u0434\u0440\u0443\u0437\u0435\u0439, \u0438 \u0435\u0433\u043e \u043c\u043e\u0436\u043d\u043e \u0431\u0443\u0434\u0435\u0442 \u0432\u044b\u0431\u0440\u0430\u0442\u044c \u0437\u0434\u0435\u0441\u044c.'}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
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
                        {sinceLabel(getMomentDisplayAt(moment))}
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
          <p className="font-sans text-center" style={{ fontSize: 12, color: '#E05252', marginBottom: 14 }}>
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
            marginBottom: 12,
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

// ── Premium ────────────────────────────────────────────────────────────────────

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  )
}

function PremiumSheet({ onClose }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const isPremium = useAppStore((s) => s.isPremium)
  const premiumExpiresAt = useAppStore((s) => s.premiumExpiresAt)
  const setIsPremium = useAppStore((s) => s.setIsPremium)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleBuy() {
    // telegram_id скрыт RLS — берём напрямую из Telegram WebApp
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (loading) return
    if (!telegramId) {
      setError('Открой приложение через Telegram — оплата недоступна в браузере')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const status = await openStarsPayment('premium', telegramId)
      if (status === 'paid') {
        // Подписка активирована — обновим стор оптимистично на 30 дней
        const expires = new Date()
        expires.setDate(expires.getDate() + 30)
        setIsPremium(true, expires.toISOString())
        onClose()
      }
    } catch (err) {
      setError(err?.message || 'Не удалось открыть оплату. Попробуй ещё раз.')
      console.error('[PremiumSheet]', err)
    } finally {
      setLoading(false)
    }
  }

  const expiresLabel = premiumExpiresAt
    ? `до ${new Date(premiumExpiresAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null

  const features = [
    { icon: '⭐', text: 'Бейдж Premium на профиле' },
    { icon: '📅', text: 'Экспорт альбома месяца' },
    { icon: '🎨', text: 'Доступ ко всем купленным темам карточек' },
  ]

  return (
    <BottomSheet onClose={onClose} title="Memi Premium">
      <div className="px-4 pb-6">
        {/* Hero */}
        <div
          className="flex flex-col items-center justify-center"
          style={{
            background: 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 60%, #E8C9A0 100%)',
            borderRadius: 20,
            padding: '28px 20px',
            marginBottom: 20,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>⭐</div>
          <p className="font-sans" style={{ color: '#fff', fontSize: 20, fontWeight: 700, margin: 0 }}>
            Memi Premium
          </p>
          <p className="font-sans" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, marginTop: 6, textAlign: 'center' }}>
            Поддержи проект и получи особый статус
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-3" style={{ marginBottom: 24 }}>
          {features.map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-3">
              <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
              <span className="font-sans" style={{ fontSize: 14, color: 'var(--text)' }}>{text}</span>
            </div>
          ))}
        </div>

        {/* Статус если уже активен */}
        {isPremium && expiresLabel && (
          <div
            className="font-sans text-center"
            style={{
              backgroundColor: 'rgba(217,139,82,0.1)',
              borderRadius: 12,
              color: 'var(--accent)',
              fontSize: 13,
              fontWeight: 500,
              padding: '10px 16px',
              marginBottom: 16,
            }}
          >
            ✅ Подписка активна {expiresLabel}
          </div>
        )}

        {error && (
          <p className="font-sans text-center" style={{ color: '#E05252', fontSize: 13, marginBottom: 12 }}>
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="w-full font-sans font-semibold transition-opacity active:opacity-70"
          style={{
            backgroundColor: loading ? 'var(--surface)' : 'var(--accent)',
            color: loading ? 'var(--soft)' : '#fff',
            borderRadius: 9999,
            padding: '14px 0',
            fontSize: 15,
            border: 'none',
            marginBottom: 10,
          }}
        >
          {loading ? 'Открываю оплату...' : isPremium ? 'Продлить · 99 ⭐' : 'Подписаться · 99 ⭐ / мес'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Закрыть
        </button>
      </div>
    </BottomSheet>
  )
}

function PremiumCard({ onOpen }) {
  const isPremium = useAppStore((s) => s.isPremium)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="surface-card flex w-full items-center gap-3 rounded-[24px] text-left transition-opacity active:opacity-60"
      style={{
        padding: '16px 18px',
        marginBottom: 20,
        border: 'none',
        background: isPremium
          ? 'linear-gradient(120deg, #A05E2C 0%, #D98B52 60%, #E8C9A0 100%)'
          : 'var(--moment-surface)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-[14px] flex-shrink-0"
        style={{
          width: 40,
          height: 40,
          backgroundColor: isPremium ? 'rgba(255,255,255,0.2)' : 'var(--base)',
          color: isPremium ? '#fff' : 'var(--accent)',
        }}
      >
        <StarIcon />
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-sans" style={{ color: isPremium ? '#fff' : 'var(--text)', fontSize: 15, fontWeight: 700 }}>
          {isPremium ? 'Memi Premium ⭐' : 'Memi Premium'}
        </p>
        <p className="font-sans" style={{ color: isPremium ? 'rgba(255,255,255,0.75)' : 'var(--mid)', fontSize: 13, marginTop: 2 }}>
          {isPremium ? 'Подписка активна' : '99 ⭐ в месяц'}
        </p>
      </div>

      <div className="flex items-center justify-center flex-shrink-0" style={{ color: isPremium ? 'rgba(255,255,255,0.7)' : 'var(--soft)' }}>
        <ChevronRightIcon color={isPremium ? 'rgba(255,255,255,0.7)' : 'var(--soft)'} />
      </div>
    </button>
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
        marginBottom: 20,
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

function PublicPreviewSettingsCard({ checked, disabled, onChange, error }) {
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

    </section>
  )
}

export default function Profile() {
  const currentUser = useAppStore((state) => state.currentUser)
  const setCurrentUser = useAppStore((state) => state.setCurrentUser)
  const moments = useAppStore((state) => state.moments)
  const friends = useAppStore((state) => state.friends) ?? []
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const removeFromCapsule = useAppStore((state) => state.removeFromCapsule)
  const isPremium = useAppStore((state) => state.isPremium)

  const [pickSlot, setPickSlot] = useState(null)
  const [addMomentSlot, setAddMomentSlot] = useState(null)
  const [showPremiumSheet, setShowPremiumSheet] = useState(false)
  const [showPublicProfileMenu, setShowPublicProfileMenu] = useState(false)
  const [showPublicProfileSheet, setShowPublicProfileSheet] = useState(false)
  const [savingPublicVisibility, setSavingPublicVisibility] = useState(false)
  const [publicProfileError, setPublicProfileError] = useState(null)
  const [activeScreen, setActiveScreen] = useState(0)

  const ownMoments = useMemo(
    () => moments
      .filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)
      .slice()
      .sort(compareMomentsByDisplayAt),
    [moments, currentUser?.id],
  )
  const publicMoments = useMemo(
    () => ownMoments.filter((moment) => moment.visibility !== 'private'),
    [ownMoments],
  )

  const totalMoments = ownMoments.length
  const totalMonths = uniqueMonths(ownMoments)
  const totalFriends = friends.length
  const profileStats = [
    { value: totalMoments, label: pluralRu(totalMoments, 'момент', 'момента', 'моментов') },
    { value: totalMonths, label: pluralRu(totalMonths, 'месяц', 'месяца', 'месяцев') },
    { value: totalFriends, label: pluralRu(totalFriends, 'друг', 'друга', 'друзей') },
  ]
  const publicProfileStats = {
    moments: publicMoments.length,
    months: uniqueMonths(publicMoments),
    friends: totalFriends,
  }
  const publicProfileEnabled = currentUser?.public_profile_enabled === true

  function handleOpenPublicProfileEditor() {
    setPublicProfileError(null)
    setShowPublicProfileMenu(false)
    setShowPublicProfileSheet(true)
  }

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
            <div className="px-4 pt-topbar" style={{ paddingBottom: 22 }}>
              <h1 className="type-page-title" style={{ color: 'var(--text)', margin: 0 }}>
                Профиль
              </h1>
            </div>

            <div className="hide-scrollbar flex-1 overflow-y-auto px-4" style={{ paddingBottom: 108 }}>
              <section
                style={{
                  marginBottom: 16,
                  backgroundColor: 'var(--moment-surface)',
                  borderRadius: 28,
                  overflow: 'hidden',
                  boxShadow: '0 10px 28px rgba(80,50,30,0.14)',
                }}
              >
                <div
                  style={{
                    height: 96,
                    background: `
                      radial-gradient(circle at top right, rgba(255,255,255,0.34), transparent 34%),
                      linear-gradient(180deg, var(--deep) 0%, var(--accent) 56%, var(--accent-light) 100%)
                    `,
                  }}
                />

                <div style={{ padding: '0 20px 20px' }}>
                  <div className="flex items-end gap-3" style={{ marginTop: -34 }}>
                    <div
                      className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                      style={{
                        width: 68,
                        height: 68,
                        background: currentUser?.photo_url
                          ? 'transparent'
                          : 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 100%)',
                        border: '4px solid var(--moment-surface)',
                        color: '#fff',
                        fontSize: 26,
                        fontWeight: 700,
                        boxShadow: '0 6px 18px rgba(80,50,30,0.18)',
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
                  </div>

                  <div style={{ marginTop: 16 }}>
                    <div className="flex items-center gap-2">
                      <p
                        className="font-sans type-sheet-title truncate"
                        style={{ color: 'var(--text)', margin: 0 }}
                      >
                        {name}
                      </p>
                      {isPremium && (
                        <span
                          className="font-sans flex-shrink-0"
                          style={{
                            fontSize: 11,
                            fontWeight: 700,
                            color: '#fff',
                            backgroundColor: 'var(--accent)',
                            borderRadius: 999,
                            padding: '2px 8px',
                            letterSpacing: '0.03em',
                          }}
                        >
                          ⭐ Premium
                        </span>
                      )}
                    </div>

                    {since && (
                      <p
                        className="font-sans type-support"
                        style={{
                          marginTop: 10,
                          paddingLeft: 14,
                          color: 'var(--mid)',
                          backgroundImage: 'radial-gradient(circle, var(--accent) 0 55%, transparent 56%)',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: '0 50%',
                          backgroundSize: '6px 6px',
                        }}
                      >
                        с memi с {since}
                      </p>
                    )}
                  </div>

                  <div
                    className="stats-panel-surface"
                    style={{
                      marginTop: 18,
                    }}
                  >

                    <div className="grid grid-cols-3" style={{ position: 'relative' }}>
                      {profileStats.map((item, index) => (
                        <div
                          key={item.label}
                          className="flex flex-col items-center justify-center"
                          style={{
                            minHeight: 94,
                            padding: '16px 10px 14px',
                            borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)',
                          }}
                        >
                          <span
                            className="font-sans type-stat-value"
                            style={{
                              color: 'var(--accent)',
                              textAlign: 'center',
                            }}
                          >
                            {item.value}
                          </span>
                          <span
                            className="font-sans type-stat-label"
                            style={{
                              marginTop: 8,
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
              </section>

              <PremiumCard onOpen={() => setShowPremiumSheet(true)} />
              <PublicProfileEntryCard onOpen={() => setActiveScreen(1)} />

              <section>
                <div className="flex items-baseline gap-2" style={{ marginBottom: 16 }}>
                  <span className="font-sans type-card-title" style={{ color: 'var(--text)' }}>
                    Капсула
                  </span>
                  <span className="font-sans type-support" style={{ color: 'var(--mid)' }}>
                    · моменты на всю жизнь
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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
            <div className="px-4 pt-topbar" style={{ paddingBottom: 12 }}>
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveScreen(0)}
                  className="flex items-center gap-2 font-sans type-action transition-opacity active:opacity-60"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px 0',
                    color: 'var(--mid)',
                  }}
                >
                  <BackArrowIcon />
                  Назад
                </button>

                <span className="font-sans type-screen-title" style={{ color: 'var(--text)' }}>
                  Публичный профиль
                </span>

                <div className="flex justify-end" style={{ width: 60 }}>
                  <button
                    type="button"
                    aria-label="Открыть меню публичного профиля"
                    onClick={() => setShowPublicProfileMenu(true)}
                    className="flex items-center justify-center transition-opacity active:opacity-60"
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      backgroundColor: 'rgba(255,255,255,0.85)',
                      border: '1px solid rgba(160, 94, 44, 0.12)',
                      backdropFilter: 'blur(8px)',
                    }}
                    data-testid="public-profile-more-button"
                  >
                    <MoreIcon />
                  </button>
                </div>
              </div>
            </div>

            <PublicProfileContent
              profileUser={currentUser}
              moments={publicMoments}
              publicMomentsTotal={publicMoments.length}
              stats={publicProfileStats}
              displayName={name}
              topContent={(
                <PublicPreviewSettingsCard
                  checked={publicProfileEnabled}
                  disabled={savingPublicVisibility}
                  onChange={handleTogglePublicProfile}
                  error={publicProfileError}
                />
              )}
              contentPaddingBottom={108}
            />
          </div>
        )}
      </div>

      <BottomNav active="profile" />

      {showPremiumSheet && (
        <PremiumSheet onClose={() => setShowPremiumSheet(false)} />
      )}

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

      {showPublicProfileMenu && (
        <BottomSheet onClose={() => setShowPublicProfileMenu(false)}>
          <div className="px-4 pb-4 pt-1">
            <button
              type="button"
              onClick={handleOpenPublicProfileEditor}
              data-testid="public-profile-edit-button"
              className="flex w-full items-center gap-4 rounded-[22px] px-4 py-4 text-left transition-opacity active:opacity-60"
              style={{
                border: 'none',
                backgroundColor: 'var(--moment-surface)',
                boxShadow: '0 8px 24px rgba(80,50,30,0.08)',
              }}
            >
              <span
                className="flex items-center justify-center rounded-[14px] flex-shrink-0"
                style={{
                  width: 40,
                  height: 40,
                  backgroundColor: 'rgba(217, 139, 82, 0.18)',
                  color: 'var(--deep)',
                }}
              >
                <EditPencilIcon />
              </span>
              <span className="font-sans" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)' }}>
                Редактировать
              </span>
            </button>
          </div>
        </BottomSheet>
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
