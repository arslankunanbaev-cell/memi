const IMAGE_PROXY_PATH = '/api/image-proxy'
const COVER_HOST_SUFFIXES = ['.scdn.co', '.mzstatic.com', '.dzcdn.net']

function hasAllowedCoverHost(hostname) {
  const normalizedHost = hostname.toLowerCase()
  return COVER_HOST_SUFFIXES.some((suffix) => normalizedHost === suffix.slice(1) || normalizedHost.endsWith(suffix))
}

export function isProxiedImageUrl(url) {
  return typeof url === 'string' && url.startsWith(`${IMAGE_PROXY_PATH}?url=`)
}

export function shouldProxyCoverUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return false
  if (isProxiedImageUrl(url)) return false
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/')) return false

  try {
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return hasAllowedCoverHost(parsed.hostname)
  } catch {
    return false
  }
}

export function proxifyCoverUrl(url) {
  if (!shouldProxyCoverUrl(url)) return url
  return `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`
}

export function normalizeMomentMedia(moment) {
  if (!moment) return moment

  return {
    ...moment,
    song_cover: proxifyCoverUrl(moment.song_cover ?? null),
  }
}
