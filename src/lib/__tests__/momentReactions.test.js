import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockMaybeSingle = vi.fn()
const mockSingle = vi.fn()
const mockUpsert = vi.fn()
const mockGetSession = vi.fn()
const mockFetch = vi.fn()

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
    auth: {
      getSession: mockGetSession,
    },
  }),
}))

import { upsertMomentReaction } from '../api.js'

describe('upsertMomentReaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'session-token',
        },
      },
    })
    vi.stubGlobal('fetch', mockFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/send-reaction-notification'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reactionId: 'reaction-1' }),
        headers: expect.objectContaining({
          Authorization: 'Bearer session-token',
          'Content-Type': 'application/json',
        }),
      }),
    )
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
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/send-reaction-notification'),
      expect.objectContaining({
        body: JSON.stringify({ reactionId: 'reaction-1' }),
      }),
    )
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
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
