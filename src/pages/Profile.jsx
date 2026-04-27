import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import BottomSheet from '../components/BottomSheet'
import { deleteCapsuleSlot, getPremiumStatus, openStarsPayment, saveCapsuleSlot } from '../lib/api'
import { compareMomentsByDisplayAt, getMomentDisplayAt } from '../lib/momentTime'
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

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
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
          style={{ position: 'absolute', top: 10, left: 10, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, padding: '2px 8px' }}
        >
          0{index + 1}
        </div>
        <div style={{ position: 'absolute', left: 10, right: 10, bottom: 10 }}>
          <div
            className="font-sans"
            style={{ display: 'inline-flex', maxWidth: '100%', background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderRadius: 999, boxShadow: '0 1px 6px rgba(0,0,0,0.14)', color: 'var(--text)', fontSize: 12, fontWeight: 500, overflow: 'hidden', padding: '4px 10px', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
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
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
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
                <img src={moment.photo_url} alt={moment.title || 'Момент'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      ),
      text: 'Бейдж Premium на профиле',
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
      text: 'Темы карточек моментов',
    },
  ]

  return (
    <BottomSheet onClose={onClose}>
      {/* Hero */}
      <div
        style={{
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(170deg, #3D1A06 0%, #7A3D18 30%, #C06830 62%, #E8A55A 85%, #F5CC88 100%)',
          padding: '32px 24px 36px',
          textAlign: 'center',
        }}
      >
        {/* top shimmer */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '55%',
            background: 'radial-gradient(ellipse at 50% -10%, rgba(255,255,255,0.22) 0%, transparent 68%)',
            pointerEvents: 'none',
          }}
        />
        {/* icon circle */}
        <div
          style={{
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.14)',
            border: '1.5px solid rgba(255,255,255,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 0 32px rgba(255,200,100,0.25)',
          }}
        >
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <h2 className="font-sans" style={{ color: '#fff', fontSize: 26, fontWeight: 800, margin: 0, letterSpacing: -0.3 }}>
          Memi Premium
        </h2>
        <p className="font-sans" style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 10, lineHeight: 1.4 }}>
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
              : 'linear-gradient(135deg, #7A3D18 0%, #C06830 50%, #E8A55A 100%)',
            color: loading ? 'var(--soft)' : '#fff',
            borderRadius: 9999, padding: '16px 0', fontSize: 17,
            border: 'none', marginBottom: 12, letterSpacing: -0.2,
            boxShadow: loading ? 'none' : '0 6px 24px rgba(192,104,48,0.38)',
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
    description: 'Как у Locket — глубокий и сдержанный',
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

// ── Cards ──────────────────────────────────────────────────────────────────────

function PremiumCard({ onOpen }) {
  const isPremium = useAppStore((s) => s.isPremium)

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[24px] text-left transition-opacity active:opacity-70"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '16px 18px',
        marginBottom: 20,
        border: 'none',
        background: isPremium
          ? 'linear-gradient(125deg, #5C2D0E 0%, #9A4E20 35%, #D07838 65%, #EAA85C 100%)'
          : 'var(--moment-surface)',
        boxShadow: isPremium ? '0 4px 20px rgba(160,94,44,0.35)' : undefined,
      }}
    >
      {isPremium && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            background: 'radial-gradient(ellipse at 80% 50%, rgba(255,220,140,0.18) 0%, transparent 60%)',
            pointerEvents: 'none',
          }}
        />
      )}
      <div
        className="flex items-center justify-center rounded-[14px] flex-shrink-0"
        style={{
          width: 42, height: 42,
          background: isPremium ? 'rgba(255,255,255,0.18)' : 'var(--base)',
          border: isPremium ? '1px solid rgba(255,255,255,0.22)' : 'none',
          color: isPremium ? '#fff' : 'var(--accent)',
        }}
      >
        <StarIcon />
      </div>
      <div className="min-w-0 flex-1" style={{ position: 'relative' }}>
        <p className="font-sans" style={{ color: isPremium ? '#fff' : 'var(--text)', fontSize: 15, fontWeight: 700 }}>
          {isPremium ? 'Memi Premium ⭐' : 'Memi Premium'}
        </p>
        <p className="font-sans" style={{ color: isPremium ? 'rgba(255,255,255,0.72)' : 'var(--mid)', fontSize: 13, marginTop: 2 }}>
          {isPremium ? 'Подписка активна' : '99 ⭐ в месяц'}
        </p>
      </div>
      <div className="flex items-center justify-center flex-shrink-0" style={{ position: 'relative', color: isPremium ? 'rgba(255,255,255,0.6)' : 'var(--soft)' }}>
        <ChevronRightIcon color={isPremium ? 'rgba(255,255,255,0.6)' : 'var(--soft)'} />
      </div>
    </button>
  )
}

function ThemeCard({ onOpen }) {
  const currentTheme = useAppStore((s) => s.currentTheme)
  const isPremium = useAppStore((s) => s.isPremium)
  const isDark = currentTheme === 'dark'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full items-center gap-3 rounded-[24px] text-left transition-opacity active:opacity-70"
      style={{ padding: '16px 18px', marginBottom: 20, backgroundColor: 'var(--moment-surface)', border: 'none', boxShadow: 'var(--shadow-card)' }}
    >
      <div
        className="flex items-center justify-center rounded-[14px] flex-shrink-0"
        style={{
          width: 42, height: 42,
          background: isDark
            ? 'linear-gradient(135deg, #1E1C1A 0%, #3D2A18 100%)'
            : 'linear-gradient(135deg, #F7F4F0 0%, #EDE6DC 100%)',
          border: '1px solid var(--divider)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="4" fill={isDark ? '#D98B52' : '#17140E'} />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
            stroke={isDark ? '#D98B52' : '#17140E'} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>
          Тема приложения
        </p>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>
          {isPremium
            ? (isDark ? 'Тёмная' : 'Светлая')
            : 'Только для Premium'}
        </p>
      </div>
      <div className="flex items-center justify-center flex-shrink-0" style={{ color: 'var(--soft)' }}>
        <ChevronRightIcon />
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
      style={{ padding: '16px 18px', marginBottom: 20, backgroundColor: 'var(--moment-surface)', border: 'none' }}
      data-testid="profile-public-entry"
    >
      <div
        className="flex items-center justify-center rounded-[14px] flex-shrink-0"
        style={{ width: 40, height: 40, backgroundColor: 'var(--base)', color: 'var(--accent)' }}
      >
        <PublicProfileIcon />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-sans" style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700 }}>Публичный профиль</p>
        <p className="font-sans" style={{ color: 'var(--mid)', fontSize: 13, marginTop: 2 }}>Что видят другие</p>
      </div>
      <div className="flex items-center justify-center flex-shrink-0" style={{ color: 'var(--soft)' }}>
        <ChevronRightIcon />
      </div>
    </button>
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

  return (
    <div className="flex h-full flex-col" style={{ backgroundColor: 'var(--base)' }}>
      <div className="flex-1 overflow-hidden">
        <div className="flex h-full min-w-0 flex-col overflow-hidden" data-testid="profile-main-screen">
          <div className="px-4 pt-topbar" style={{ paddingBottom: 22 }}>
            <h1 className="type-page-title" style={{ color: 'var(--text)', margin: 0 }}>
              Профиль
            </h1>
          </div>

          <div className="hide-scrollbar flex-1 overflow-y-auto px-4 pb-nav-clearance">
            {/* Profile card */}
            <section
              style={{ marginBottom: 16, backgroundColor: 'var(--moment-surface)', borderRadius: 28, overflow: 'hidden', boxShadow: '0 10px 28px rgba(80,50,30,0.14)' }}
            >
              <div
                style={{
                  height: 96,
                  overflow: 'hidden',
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
                <div className="flex items-end gap-3" style={{ marginTop: -34 }}>
                  <div
                    className="flex items-center justify-center rounded-full overflow-hidden flex-shrink-0"
                    style={{
                      width: 68,
                      height: 68,
                      background: currentUser?.photo_url ? 'transparent' : 'linear-gradient(160deg, var(--deep) 0%, var(--accent) 100%)',
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
                        onError={(event) => { event.currentTarget.style.display = 'none' }}
                      />
                    ) : (
                      name[0]?.toUpperCase() ?? 'M'
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <div className="flex items-center gap-2">
                    <p className="font-sans type-sheet-title truncate" style={{ color: 'var(--text)', margin: 0 }}>
                      {name}
                    </p>
                    {isPremium && (
                      <span
                        className="font-sans flex-shrink-0"
                        style={{ fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: 'var(--accent)', borderRadius: 999, padding: '2px 8px', letterSpacing: '0.03em' }}
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

                <div className="stats-panel-surface" style={{ marginTop: 18 }}>
                  <div className="grid grid-cols-3" style={{ position: 'relative' }}>
                    {profileStats.map((item, index) => (
                      <div
                        key={item.label}
                        className="flex flex-col items-center justify-center"
                        style={{ minHeight: 94, padding: '16px 10px 14px', borderLeft: index === 0 ? 'none' : '1px solid rgba(160, 94, 44, 0.1)' }}
                      >
                        <span className="font-sans type-stat-value" style={{ color: 'var(--accent)', textAlign: 'center' }}>
                          {item.value}
                        </span>
                        <span className="font-sans type-stat-label" style={{ marginTop: 8, color: 'var(--deep)', textAlign: 'center' }}>
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <PublicProfileEntryCard onOpen={() => navigate('/profile/preview')} />
            <PremiumCard onOpen={() => setShowPremiumSheet(true)} />
            <ThemeCard onOpen={() => isPremium ? setShowThemeSheet(true) : setShowPremiumSheet(true)} />

            {/* Capsule */}
            <section>
              <div className="flex items-baseline gap-2" style={{ marginBottom: 16 }}>
                <span className="font-sans type-card-title" style={{ color: 'var(--text)' }}>Капсула</span>
                <span className="font-sans type-support" style={{ color: 'var(--mid)' }}>· моменты на всю жизнь</span>
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
