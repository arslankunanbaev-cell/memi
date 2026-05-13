export const ONBOARDING_STORAGE_KEY = 'memi_intro_onboarding_seen_v2'

export function hasSeenIntroOnboarding() {
  try {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function markIntroOnboardingSeen() {
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, '1')
  } catch {
    // Local storage can be unavailable in embedded browsers; navigation should still continue.
  }
}
