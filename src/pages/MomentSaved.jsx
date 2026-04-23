import { useLocation, useNavigate } from 'react-router-dom'
import { tgHaptic } from '../lib/telegram'
import { useEffect } from 'react'

export default function MomentSaved() {
  const { state } = useLocation()
  const navigate  = useNavigate()
  const moment    = state?.moment

  useEffect(() => {
    tgHaptic('medium')
  }, [])

  return (
    <div
      className="flex h-full flex-col items-center justify-center gap-6 px-4 pt-topbar"
      style={{ backgroundColor: 'var(--base)' }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 80, height: 80, borderRadius: '50%',
          backgroundColor: 'var(--surface)',
        }}
      >
        <span style={{ fontSize: 36 }}>✨</span>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="font-serif" style={{ fontSize: 26, color: 'var(--text)', fontWeight: 400 }}>
          Момент сохранён
        </h2>
        {moment?.title && (
          <p className="font-sans" style={{ fontSize: 14, color: 'var(--mid)' }}>
            «{moment.title}»
          </p>
        )}
      </div>

      <button
        onClick={() => navigate('/home', { replace: true })}
        className="font-sans font-medium transition-opacity active:opacity-70"
        style={{
          backgroundColor: 'var(--accent)', color: '#fff',
          borderRadius: 9999, padding: '13px 40px',
          fontSize: 15, border: 'none',
        }}
      >
        На главную
      </button>
    </div>
  )
}
