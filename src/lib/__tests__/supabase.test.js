import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── supabase.js: assertSupabase ───────────────────────────────────────────────

describe('assertSupabase', () => {
  it('возвращает клиент если URL и ключ заданы', async () => {
    const { assertSupabase } = await import('../supabase.js')
    expect(() => assertSupabase()).not.toThrow()
  })

  it('возвращённый клиент имеет метод from', async () => {
    const { assertSupabase } = await import('../supabase.js')
    const sb = assertSupabase()
    expect(typeof sb.from).toBe('function')
  })

  it('бросает ошибку если VITE_SUPABASE_URL не задан', async () => {
    // Переопределяем env для этого теста
    vi.resetModules()
    vi.stubEnv('VITE_SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '')

    const { assertSupabase } = await import('../supabase.js')
    expect(() => assertSupabase()).toThrow('Supabase not configured')

    // Восстанавливаем
    vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key-1234567890')
    vi.resetModules()
  })
})
