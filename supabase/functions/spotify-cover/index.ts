import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CLIENT_ID     = Deno.env.get('SPOTIFY_CLIENT_ID')     ?? ''
const CLIENT_SECRET = Deno.env.get('SPOTIFY_CLIENT_SECRET') ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

let _token      = ''
let _expiresAt  = 0

async function getToken(): Promise<string | null> {
  if (_token && Date.now() < _expiresAt) return _token
  if (!CLIENT_ID || !CLIENT_SECRET) return null

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(`${CLIENT_ID}:${CLIENT_SECRET}`),
    },
    body: 'grant_type=client_credentials',
  })

  if (!res.ok) return null
  const json = await res.json()
  _token     = json.access_token
  _expiresAt = Date.now() + (json.expires_in - 60) * 1000
  return _token
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  const { searchParams } = new URL(req.url)
  const track  = searchParams.get('track')  ?? ''
  const artist = searchParams.get('artist') ?? ''

  if (!track && !artist) {
    return new Response(JSON.stringify({ url: null }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  try {
    const token = await getToken()
    if (!token) {
      return new Response(JSON.stringify({ url: null }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const params = new URLSearchParams({
      q: `track:${track} artist:${artist}`,
      type: 'track',
      limit: '1',
    })
    const res = await fetch(`https://api.spotify.com/v1/search?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      return new Response(JSON.stringify({ url: null }), {
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const json = await res.json()
    const url  = json?.tracks?.items?.[0]?.album?.images?.[0]?.url ?? null

    return new Response(JSON.stringify({ url }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    console.error('[spotify-cover] error:', (e as Error).message)
    return new Response(JSON.stringify({ url: null }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
