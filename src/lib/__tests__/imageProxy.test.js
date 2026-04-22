import { describe, expect, it } from 'vitest'
import { normalizeMomentMedia, proxifyCoverUrl, shouldProxyCoverUrl } from '../imageProxy'

describe('imageProxy helpers', () => {
  it('proxies cover URLs from known music CDNs', () => {
    const original = 'https://is1-ssl.mzstatic.com/image/thumb/Music126/v4/example/600x600bb.jpg'

    expect(shouldProxyCoverUrl(original)).toBe(true)
    expect(proxifyCoverUrl(original)).toBe(`/api/image-proxy?url=${encodeURIComponent(original)}`)
  })

  it('keeps unrelated image URLs untouched', () => {
    const original = 'https://cdn.example.com/cover.jpg'

    expect(shouldProxyCoverUrl(original)).toBe(false)
    expect(proxifyCoverUrl(original)).toBe(original)
  })

  it('normalizes existing moment covers through the proxy', () => {
    const moment = normalizeMomentMedia({
      id: 'moment-1',
      song_cover: 'https://e-cdns-images.dzcdn.net/images/cover/example/500x500-000000-80-0-0.jpg',
    })

    expect(moment.song_cover).toBe(
      '/api/image-proxy?url=https%3A%2F%2Fe-cdns-images.dzcdn.net%2Fimages%2Fcover%2Fexample%2F500x500-000000-80-0-0.jpg',
    )
  })
})
