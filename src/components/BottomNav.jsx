import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    path: '/home',
    label: 'Моменты',
    icon: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
        <rect x="13" y="3" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
        <rect x="3" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
        <rect x="13" y="13" width="8" height="8" rx="2" stroke={color} strokeWidth="1.8" />
      </svg>
    ),
  },
  {
    id: 'archive',
    path: '/archive',
    label: 'Архив',
    icon: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="4" rx="1.5" stroke={color} strokeWidth="1.8" />
        <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" stroke={color} strokeWidth="1.8" />
        <path d="M10 12h4" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'people',
    path: '/people',
    label: 'Люди',
    icon: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke={color} strokeWidth="1.8" />
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M16 6c1.7.4 3 1.9 3 3.7s-1.3 3.3-3 3.7" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
        <path d="M20 20c0-2.8-1.8-5.1-4.3-5.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Профиль',
    icon: (color) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
]

export default function BottomNav({ active, onActiveDoublePress }) {
  const navigate = useNavigate()
  const lastActiveTapRef = useRef({ tabId: null, time: 0 })

  function handleTabPress(tab) {
    if (tab.id !== active) {
      navigate(tab.path)
      lastActiveTapRef.current = { tabId: null, time: 0 }
      return
    }

    const now = Date.now()
    const last = lastActiveTapRef.current

    if (last.tabId === tab.id && now - last.time < 420) {
      lastActiveTapRef.current = { tabId: null, time: 0 }
      onActiveDoublePress?.(tab.id)
      return
    }

    lastActiveTapRef.current = { tabId: tab.id, time: now }
  }

  return (
    <nav
      className="bottom-nav-bar fixed z-40 flex justify-center"
      style={{
        left: 0,
        right: 0,
        bottom: 'max(0.75rem, calc(env(safe-area-inset-bottom) + 0.5rem))',
      }}
    >
      <div
        className="bottom-nav-pill flex items-center"
        style={{
          background: 'rgba(251, 247, 240, 0.94)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderRadius: 48,
          boxShadow:
            '0 8px 32px rgba(80, 50, 30, 0.13), 0 2px 6px rgba(80, 50, 30, 0.07), 0 0 0 1px rgba(180, 150, 120, 0.13)',
          padding: '10px 16px',
          gap: 8,
        }}
      >
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const color = isActive ? 'var(--accent)' : 'var(--soft)'

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabPress(tab)}
              className="flex flex-col items-center gap-1 transition-opacity active:opacity-60"
              style={{
                border: 'none',
                background: 'none',
                minWidth: 62,
                padding: '9px 14px',
              }}
            >
              <span style={{ color }}>{tab.icon(color)}</span>
              <span
                className="font-sans type-nav"
                style={{
                  color,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
