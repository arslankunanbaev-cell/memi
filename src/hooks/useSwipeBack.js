import { useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { tgHaptic } from '../lib/telegram'

const SWIPE_BACK_EDGE = 36
const SWIPE_BACK_DISTANCE = 82
const SWIPE_BACK_MAX_VERTICAL = 58

export function useSwipeBack({ enabled = true, fallbackPath = null } = {}) {
  const navigate = useNavigate()
  const swipeBackRef = useRef(null)

  function goBack() {
    tgHaptic('light')
    if (fallbackPath && window.history.length <= 1) {
      navigate(fallbackPath)
      return
    }
    navigate(-1)
  }

  function onTouchStart(event) {
    if (!enabled || event.touches.length !== 1) {
      swipeBackRef.current = null
      return
    }

    const touch = event.touches[0]
    if (touch.clientX > SWIPE_BACK_EDGE) {
      swipeBackRef.current = null
      return
    }

    swipeBackRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    }
  }

  function onTouchMove(event) {
    if (!swipeBackRef.current || event.touches.length !== 1) return

    const touch = event.touches[0]
    const deltaX = touch.clientX - swipeBackRef.current.x
    const deltaY = Math.abs(touch.clientY - swipeBackRef.current.y)

    if (deltaX > 18 && deltaY < SWIPE_BACK_MAX_VERTICAL) {
      event.preventDefault()
    }
  }

  function onTouchEnd(event) {
    if (!swipeBackRef.current) return

    const touch = event.changedTouches[0]
    const deltaX = touch.clientX - swipeBackRef.current.x
    const deltaY = Math.abs(touch.clientY - swipeBackRef.current.y)
    swipeBackRef.current = null

    if (deltaX >= SWIPE_BACK_DISTANCE && deltaY <= SWIPE_BACK_MAX_VERTICAL) {
      goBack()
    }
  }

  return {
    goBack,
    swipeBackHandlers: {
      onTouchStart,
      onTouchMove,
      onTouchEnd,
      style: { touchAction: 'pan-y' },
    },
  }
}
