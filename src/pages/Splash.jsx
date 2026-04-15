import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../store/useAppStore'

export default function Splash() {
  const navigate   = useNavigate()
  const initDone   = useAppStore((s) => s.initDone)
  const isNew      = useAppStore((s) => s.isNew)
  const timerDone  = useRef(false)
  const navigated  = useRef(false)

  // Функция-навигатор — вызывается когда ОБА условия выполнены
  function tryNavigate(done, newUser) {
    if (navigated.current) return
    if (!timerDone.current || !done) return
    navigated.current = true
    navigate(newUser ? '/onboarding' : '/home', { replace: true })
  }

  // 1.5 секунды — минимальное время Splash
  useEffect(() => {
    const t = setTimeout(() => {
      timerDone.current = true
      tryNavigate(initDone, isNew)
    }, 1500)
    return () => clearTimeout(t)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Реагируем на завершение init (может прийти после таймера)
  useEffect(() => {
    if (initDone) {
      tryNavigate(true, isNew)
    }
  }, [initDone, isNew]) // eslint-disable-line react-hooks/exhaustive-deps

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
