import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('../supabase.js', () => ({
  assertSupabase: () => ({
    functions: {
      invoke: mockInvoke,
    },
  }),
}))

import { notifyTaggedFriends } from '../api.js'

describe('notifyTaggedFriends', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the tag notification edge function with unique tagged ids', async () => {
    mockInvoke.mockResolvedValue({
      data: { ok: true, sent_count: 2 },
      error: null,
    })

    const result = await notifyTaggedFriends('moment-1', ['user-2', 'user-3', 'user-2'])

    expect(mockInvoke).toHaveBeenCalledWith('send-tag-notification', {
      body: {
        momentId: 'moment-1',
        taggedUserIds: ['user-2', 'user-3'],
      },
    })
    expect(result).toEqual({ ok: true, sent_count: 2 })
  })

  it('does not call the edge function without tagged friends', async () => {
    const result = await notifyTaggedFriends('moment-1', [])

    expect(mockInvoke).not.toHaveBeenCalled()
    expect(result).toEqual({ ok: true, skipped: 'no_tagged_friends' })
  })
})
