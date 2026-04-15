// ⚠️ Всегда читаем через геттер — SDK может загрузиться позже импорта модуля
function getWebApp() {
  return window.Telegram?.WebApp ?? null
}

/** @deprecated use getWebApp() — оставлено для совместимости */
export const tg = typeof window !== 'undefined' ? (window.Telegram?.WebApp ?? null) : null

export function tgReady() {
  const wa = getWebApp()
  console.log('[tgReady] WebApp object:', wa)
  wa?.ready()
  wa?.expand()
}

export function getTgUser() {
  const wa = getWebApp()
  const user = wa?.initDataUnsafe?.user ?? null
  console.log('[getTgUser] WebApp:', wa ? '✅ present' : '❌ null')
  console.log('[getTgUser] initDataUnsafe:', wa?.initDataUnsafe)
  console.log('[getTgUser] user:', user)
  return user
}

export function tgClose() {
  getWebApp()?.close()
}

export function tgHaptic(type = 'light') {
  getWebApp()?.HapticFeedback?.impactOccurred(type)
}
