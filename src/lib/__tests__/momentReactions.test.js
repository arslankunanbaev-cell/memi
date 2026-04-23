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
    mockInvoke.mockResolvedValue({ data: { ok: true }, error: null })
  })

  it('marks a first reaction as new and invokes the quiet notification function', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({
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

  it('also invokes the quiet notification function when the reaction changes later', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { id: 'reaction-1' },
      error: null,
    })
    mockSingle.mockResolvedValueOnce({
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
    expect(mockInvoke).toHaveBeenCalledWith('send-reaction-notification', {
      body: { reactionId: 'reaction-1' },
    })
  })

  it('still invokes the notification function when the moment owner id is not loaded on the client yet', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reaction-3',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '❤️',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
      error: null,
    })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '❤️',
      momentOwnerId: undefined,
    })

    expect(result.isNew).toBe(true)
    expect(mockInvoke).toHaveBeenCalledWith('send-reaction-notification', {
      body: { reactionId: 'reaction-3' },
    })
  })

  it('skips the notification when the owner reacts to their own moment', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockSingle.mockResolvedValueOnce({
      data: {
        id: 'reaction-1',
        moment_id: 'moment-1',
        user_id: 'user-1',
        emoji: '🫶',
        created_at: '2026-04-23T10:00:00.000Z',
        updated_at: '2026-04-23T10:00:00.000Z',
      },
      error: null,
    })

    const result = await upsertMomentReaction({
      momentId: 'moment-1',
      userId: 'user-1',
      emoji: '🫶',
      momentOwnerId: 'user-1',
    })

    expect(result.isNew).toBe(true)
    expect(mockInvoke).not.toHaveBeenCalled()
  })
})
