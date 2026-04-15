import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Telegram WebApp mock ──────────────────────────────────────────────────────
global.window.Telegram = {
  WebApp: {
    ready: vi.fn(),
    expand: vi.fn(),
    close: vi.fn(),
    initDataUnsafe: {
      user: { id: 308362442, first_name: 'Test', last_name: 'User', username: 'testuser' },
    },
    initData: 'mock_init_data',
    version: '6.9',
    platform: 'ios',
    HapticFeedback: { impactOccurred: vi.fn() },
  },
}

// ── import.meta.env mock ──────────────────────────────────────────────────────
vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key-1234567890')
vi.stubEnv('VITE_LASTFM_API_KEY', 'mock-lastfm-key')

// ── Подавляем console.error в тестах (только неожиданные) ─────────────────────
const originalError = console.error
beforeEach(() => {
  console.error = (...args) => {
    // Подавляем React act() warnings — они не критичны в тестах
    if (typeof args[0] === 'string' && args[0].includes('act(')) return
    originalError(...args)
  }
})
afterEach(() => {
  console.error = originalError
})
