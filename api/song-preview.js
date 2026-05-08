function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.end(JSON.stringify(body))
}

function cleanName(value = '') {
  return String(value)
    .replace(/\(feat\.?\s[^)]+\)/gi, '')
    .replace(/\(ft\.?\s[^)]+\)/gi, '')
    .replace(/\bfeat\.?\s\S+/gi, '')
    .replace(/\bft\.?\s\S+/gi, '')
    .replace(/\((official|lyric|music|video|audio|live|acoustic|remaster|remastered|version|remix)[^)]*\)/gi, '')
    .replace(/[^\p{L}\p{N}\s\-']/gu, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function scoreResult(result, track, artist) {
  const trackName = String(result.trackName ?? '').toLowerCase()
  const artistName = String(result.artistName ?? '').toLowerCase()
  const cleanTrack = cleanName(track).toLowerCase()
  const cleanArtist = cleanName(artist).toLowerCase()

  let score = 0
  if (trackName === cleanTrack) score += 8
  else if (trackName.includes(cleanTrack) || cleanTrack.includes(trackName)) score += 4

  if (artistName === cleanArtist) score += 8
  else if (artistName.includes(cleanArtist) || cleanArtist.includes(artistName)) score += 4

  if (result.previewUrl) score += 2
  return score
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
    res.end()
    return
  }

  const track = cleanName(req.query.track ?? '')
  const artist = cleanName(req.query.artist ?? '')

  if (!track && !artist) {
    json(res, 400, { previewUrl: null, cover: null, error: 'track or artist is required' })
    return
  }

  try {
    const term = encodeURIComponent(`${artist} ${track}`.trim())
    const url = `https://itunes.apple.com/search?term=${term}&media=music&entity=song&limit=10`
    const response = await fetch(url)

    if (!response.ok) {
      json(res, 502, { previewUrl: null, cover: null, error: 'itunes request failed' })
      return
    }

    const data = await response.json()
    const results = Array.isArray(data?.results) ? data.results : []
    const match = results
      .filter((result) => result.previewUrl)
      .sort((a, b) => scoreResult(b, track, artist) - scoreResult(a, track, artist))[0]

    const cover = match?.artworkUrl100
      ? match.artworkUrl100.replace('100x100bb', '600x600bb')
      : null

    json(res, 200, {
      previewUrl: match?.previewUrl ?? null,
      cover,
      trackName: match?.trackName ?? null,
      artistName: match?.artistName ?? null,
    })
  } catch (error) {
    json(res, 500, { previewUrl: null, cover: null, error: error?.message ?? 'unknown error' })
  }
}
