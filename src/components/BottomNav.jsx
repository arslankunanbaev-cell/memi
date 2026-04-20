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

export default function BottomNav({ active }) {
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40"
      style={{
        background: 'rgba(251, 247, 240, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--divider)',
        boxShadow: '0 -8px 32px rgba(80, 50, 30, 0.06)',
        paddingTop: 8,
        paddingBottom: 'max(0.9rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="flex items-center">
        {TABS.map((tab) => {
          const isActive = tab.id === active
          const color = isActive ? 'var(--accent)' : 'var(--soft)'

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab.path)}
              className="flex flex-1 flex-col items-center gap-1 transition-opacity active:opacity-60"
              style={{
                border: 'none',
                background: 'none',
                padding: '4px 0',
              }}
            >
              <span style={{ color }}>{tab.icon(color)}</span>
              <span
                className="font-sans"
                style={{
                  color,
                  fontSize: 10,
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
