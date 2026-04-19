import { useNavigate } from 'react-router-dom'

const TABS = [
  {
    id: 'home',
    path: '/home',
    label: 'Моменты',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
      </svg>
    ),
  },
  {
    id: 'archive',
    path: '/archive',
    label: 'Архив',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <rect x="3" y="4" width="18" height="4" rx="1.5" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <path d="M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
        <path d="M10 12h4" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'people',
    path: '/people',
    label: 'Люди',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
        <path d="M16 6c1.7.4 3 1.9 3 3.7s-1.3 3.3-3 3.7" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
        <path d="M20 20c0-2.8-1.8-5.1-4.3-5.8" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    id: 'profile',
    path: '/profile',
    label: 'Профиль',
    icon: (active) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth={active ? 2 : 1.6}/>
        <path d="M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="currentColor" strokeWidth={active ? 2 : 1.6} strokeLinecap="round"/>
      </svg>
    ),
  },
]

export default function BottomNav({ active }) {
  const navigate = useNavigate()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 flex items-center"
      style={{
        background: 'rgba(251,247,240,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(180,150,120,0.15)',
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
            <span style={{ color: isActive ? 'var(--accent)' : 'var(--soft)', transition: 'color 0.2s' }}>
              {tab.icon(isActive)}
            </span>
            <span
              className="font-sans"
              style={{
                fontSize: 10,
                color: isActive ? 'var(--accent)' : 'var(--soft)',
                fontWeight: isActive ? 600 : 400,
                letterSpacing: '0.3px',
                transition: 'color 0.2s',
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
