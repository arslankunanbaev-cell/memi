const IMAGE_PROXY_PATH = '/api/image-proxy'
const IMAGE_HOST_SUFFIXES = [
  '.scdn.co',
  '.spotifycdn.com',
  '.mzstatic.com',
  '.dzcdn.net',
  '.supabase.co',
  '.telegram.org',
  '.telegram-cdn.org',
]
const IMAGE_HOSTS = ['t.me']

function hasAllowedImageHost(hostname) {
  const normalizedHost = hostname.toLowerCase()
  return (
    IMAGE_HOSTS.includes(normalizedHost) ||
    IMAGE_HOST_SUFFIXES.some((suffix) => normalizedHost === suffix.slice(1) || normalizedHost.endsWith(suffix))
  )
}

export function isProxiedImageUrl(url) {
  return typeof url === 'string' && url.startsWith(`${IMAGE_PROXY_PATH}?url=`)
}

export function shouldProxyImageUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false
  if (isProxiedImageUrl(url)) return false
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return false

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return hasAllowedImageHost(parsed.hostname)
  } catch {
    return false
  }
}

export function proxifyImageUrl(url) {
  if (!shouldProxyImageUrl(url)) return url
  return `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`
}

export const shouldProxyCoverUrl = shouldProxyImageUrl
export const proxifyCoverUrl = proxifyImageUrl

export function normalizePhotoEntity(entity) {
  if (!entity) return entity

  return {
    ...entity,
    photo_url: proxifyImageUrl(entity.photo_url ?? null),
  }
}

export function normalizeMomentMedia(moment) {
  if (!moment) return moment

  return {
    ...moment,
    photo_url: proxifyImageUrl(moment.photo_url ?? null),
    song_cover: proxifyImageUrl(moment.song_cover ?? null),
    people: (moment.people ?? []).map((person) => normalizePhotoEntity(person)),
    taggedFriends: (moment.taggedFriends ?? []).map((friend) => normalizePhotoEntity(friend)),
  }
}
