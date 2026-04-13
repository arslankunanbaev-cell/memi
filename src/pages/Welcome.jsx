import { useNavigate } from 'react-router-dom'

export default function Welcome() {
  const navigate = useNavigate()

  return (
    <div
      className="flex flex-col items-center justify-between h-full w-full px-8 pt-safe"
      style={{ backgroundColor: 'var(--base)' }}
    >
      {/* Top spacer */}
      <div className="flex-1" />

      {/* Logo + tagline */}
      <div className="flex flex-col items-center gap-4">
        <h1
          className="font-serif"
          style={{
            fontSize: 56,
            letterSpacing: '4px',
            color: 'var(--text)',
            fontWeight: 300,
          }}
        >
          memi
        </h1>
        <p
          className="font-sans tracking-widest uppercase"
          style={{ fontSize: 11, color: 'var(--soft)' }}
        >
          ваши моменты, красиво
        </p>
      </div>

      {/* Bottom spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex flex-col items-center gap-4 w-full pb-safe" style={{ paddingBottom: 'max(2rem, env(safe-area-inset-bottom))' }}>
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full font-sans font-medium transition-opacity active:opacity-70"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#fff',
            borderRadius: 9999,
            padding: '14px 0',
            fontSize: 15,
            letterSpacing: '0.5px',
          }}
        >
          Начать
        </button>

        <button
          onClick={() => navigate('/home')}
          className="font-sans transition-opacity active:opacity-60"
          style={{ color: 'var(--mid)', fontSize: 14, background: 'none', border: 'none' }}
        >
          Уже есть аккаунт
        </button>

        <div style={{ height: 8 }} />
      </div>
    </div>
  )
}
