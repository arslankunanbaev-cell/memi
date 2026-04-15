import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getTgUser, tgHaptic } from '../telegram.js'

// ── telegram.js ───────────────────────────────────────────────────────────────

describe('getTgUser', () => {
  it('возвращает пользователя из Telegram WebApp', () => {
    const user = getTgUser()
    expect(user).not.toBeNull()
    expect(user.id).toBe(308362442)
    expect(user.first_name).toBe('Test')
  })

  it('возвращает null если WebApp недоступен', () => {
    const original = window.Telegram
    delete window.Telegram
    const user = getTgUser()
    expect(user).toBeNull()
    window.Telegram = original
  })

  it('возвращает null если initDataUnsafe.user отсутствует', () => {
    const original = window.Telegram.WebApp.initDataUnsafe
    window.Telegram.WebApp.initDataUnsafe = {}
    const user = getTgUser()
    expect(user).toBeNull()
    window.Telegram.WebApp.initDataUnsafe = original
  })
})

describe('tgHaptic', () => {
  it('вызывает HapticFeedback.impactOccurred с нужным типом', () => {
    tgHaptic('heavy')
    expect(window.Telegram.WebApp.HapticFeedback.impactOccurred).toHaveBeenCalledWith('heavy')
  })

  it('не падает если WebApp недоступен', () => {
    const original = window.Telegram
    delete window.Telegram
    expect(() => tgHaptic('light')).not.toThrow()
    window.Telegram = original
  })
})
