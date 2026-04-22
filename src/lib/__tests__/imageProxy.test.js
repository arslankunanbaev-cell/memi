import { describe, expect, it } from 'vitest'
import { normalizeMomentMedia, normalizePhotoEntity, proxifyCoverUrl, shouldProxyCoverUrl } from '../imageProxy'

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

  it('proxies Spotify CDN cover URLs', () => {
    const original = 'https://image-cdn-ak.spotifycdn.com/image/ab67616d00001e028863bc11d2aa12b54f5aeb36'

    expect(shouldProxyCoverUrl(original)).toBe(true)
    expect(proxifyCoverUrl(original)).toBe(`/api/image-proxy?url=${encodeURIComponent(original)}`)
  })

  it('proxies Supabase-hosted photos', () => {
    const person = normalizePhotoEntity({
      id: 'p-1',
      photo_url: 'https://demo-project.supabase.co/storage/v1/object/sign/photos/user-1/pic.jpg?token=abc123',
    })

    expect(person.photo_url).toBe(
      '/api/image-proxy?url=https%3A%2F%2Fdemo-project.supabase.co%2Fstorage%2Fv1%2Fobject%2Fsign%2Fphotos%2Fuser-1%2Fpic.jpg%3Ftoken%3Dabc123',
    )
  })

  it('normalizes existing moment covers through the proxy', () => {
    const moment = normalizeMomentMedia({
      id: 'moment-1',
      photo_url: 'https://demo-project.supabase.co/storage/v1/object/sign/photos/user-1/moment.jpg?token=xyz',
      song_cover: 'https://e-cdns-images.dzcdn.net/images/cover/example/500x500-000000-80-0-0.jpg',
      people: [{ id: 'p-1', photo_url: 'https://t.me/i/userpic/320/example.svg' }],
    })

    expect(moment.photo_url).toBe(
      '/api/image-proxy?url=https%3A%2F%2Fdemo-project.supabase.co%2Fstorage%2Fv1%2Fobject%2Fsign%2Fphotos%2Fuser-1%2Fmoment.jpg%3Ftoken%3Dxyz',
    )
    expect(moment.song_cover).toBe(
      '/api/image-proxy?url=https%3A%2F%2Fe-cdns-images.dzcdn.net%2Fimages%2Fcover%2Fexample%2F500x500-000000-80-0-0.jpg',
    )
    expect(moment.people[0].photo_url).toBe('/api/image-proxy?url=https%3A%2F%2Ft.me%2Fi%2Fuserpic%2F320%2Fexample.svg')
  })
})
