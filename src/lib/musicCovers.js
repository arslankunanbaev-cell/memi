/**
 * musicCovers.js
 * Enriches track results with album art.
 * Priority: Spotify → iTunes → Deezer → null (caller shows placeholder)
 *
 * All three APIs are fired in parallel; highest-priority winner is used.
 */

const SPOTIFY_CLIENT_ID     = import.meta.env.VITE_SPOTIFY_CLIENT_ID
const SPOTIFY_CLIENT_SECRET = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET

// ── In-memory cover cache (persists for app lifetime) ─────────────────────────
const coverCache = new Map()

// ── Spotify token cache ───────────────────────────────────────────────────────
let _spotifyToken     = null
let _tokenExpiresAt   = 0

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Strips noise from track/artist names before sending to search APIs.
 * Removes: (feat. X), (ft. X), (Official Video), (Remix), remaster tags, etc.
 */
export function cleanName(str = '') {
  return str
    .replace(/\(feat\.?\s[^)]+\)/gi, '')
    .replace(/\(ft\.?\s[^)]+\)/gi, '')
    .replace(/\bfeat\.?\s\S+/gi, '')
    .replace(/\bft\.?\s\S+/gi, '')
    .replace(/\((official|lyric|music|video|audio|live|acoustic|remaster|remastered|version|remix)[^)]*\)/gi, '')
    .replace(/[^\p{L}\p{N}\s\-']/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

/** Safe fetch with timeout; returns null instead of throwing. */
async function safeFetch(url, options = {}) {
  const { timeout = 5000, ...fetchOpts } = options
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, { signal: controller.signal, ...fetchOpts })
    clearTimeout(timer)
    if (!res.ok) { console.warn('[covers] fetch not ok', res.status, url); return null }
    return await res.json()
  } catch (e) {
    clearTimeout(timer)
    console.warn('[covers] fetch error', e?.message, url)
    return null
  }
}

// ── Spotify ───────────────────────────────────────────────────────────────────

async function getSpotifyToken() {
  if (_spotifyToken && Date.now() < _tokenExpiresAt) return _spotifyToken
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) return null

  const json = await safeFetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`),
    },
    body: 'grant_type=client_credentials',
    timeout: 6000,
  })

  if (!json?.access_token) return null
  _spotifyToken    = json.access_token
  _tokenExpiresAt  = Date.now() + (json.expires_in - 60) * 1000
  return _spotifyToken
}

async function fetchSpotifyCover(track, artist) {
  const token = await getSpotifyToken()
  if (!token) return null

  const params = new URLSearchParams({
    q: `track:${cleanName(track)} artist:${cleanName(artist)}`,
    type: 'track',
    limit: '1',
  })
  const json = await safeFetch(
    `https://api.spotify.com/v1/search?${params}`,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 5000 }
  )
  return json?.tracks?.items?.[0]?.album?.images?.[0]?.url ?? null
}

// ── iTunes ────────────────────────────────────────────────────────────────────

async function fetchItunesCover(track, artist) {
  const term = encodeURIComponent(`${cleanName(artist)} ${cleanName(track)}`)
  const json = await safeFetch(
    `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=1`,
    { timeout: 4000 }
  )
  const art = json?.results?.[0]?.artworkUrl100
  // artworkUrl100 → 600×600 by replacing the size segment
  return art ? art.replace('100x100bb', '600x600bb') : null
}

// ── Deezer ────────────────────────────────────────────────────────────────────
// Note: Deezer does not set CORS headers for browser requests in most envs.
// Included as spec-required fallback; errors are swallowed silently.

async function fetchDeezerCover(track, artist) {
  const q = encodeURIComponent(`${cleanName(artist)} ${cleanName(track)}`)
  const json = await safeFetch(
    `https://api.deezer.com/search?q=${q}&limit=1`,
    { timeout: 4000 }
  )
  return json?.data?.[0]?.album?.cover_big
      ?? json?.data?.[0]?.album?.cover
      ?? null
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the best available album cover URL for a track.
 *
 * @param {string} track  - Track title
 * @param {string} artist - Artist name
 * @returns {Promise<{ url: string|null, source: 'spotify'|'itunes'|'deezer'|'fallback' }>}
 */
export async function enrichWithCover(track, artist) {
  const cacheKey = `${artist.toLowerCase()}::${track.toLowerCase()}`
  if (coverCache.has(cacheKey)) return coverCache.get(cacheKey)

  // Fire all three in parallel — don't wait for each to fail sequentially
  const [spotify, itunes, deezer] = await Promise.allSettled([
    fetchSpotifyCover(track, artist),
    fetchItunesCover(track, artist),
    fetchDeezerCover(track, artist),
  ])

  const result =
    (spotify.status === 'fulfilled' && spotify.value
      ? { url: spotify.value, source: 'spotify' }
      : null)
    ?? (itunes.status === 'fulfilled' && itunes.value
      ? { url: itunes.value, source: 'itunes' }
      : null)
    ?? (deezer.status === 'fulfilled' && deezer.value
      ? { url: deezer.value, source: 'deezer' }
      : null)
    ?? { url: null, source: 'fallback' }

  console.log('[covers]', track, '-', artist, '→', result.source, result.url ? '✓' : '✗')
  coverCache.set(cacheKey, result)
  return result
}

/**
 * Enriches an array of tracks in parallel, resolving covers concurrently.
 *
 * @param {{ name: string, artist: string }[]} tracks
 * @returns {Promise<{ name, artist, cover, coverSource }[]>}
 */
export async function enrichTracksWithCovers(tracks) {
  const enriched = await Promise.allSettled(
    tracks.map((t) => enrichWithCover(t.name, t.artist))
  )
  return tracks.map((t, i) => {
    const res = enriched[i]
    const cover = res.status === 'fulfilled' ? res.value : { url: null, source: 'fallback' }
    return { ...t, cover: cover.url, coverSource: cover.source }
  })
}

/**
 * Deterministic warm color per artist name — used as placeholder background.
 */
export function artistColor(artist = '') {
  const PALETTE = ['#D98B52', '#7A6B8A', '#6B8F71', '#A05E2C', '#8A7A6A', '#5B7FA6', '#B56B6B', '#4A8A8A']
  let h = 0
  for (let i = 0; i < artist.length; i++) h = (h * 31 + artist.charCodeAt(i)) & 0xffff
  return PALETTE[h % PALETTE.length]
}
