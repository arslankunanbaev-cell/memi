import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()
const mockInvoke = vi.fn()

function createQueryBuilder() {
  const builder = {
    eq: vi.fn(() => builder),
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
  }

  return builder
}

const mockFrom = vi.fn((table) => {
  if (table === 'moment_reactions') {
    return {
      select: vi.fn(() => createQueryBuilder()),
      upsert: mockUpsert,
    }
  }

  return {
    select: vi.fn(() => createQueryBuilder()),
  }
})

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

  it('uses the server-side reaction flow and returns the edge result', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        reaction: {
          id: 'reaction-1',
          moment_id: 'moment-1',
          user_id: 'user-1',
          emoji: '🔥',
          created_at: '2026-04-23T10:00:00.000Z',
          updated_at: '2026-04-23T10:00:00.000Z',
        },
        isNew: true,
      },
      error: null,
    })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '🔥',
      momentOwnerId: 'user-2',
    })

    expect(mockInvoke).toHaveBeenCalledWith('send-reaction-notification', {
      body: { momentId: 'moment-1', emoji: '🔥' },
    })
    expect(result).toEqual({
      reaction: {
        id: 'reaction-1',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '🔥',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
      isNew: true,
    })
  })

  it('supports notification-worthy reaction changes through the same server-side flow', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: {
        ok: true,
        reaction: {
          id: 'reaction-1',
          moment_id: 'moment-1',
          user_id: 'user-1',
          emoji: '❤️',
          created_at: '2026-04-23T10:00:00.000Z',
          updated_at: '2026-04-23T10:05:00.000Z',
        },
        isNew: false,
      },
      error: null,
    })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '❤️',
      momentOwnerId: 'user-2',
    })

    expect(mockInvoke).toHaveBeenCalledWith('send-reaction-notification', {
      body: { momentId: 'moment-1', emoji: '❤️' },
    })
    expect(result.isNew).toBe(false)
    expect(result.reaction.emoji).toBe('❤️')
  })

  it('falls back to the direct table upsert if the edge function does not return a reaction', async () => {
    mockInvoke.mockResolvedValueOnce({
      data: { ok: false },
      error: null,
    })
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reaction-2',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '🫶',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
      error: null,
    })
    mockInvoke.mockResolvedValueOnce({ data: { ok: true }, error: null })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '🫶',
      momentOwnerId: 'user-2',
    })

    expect(mockFrom).toHaveBeenCalledWith('moment_reactions')
    expect(mockUpsert).toHaveBeenCalled()
    expect(mockInvoke).toHaveBeenNthCalledWith(2, 'send-reaction-notification', {
      body: { reactionId: 'reaction-2' },
    })
    expect(result.isNew).toBe(true)
    expect(result.reaction.id).toBe('reaction-2')
  })
})
