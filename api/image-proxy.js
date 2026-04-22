const ALLOWED_HOST_SUFFIXES = [
  '.scdn.co',
  '.spotifycdn.com',
  '.mzstatic.com',
  '.dzcdn.net',
  '.supabase.co',
  '.telegram.org',
  '.telegram-cdn.org',
]
const ALLOWED_HOSTS = ['t.me']

function isAllowedHost(hostname = '') {
  const normalizedHost = hostname.toLowerCase()
  return (
    ALLOWED_HOSTS.includes(normalizedHost) ||
    ALLOWED_HOST_SUFFIXES.some((suffix) => normalizedHost === suffix.slice(1) || normalizedHost.endsWith(suffix))
  )
}

function errorResponse(message, status) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

export const config = {
  runtime: 'edge',
}

export default async function handler(request) {
  if (request.method !== 'GET') {
    return errorResponse('Method not allowed', 405)
  }

  const { searchParams } = new URL(request.url)
  const rawUrl = searchParams.get('url')?.trim()

  if (!rawUrl) {
    return errorResponse('Missing url parameter', 400)
  }

  let upstreamUrl
  try {
    upstreamUrl = new URL(rawUrl)
  } catch {
    return errorResponse('Invalid url parameter', 400)
  }

  if (!['http:', 'https:'].includes(upstreamUrl.protocol) || !isAllowedHost(upstreamUrl.hostname)) {
    return errorResponse('Forbidden host', 403)
  }

  let upstreamResponse
  try {
    upstreamResponse = await fetch(upstreamUrl.toString(), {
      headers: {
        Accept: 'image/jpeg,image/png,image/apng,image/svg+xml,image/*;q=0.8,*/*;q=0.5',
      },
      redirect: 'follow',
    })
  } catch {
    return errorResponse('Upstream fetch failed', 502)
  }

  if (!upstreamResponse.ok) {
    return errorResponse('Upstream returned an error', 502)
  }

  const contentType = upstreamResponse.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().startsWith('image/')) {
    return errorResponse('Unsupported content type', 415)
  }

  const headers = new Headers()
  headers.set('Content-Type', contentType)
  headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
  headers.set('X-Content-Type-Options', 'nosniff')

  const contentLength = upstreamResponse.headers.get('content-length')
  if (contentLength) {
    headers.set('Content-Length', contentLength)
  }

  return new Response(upstreamResponse.body, {
    status: 200,
    headers,
  })
}
