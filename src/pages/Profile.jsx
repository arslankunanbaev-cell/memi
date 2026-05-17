import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import CapsuleIcon from '../components/CapsuleIcon'
import PremiumBadge from '../components/PremiumBadge'
import ProfileSongCard from '../components/ProfileSongCard'
import { deleteCapsuleSlot, getPremiumStatus, openStarsPayment, saveCapsuleSlot } from '../lib/api'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
import { getPhotoCropStyle } from '../lib/photoCrop'
import { MONTHS_GENITIVE, pluralRu } from '../lib/ruPlural'
import { useAppStore } from '../store/useAppStore'
import AddMoment from './AddMoment'

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

// ── Icons ──────────────────────────────────────────────────────────────────────

function ChevronRightIcon({ color = 'var(--soft)' }) {
  return (
    <svg width="10" height="16" viewBox="0 0 10 16" fill="none" aria-hidden="true">
      <path d="M2 2l6 6-6 6" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PublicProfileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 18.5a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.5 7.5h2.5M19.75 6.25v2.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StatsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 19V5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4 19h16" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <rect x="7" y="11" width="3" height="5" rx="1" fill="currentColor" />
      <rect x="12" y="7" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="17" y="9" width="3" height="7" rx="1" fill="currentColor" />
    </svg>
  )
}

// ── Capsule tile ───────────────────────────────────────────────────────────────

function CapsuleTile({ slot, index, onEmpty, onFilled }) {
  const [showMenu, setShowMenu] = useState(false)

  if (!slot) {
    return (
      <button
        type="button"
        onClick={onEmpty}
        className="capsule-photo-frame flex flex-col items-center justify-center gap-2 transition-opacity active:opacity-60"
        style={{
          aspectRatio: '3 / 4',
          borderRadius: 22,
          border: '1.5px dashed rgba(160, 94, 44, 0.28)',
          background: 'linear-gradient(145deg, rgba(255,255,255,0.52), rgba(237,230,220,0.72))',
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: 36, height: 36, backgroundColor: 'var(--accent-light)' }}
        >
          <CapsuleIcon size={18} color="var(--accent)" />
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
        className="capsule-photo-frame transition-opacity active:opacity-80"
        style={{
          position: 'relative',
          aspectRatio: '3 / 4',
          border: 'none',
          borderRadius: 22,
          overflow: 'hidden',
          padding: 0,
          boxShadow: 'var(--shadow-card)',
          background: slot.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)',
        }}
      >
        {slot.photo_url && (
          <img src={slot.photo_url} alt={slot.title || 'Момент'} style={{ width: '100%', height: '100%', ...getPhotoCropStyle(slot) }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(23,20,14,0.6) 0%, transparent 58%)' }} />
        <div
          className="font-sans"
          style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}
        >
          0{index + 1}
        </div>
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <div
            className="font-sans"
            style={{ display: 'inline-flex', maxWidth: '100%', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 999, boxShadow: '0 1px 6px rgba(0,0,0,0.14)', color: '#17140E', fontSize: 12, fontWeight: 500, overflow: 'hidden', padding: '4px 10px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
              onClick={() => { setShowMenu(false); onEmpty() }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{ border: 'none', backgroundColor: 'var(--base)', marginBottom: 8, padding: '16px 18px' }}
            >
              <div className="flex items-center justify-center rounded-[14px]" style={{ width: 40, height: 40, backgroundColor: 'var(--accent-light)' }}>
                <span style={{ color: 'var(--accent)', fontSize: 18 }}>↻</span>
              </div>
              <span className="font-sans" style={{ color: 'var(--text)', fontSize: 17, fontWeight: 500 }}>Заменить</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowMenu(false); onFilled() }}
              className="flex w-full items-center gap-4 rounded-[18px] text-left transition-opacity active:opacity-60"
              style={{ border: 'none', backgroundColor: 'rgba(224, 82, 82, 0.07)', padding: '16px 18px' }}
            >
              <div className="flex items-center justify-center rounded-[14px]" style={{ width: 40, height: 40, backgroundColor: 'rgba(224, 82, 82, 0.12)' }}>
                <span style={{ color: '#E05252', fontSize: 18 }}>✕</span>
              </div>
              <span className="font-sans" style={{ color: '#E05252', fontSize: 17, fontWeight: 500 }}>Убрать из капсулы</span>
            </button>
          </div>
        </BottomSheet>
      )}
    </>
  )
}

// ── Pick moment sheet ──────────────────────────────────────────────────────────

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
          onClick={() => { onClose(); onCreateNew() }}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition-opacity active:opacity-60"
          style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
        >
          <div className="flex items-center justify-center rounded-[10px]" style={{ width: 36, height: 36, backgroundColor: 'var(--accent)', color: '#fff', flexShrink: 0 }}>
            <CapsuleIcon size={18} color="#fff" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600 }}>Создать момент</p>
            <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 1 }}>Новый, сразу в капсулу</p>
          </div>
          <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
        </button>

        {ownMoments.length > 0 && (
          <p className="font-sans font-semibold" style={{ color: 'var(--soft)', fontSize: 12, letterSpacing: '0.14em', margin: '12px 16px 8px', textTransform: 'uppercase' }}>
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
            onClick={() => { onPick(moment); onClose() }}
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-opacity active:opacity-60"
            style={{ border: 'none', background: 'none', borderBottom: '1px solid var(--divider)' }}
          >
            <div style={{ width: 36, height: 36, borderRadius: 8, overflow: 'hidden', flexShrink: 0, background: moment.photo_url ? 'none' : 'linear-gradient(160deg, #6A4B34 0%, #B87B4A 55%, #E8CAA1 100%)' }}>
              {moment.photo_url && (
                <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', ...getPhotoCropStyle(moment) }} />
              )}
            </div>
            <span className="font-sans flex-1" style={{ color: 'var(--text)', fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {moment.title}
            </span>
            <span style={{ color: 'var(--soft)', fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </BottomSheet>
  )
}

// ── Premium sheet ──────────────────────────────────────────────────────────────

function PremiumSheet({ onClose }) {
  const currentUser = useAppStore((s) => s.currentUser)
  const isPremium = useAppStore((s) => s.isPremium)
  const premiumExpiresAt = useAppStore((s) => s.premiumExpiresAt)
  const setIsPremium = useAppStore((s) => s.setIsPremium)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleBuy() {
    const telegramId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id
    if (loading) return
    if (!telegramId) {
      setError('Открой приложение через Telegram — оплата недоступна в браузере')
      return
    }
    setLoading(true)
    setError(null)

    let activatedByPoll = false

    try {
      const status = await openStarsPayment('premium', telegramId, {
        pollActivated: async () => {
          const s = await getPremiumStatus(currentUser.id)
          if (s.isPremium) {
            activatedByPoll = true
            setIsPremium(true, s.premiumExpiresAt)
            return true
          }
          return false
        },
      })

      if (status === 'paid' || activatedByPoll) {
        onClose()
        return
      }

      if (status === 'cancelled') {
        // пользователь сам закрыл
      } else if (status === 'timeout') {
        setError('Время ожидания истекло. Если звёзды списались — перезапусти приложение.')
      } else {
        setError('Оплата не завершена. Если звёзды списались — попробуй перезапустить приложение.')
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
    {
      icon: (
        <>
          <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 13.5L7.5 9l4 3.5 3-2.5L21 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="8" cy="9.5" r="1.2" fill="currentColor" />
        </>
      ),
      text: 'Баннер публичного профиля',
    },
    {
      icon: (
        <>
          <rect x="4" y="7" width="16" height="10" rx="5" stroke="currentColor" strokeWidth="1.8" />
          <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </>
      ),
      text: 'Чип memi+ на профиле',
    },
    {
      icon: (
        <>
          <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3 10h18" stroke="currentColor" strokeWidth="1.8" />
          <path d="M8 3v4M16 3v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      ),
      text: 'Экспорт альбома месяца',
    },
    {
      icon: (
        <>
          <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
          <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" fillOpacity="0.3" fill="currentColor" />
          <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" fillOpacity="0.3" fill="currentColor" />
          <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth="1.8" />
        </>
      ),
      text: 'Все темы карточек без отдельной покупки',
    },
  ]

  return (
    <BottomSheet onClose={onClose}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: `
            radial-gradient(circle at 18% 0%, rgba(255,255,255,0.88), transparent 34%),
            radial-gradient(circle at 82% 16%, rgba(217,139,82,0.22), transparent 34%),
            linear-gradient(145deg, #FFF7E8 0%, #F4DFBD 46%, #E0A05C 100%)
          `,
          padding: '34px 24px 38px',
          textAlign: 'center',
        }}
      >
        {/* premium mark */}
        <div
          style={{
            width: 92, height: 92, borderRadius: 28,
            background: 'rgba(255,255,255,0.44)',
            border: '1px solid rgba(255,255,255,0.62)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '4px auto 20px',
            boxShadow: '0 16px 34px rgba(160,94,44,0.16), inset 0 1px 0 rgba(255,255,255,0.74)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <PremiumBadge label="memi+" />
        </div>
        <h2 className="font-serif" style={{ color: '#2B2117', fontSize: 34, fontWeight: 600, margin: 0, letterSpacing: 0, lineHeight: 1 }}>
          Memi+
        </h2>
        <p className="font-sans" style={{ color: '#7A461F', fontSize: 14, fontWeight: 700, marginTop: 10, lineHeight: 1.4 }}>
          Поддержи проект и получи особый статус
        </p>
      </div>

      {/* Content */}
      <div className="px-4" style={{ paddingTop: 24, paddingBottom: 8 }}>
        {/* Features */}
        <div style={{ marginBottom: 24 }}>
          {features.map(({ icon, text }, i) => (
            <div
              key={text}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '13px 0',
                borderBottom: i < features.length - 1 ? '1px solid var(--surface)' : 'none',
              }}
            >
              <div
                style={{
                  width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                  background: 'rgba(217,139,82,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--accent)',
                }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">{icon}</svg>
              </div>
              <span className="font-sans" style={{ fontSize: 15, color: 'var(--text)', fontWeight: 500 }}>{text}</span>
            </div>
          ))}
        </div>

        {isPremium && expiresLabel && (
          <div
            style={{
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.22)',
              borderRadius: 14, padding: '12px 16px', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <span style={{ fontSize: 17 }}>✅</span>
            <span className="font-sans" style={{ fontSize: 13, color: '#15a34a', fontWeight: 600 }}>
              Подписка активна {expiresLabel}
            </span>
          </div>
        )}

        {error && (
          <p className="font-sans text-center" style={{ color: '#E05252', fontSize: 13, marginBottom: 12 }}>{error}</p>
        )}

        <button
          type="button"
          onClick={handleBuy}
          disabled={loading}
          className="w-full font-sans font-bold transition-opacity active:opacity-75"
          style={{
            background: loading
              ? 'var(--surface)'
              : `
                linear-gradient(180deg, rgba(255,255,255,0.34), rgba(255,255,255,0)),
                #D98B52
              `,
            color: loading ? 'var(--soft)' : '#FFF9F1',
            borderRadius: 9999, padding: '16px 0', fontSize: 17,
            border: 'none', marginBottom: 12, letterSpacing: -0.2,
            boxShadow: loading ? 'none' : '0 8px 20px rgba(160,94,44,0.18), inset 0 1px 0 rgba(255,255,255,0.38)',
          }}
        >
          {loading ? 'Открываю оплату...' : isPremium ? 'Продлить · 99 ⭐' : 'Подписаться · 99 ⭐ / мес'}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-full font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none', paddingBottom: 4 }}
        >
          Закрыть
        </button>
      </div>
    </BottomSheet>
  )
}

// ── Theme sheet ────────────────────────────────────────────────────────────────

const THEMES = [
  {
    id: 'light',
    label: 'Светлая',
    description: 'Классическая тёплая тема',
    swatch: ['#F7F4F0', '#EDE6DC', '#D98B52'],
  },
  {
    id: 'dark',
    label: 'Тёмная',
    description: 'Глубокая и сдержанная',
    swatch: ['#0E0D0C', '#1E1C1A', '#D98B52'],
  },
]

function ThemeSheet({ onClose }) {
  const currentTheme = useAppStore((s) => s.currentTheme)
  const setCurrentTheme = useAppStore((s) => s.setCurrentTheme)

  return (
    <BottomSheet onClose={onClose} title="Тема приложения">
      <div className="px-4" style={{ paddingBottom: 24, paddingTop: 8 }}>
        {THEMES.map((theme) => {
          const active = currentTheme === theme.id
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => { setCurrentTheme(theme.id); onClose() }}
              className="flex w-full items-center gap-4 transition-opacity active:opacity-70"
              style={{
                border: active ? '2px solid var(--accent)' : '2px solid transparent',
                borderRadius: 20,
                background: active ? 'var(--accent-pale)' : 'var(--moment-surface)',
                padding: '14px 16px',
                marginBottom: 10,
                textAlign: 'left',
                boxShadow: active ? 'var(--shadow-accent)' : 'var(--shadow-card)',
              }}
            >
              {/* Colour swatches */}
              <div className="flex flex-shrink-0" style={{ gap: 4 }}>
                {theme.swatch.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: i === 0 ? 28 : 18,
                      height: 42,
                      borderRadius: 8,
                      background: color,
                      border: '1px solid rgba(0,0,0,0.08)',
                    }}
                  />
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {theme.label}
                </p>
                <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 12, marginTop: 3 }}>
                  {theme.description}
                </p>
              </div>
              {active && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" fill="var(--accent)" />
                  <path d="M7.5 12l3 3 6-6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>
    </BottomSheet>
  )
}

// ── Settings components ────────────────────────────────────────────────────────

function SettingsGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      {label && (
        <p
          className="font-sans"
          style={{ fontSize: 12, fontWeight: 600, color: 'var(--mid)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}
        >
          {label}
        </p>
      )}
      <div style={{ backgroundColor: 'var(--moment-surface)', borderRadius: 20, overflow: 'hidden', boxShadow: 'var(--shadow-card)' }}>
        {children}
      </div>
    </div>
  )
}

function SettingsRow({ icon, title, subtitle, onPress, isFirst, isLast, accent, testId }) {
  return (
    <button
      type="button"
      onClick={onPress}
      data-testid={testId}
      className="flex w-full items-center gap-3 text-left transition-opacity active:opacity-60"
      style={{
        padding: '14px 16px',
        border: 'none',
        background: 'none',
        borderBottom: isLast ? 'none' : '1px solid var(--divider)',
      }}
    >
      <div
        className="flex items-center justify-center rounded-[12px] flex-shrink-0"
        style={{ width: 38, height: 38, backgroundColor: accent ? 'var(--accent-light)' : 'var(--base)', color: 'var(--accent)' }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 600, margin: 0 }}>{title}</p>
        {subtitle && (
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      <ChevronRightIcon />
    </button>
  )
}

function PremiumRow({ onOpen }) {
  const isPremium = useAppStore((s) => s.isPremium)
  const currentTheme = useAppStore((s) => s.currentTheme)
  const isDarkTheme = currentTheme === 'dark'

  if (isPremium) {
    return (
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 text-left transition-opacity active:opacity-60"
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '14px 16px',
          border: isDarkTheme ? '1px solid rgba(232,169,107,0.18)' : '1px solid rgba(160, 94, 44, 0.12)',
          background: isDarkTheme
            ? `
              radial-gradient(circle at 12% 0%, rgba(217,139,82,0.18), transparent 34%),
              linear-gradient(135deg, rgba(35,33,32,0.98), rgba(26,24,22,0.94))
            `
            : `
              radial-gradient(circle at 12% 0%, rgba(255,255,255,0.78), transparent 34%),
              linear-gradient(135deg, rgba(255,255,255,0.86), rgba(245,235,221,0.9))
            `,
          boxShadow: isDarkTheme
            ? '0 12px 28px rgba(0,0,0,0.32), inset 0 1px 0 rgba(255,255,255,0.05)'
            : '0 10px 24px rgba(80,50,30,0.08), inset 0 1px 0 rgba(255,255,255,0.72)',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: isDarkTheme
              ? 'radial-gradient(ellipse at 88% 50%, rgba(232,169,107,0.14) 0%, transparent 58%)'
              : 'radial-gradient(ellipse at 88% 50%, rgba(217,139,82,0.12) 0%, transparent 58%)',
            pointerEvents: 'none',
          }}
        />
        <div
          className="flex items-center justify-center rounded-[12px] flex-shrink-0"
          style={{
            width: 48,
            height: 38,
            background: isDarkTheme ? 'rgba(232,169,107,0.1)' : 'rgba(217,139,82,0.08)',
            border: isDarkTheme ? '1px solid rgba(232,169,107,0.16)' : '1px solid rgba(217,139,82,0.14)',
            color: 'var(--deep)',
          }}
        >
          <PremiumBadge label="memi+" compact />
        </div>
        <div className="min-w-0 flex-1" style={{ position: 'relative' }}>
          <div className="flex items-center gap-2">
            <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0 }}>Memi+</p>
          </div>
          <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>Подписка активна</p>
        </div>
        <ChevronRightIcon color="var(--soft)" />
      </button>
    )
  }

  return (
    <SettingsRow
      icon={<PremiumBadge label="memi+" compact />}
      title="Memi+"
      subtitle="99 ⭐ в месяц"
      onPress={onOpen}
      isLast
    />
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function Profile() {
  const navigate = useNavigate()
  const currentUser = useAppStore((state) => state.currentUser)
  const moments = useAppStore((state) => state.moments)
  const friends = useAppStore((state) => state.friends) ?? []
  const capsule = useAppStore((state) => state.capsule)
  const addToCapsule = useAppStore((state) => state.addToCapsule)
  const removeFromCapsule = useAppStore((state) => state.removeFromCapsule)
  const isPremium = useAppStore((state) => state.isPremium)
  const currentTheme = useAppStore((state) => state.currentTheme)
  const isAdmin = currentUser?.telegram_id === 308362442

  const [pickSlot, setPickSlot] = useState(null)
  const [addMomentSlot, setAddMomentSlot] = useState(null)
  const [showPremiumSheet, setShowPremiumSheet] = useState(false)
  const [showThemeSheet, setShowThemeSheet] = useState(false)

  const ownMoments = useMemo(
    () => moments
      .filter((moment) => !moment.isShared && moment.user_id === currentUser?.id)
      .slice()
      .sort(compareMomentsByDisplayAt),
    [moments, currentUser?.id],
  )

  const totalMoments = ownMoments.length
  const totalMonths = uniqueMonths(ownMoments)
  const totalFriends = friends.length
  const profileStats = [
    { value: totalMoments, label: pluralRu(totalMoments, 'момент', 'момента', 'моментов') },
    { value: totalMonths, label: pluralRu(totalMonths, 'месяц', 'месяца', 'месяцев') },
    { value: totalFriends, label: pluralRu(totalFriends, 'друг', 'друга', 'друзей') },
  ]

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

  const name = currentUser?.name || 'Пользователь'
  const since = sinceLabel(currentUser?.created_at)
  const favoriteSong = currentUser?.favorite_song_title
    ? {
        title: currentUser.favorite_song_title,
        artist: currentUser.favorite_song_artist,
        cover: currentUser.favorite_song_cover,
        previewUrl: currentUser.favorite_song_preview_url,
      }
    : null

  const filledSlots = capsule.filter(Boolean).length

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-col overflow-hidden" data-testid="profile-main-screen">
          <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-nav-clearance pt-topbar">
            {/* Profile card */}
            <section
              className="profile-hero-card"
              style={{ marginBottom: 24 }}
            >
              <div
                className="profile-hero-cover"
                style={{
                  background: currentUser?.banner_url
                    ? 'none'
                    : `radial-gradient(circle at top right, rgba(255,255,255,0.34), transparent 34%),
                       linear-gradient(180deg, var(--deep) 0%, var(--accent) 56%, var(--accent-light) 100%)`,
                }}
              >
                {currentUser?.banner_url && (
                  <img src={currentUser.banner_url} alt="" aria-hidden="true" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>

              <div style={{ padding: '0 20px 20px' }}>
                <div className="flex items-end gap-3" style={{ marginTop: -38 }}>
                  <div
                    className={`profile-avatar-shell flex-shrink-0${isPremium ? ' is-premium' : ''}`}
                  >
                    <div className="profile-avatar flex items-center justify-center">
                      {currentUser?.photo_url ? (
                        <img
                          src={currentUser.photo_url}
                          alt={name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(event) => { event.currentTarget.style.display = 'none' }}
                        />
                      ) : (
                        name[0]?.toUpperCase() ?? 'M'
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="flex items-center gap-2">
                    <p className="font-sans type-sheet-title truncate" style={{ color: 'var(--text)', margin: 0 }}>
                      {name}
                    </p>
                    {isPremium && <PremiumBadge compact />}
                  </div>


                  {favoriteSong && (
                    <ProfileSongCard
                      title={favoriteSong.title}
                      artist={favoriteSong.artist}
                      cover={favoriteSong.cover}
                      previewUrl={favoriteSong.previewUrl}
                    />
                  )}
                </div>

                <div className="stats-panel-surface" style={{ marginTop: 18 }}>
                  <div className="grid grid-cols-3" style={{ position: 'relative' }}>
                    {profileStats.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center justify-center"
                        style={{ minHeight: 78, padding: '13px 10px 12px', borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)' }}
                      >
                        <span className="font-sans type-stat-value" style={{ textAlign: 'center' }}>
                          {item.value}
                        </span>
                        <span className="font-sans type-stat-label" style={{ marginTop: 7, textAlign: 'center' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Capsule */}
            <section style={{ marginBottom: 24 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                <div className="flex items-center gap-2">
                  <span
                    className="flex items-center justify-center rounded-full"
                    style={{ width: 28, height: 28, backgroundColor: 'var(--accent-light)', color: 'var(--accent)', flexShrink: 0 }}
                  >
                    <CapsuleIcon size={16} />
                  </span>
                  <span className="font-sans type-card-title" style={{ color: 'var(--text)' }}>Капсула</span>
                  <span className="font-sans type-support" style={{ color: 'var(--mid)' }}>· моменты на всю жизнь</span>
                </div>
                <span
                  className="font-sans"
                  style={{ fontSize: 12, fontWeight: 600, color: filledSlots === capsule.length ? 'var(--accent)' : 'var(--soft)', background: 'var(--moment-surface)', borderRadius: 999, padding: '3px 10px' }}
                >
                  {filledSlots} / {capsule.length}
                </span>
              </div>
              <div className="capsule-frame">
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
              </div>
            </section>

            {/* Settings groups */}
            <SettingsGroup label="Аккаунт">
              <SettingsRow
                icon={<PublicProfileIcon />}
                title="Публичный профиль"
                subtitle="Что видят другие"
                onPress={() => navigate('/profile/preview')}
                isFirst
                testId="profile-public-entry"
              />
              <PremiumRow onOpen={() => setShowPremiumSheet(true)} />
            </SettingsGroup>

            <SettingsGroup label="Настройки">
              {isAdmin && (
                <SettingsRow
                  icon={<StatsIcon />}
                  title="Статистика"
                  subtitle="Пользователи, заходы и моменты"
                  onPress={() => navigate('/admin/stats')}
                  isFirst
                />
              )}
              <SettingsRow
                icon={
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="4" fill="var(--accent)" />
                    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
                      stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                }
                title="Тема приложения"
                subtitle={isPremium ? (currentTheme === 'dark' ? 'Тёмная' : 'Светлая') : 'Только для Premium'}
                onPress={() => isPremium ? setShowThemeSheet(true) : setShowPremiumSheet(true)}
                isFirst={!isAdmin}
                isLast
              />
            </SettingsGroup>

            {since && (
              <p
                className="font-sans type-support"
                style={{
                  marginTop: 26,
                  marginBottom: 0,
                  textAlign: 'center',
                  color: 'var(--mid)',
                }}
              >
                с memi с {since}
              </p>
            )}
          </div>
        </div>
      </div>

      <BottomNav active="profile" />

      {showPremiumSheet && (
        <PremiumSheet onClose={() => setShowPremiumSheet(false)} />
      )}

      {showThemeSheet && (
        <ThemeSheet onClose={() => setShowThemeSheet(false)} />
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
    </div>
  )
}
