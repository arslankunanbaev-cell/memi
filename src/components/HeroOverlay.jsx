import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAppStore } from '../store/useAppStore'

export default function HeroOverlay() {
  const heroTransition    = useAppStore((s) => s.heroTransition)
  const clearHeroTransition = useAppStore((s) => s.clearHeroTransition)
  const [phase, setPhase] = useState('idle') // idle | start | expanding | fading

  const momentId = heroTransition?.momentId

  useEffect(() => {
    if (!heroTransition) { setPhase('idle'); return }

    setPhase('start')

    // Double-rAF: let the browser paint the 'start' frame first
    let raf1, raf2
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setPhase('expanding'))
    })

    const t1 = setTimeout(() => setPhase('fading'), 460)
    const t2 = setTimeout(() => { clearHeroTransition(); setPhase('idle') }, 630)

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [momentId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!heroTransition || phase === 'idle') return null

  const { rect, photoUrl } = heroTransition
  const vw = window.innerWidth
  const vh = window.innerHeight

  // GPU-only transform: translate + non-uniform scale
  const cx = rect.left + rect.width  / 2 - vw / 2
  const cy = rect.top  + rect.height / 2 - vh / 2
  const sx = rect.width  / vw
  const sy = rect.height / vh

  const startTransform    = `translate(${cx}px, ${cy}px) scaleX(${sx}) scaleY(${sy})`
  const expandedTransform = 'translate(0px, 0px) scaleX(1) scaleY(1)'

  const style = {
    position:      'fixed',
    inset:         0,
    zIndex:        9999,
    overflow:      'hidden',
    pointerEvents: 'none',
    willChange:    'transform, opacity',
    transform: phase === 'start' ? startTransform : expandedTransform,
    opacity:   phase === 'fading' ? 0 : 1,
    transition: phase === 'start'
      ? 'none'
      : phase === 'fading'
        ? 'opacity 0.17s ease'
        : 'transform 0.42s cubic-bezier(0.4, 0, 0.2, 1)',
  }

  return createPortal(
    <div style={style}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(145deg, #C8A478, #8C5830)' }} />
      )}
    </div>,
    document.body
  )
}
