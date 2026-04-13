export const tg = window.Telegram?.WebApp ?? null

export function tgReady() {
  tg?.ready()
  tg?.expand()
}

export function getTgUser() {
  return tg?.initDataUnsafe?.user ?? null
}

export function tgClose() {
  tg?.close()
}

export function tgHaptic(type = 'light') {
  tg?.HapticFeedback?.impactOccurred(type)
}
