import { useNavigate } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    path: '/home',
    label: 'Моменты',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: 'archive',
    path: '/archive',
    label: 'Архив',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </svg>
    ),
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Профиль',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

export default function BottomNav({ active }) {
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center pb-safe"
      style={{
        backgroundColor: 'var(--base)',
        borderTop: '1px solid var(--surface)',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
      }}
    >
      {TABS.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex-1 flex flex-col items-center gap-1 pt-3 pb-1 transition-opacity active:opacity-60"
            style={{ background: 'none', border: 'none' }}
          >
            <span style={{ color: isActive ? 'var(--accent)' : 'var(--mid)' }}>
              {tab.icon(isActive)}
            </span>
            <span
              className="font-sans"
              style={{
                fontSize: 10,
                color: isActive ? 'var(--accent)' : 'var(--mid)',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.3px',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
