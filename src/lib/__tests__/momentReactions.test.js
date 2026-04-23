import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSingle = vi.fn()
const mockSelect = vi.fn()
const mockEq = vi.fn()
const mockOrder = vi.fn()
const mockUpsert = vi.fn()
const mockInvoke = vi.fn()

const mockFrom = vi.fn(() => ({
  select: mockSelect,
  upsert: mockUpsert,
}))

mockSelect.mockReturnValue({
  eq: mockEq,
  single: mockSingle,
  maybeSingle: mockSingle,
  order: mockOrder,
})
mockEq.mockReturnValue({
  single: mockSingle,
  maybeSingle: mockSingle,
  order: mockOrder,
})
mockOrder.mockResolvedValue({ data: [], error: null })
mockUpsert.mockReturnValue({
  select: () => ({ single: mockSingle }),
})

vi.mock('../supabase.js', () => ({
  assertSupabase: () => ({
    from: mockFrom,
    functions: {
      invoke: mockInvoke,
    },
  }),
}))

import { upsertMomentReaction } from '../api.js'

describe('upsertMomentReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('marks a first reaction as new and invokes the quiet notification function', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'reaction-1',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '🔥',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
      error: null,
    })
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '🔥',
      momentOwnerId: 'user-2',
    })

    expect(result.isNew).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('send-reaction-notification', {
      body: { reactionId: 'reaction-1' },
    })
  })

  it('does not invoke a second notification when the reaction was updated', async () => {
    mockSingle.mockResolvedValue({
      data: {
        id: 'reaction-1',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '❤️',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:05:00.000Z',
      },
      error: null,
    })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '❤️',
      momentOwnerId: 'user-2',
    })

    expect(result.isNew).toBe(false)
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
