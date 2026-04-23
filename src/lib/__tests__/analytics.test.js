import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockInsert, mockFrom, mockGetState } = vi.hoisted(() => {
  const insert = vi.fn()
  const from = vi.fn(() => ({ insert }))
  const getState = vi.fn()

  return {
    mockInsert: insert,
    mockFrom: from,
    mockGetState: getState,
  }
})

vi.mock('../supabase.js', () => ({
  assertSupabase: () => ({
    from: mockFrom,
  }),
}))

vi.mock('../../store/useAppStore.js', () => ({
  useAppStore: {
    getState: mockGetState,
  },
}))

import { trackEvent } from '../analytics.js'

describe('trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetState.mockReturnValue({ currentUser: { id: 'user-1' } })
    mockInsert.mockResolvedValue({ error: null })
  })

  it('inserts the event for the current user', async () => {
    await trackEvent('moment_created', {
      has_photo: true,
      people_count: 2,
      ignored: undefined,
    })

    expect(mockFrom).toHaveBeenCalledWith('events')
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      event_name: 'moment_created',
      metadata: {
        has_photo: true,
        people_count: 2,
      },
    })
  })

  it('skips inserts when the current user is unavailable', async () => {
    mockGetState.mockReturnValue({ currentUser: null })

    await trackEvent('app_opened')

    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('swallows analytics errors', async () => {
    mockInsert.mockRejectedValueOnce(new Error('insert failed'))

    await expect(trackEvent('app_opened')).resolves.toBeUndefined()
  })
})
