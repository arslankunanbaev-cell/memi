import { beforeEach, describe, expect, it, vi } from 'vitest'
import { enrichWithCover } from '../musicCovers'

describe('musicCovers', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends anon auth headers to spotify-cover and prefers its result', async () => {
    const fetchMock = vi.spyOn(global, 'fetch').mockImplementation((url, options = {}) => {
      const requestUrl = String(url)

      if (requestUrl.includes('/functions/v1/spotify-cover?')) {
        expect(options.headers).toMatchObject({
          Authorization: 'Bearer mock-anon-key-1234567890',
          apikey: 'mock-anon-key-1234567890',
        })

        return Promise.resolve({
          ok: true,
          json: async () => ({ url: 'https://i.scdn.co/image/ab67616d0000b273232db97bdd41d96894fc2516' }),
        })
      }

      if (requestUrl.startsWith('https://itunes.apple.com/search?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [] }),
        })
      }

      if (requestUrl.startsWith('https://api.deezer.com/search?')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [] }),
        })
      }

      return Promise.reject(new Error(`Unexpected fetch: ${requestUrl}`))
    })

    const result = await enrichWithCover('Дедули', 'Баста')

    expect(result).toEqual({
      url: '/api/image-proxy?url=https%3A%2F%2Fi.scdn.co%2Fimage%2Fab67616d0000b273232db97bdd41d96894fc2516',
      source: 'spotify',
    })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
