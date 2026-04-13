import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => navigate('/welcome', { replace: true }), 1500)
    return () => clearTimeout(t)
  }, [navigate])

  return (
    <div
      className="flex items-center justify-center h-full w-full"
      style={{ backgroundColor: 'var(--base)' }}
    >
      <h1
        className="font-serif"
        style={{
          fontSize: 48,
          letterSpacing: '4px',
          color: 'var(--text)',
          fontWeight: 300,
        }}
      >
        memi
      </h1>
    </div>
  )
}
