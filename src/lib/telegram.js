// ⚠️ Всегда читаем через геттер — SDK может загрузиться позже импорта модуля
function getWebApp() {
  return window.Telegram?.WebApp ?? null
}

/** @deprecated use getWebApp() — оставлено для совместимости */
export const tg = typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null

export function tgReady() {
  const wa = getWebApp()
  wa?.ready()
  wa?.expand()
}

export function getTgUser() {
  const wa = getWebApp()
  return wa?.initDataUnsafe?.user ?? null
}

export function tgClose() {
  getWebApp()?.close()
}

export function tgHaptic(type = 'light') {
  getWebApp()?.HapticFeedback?.impactOccurred(type)
}
