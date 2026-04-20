import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── Config ────────────────────────────────────────────────────────────────────
const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')              ?? ''
const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const MIGRATE_TOKEN = Deno.env.get('MIGRATE_SECRET_TOKEN')      ?? ''

// Signed URL lifetime: 10 years.
const SIGNED_URL_TTL = 315_360_000

// How many rows to process per call (safe for edge function timeout).
const BATCH_SIZE = 50

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extracts the storage object path from an old-style public URL.
 *
 * Input:  https://xxx.supabase.co/storage/v1/object/public/photos/uuid/1234.jpg
 * Output: uuid/1234.jpg
 *
 * Returns null for:
 *  - Telegram profile photo URLs (t.me/i/userpic/...)
 *  - Already-signed URLs (/storage/v1/object/sign/)
 *  - Any URL that doesn't contain the photos bucket public path
 */
function extractStoragePath(url: string): string | null {
  if (!url) return null
  // Already a signed URL — no migration needed
  if (url.includes('/storage/v1/object/sign/')) return null
  // External URL (e.g. Telegram CDN)
  if (!url.includes('/storage/v1/object/public/photos/')) return null

  const marker = '/storage/v1/object/public/photos/'
  const idx = url.indexOf(marker)
  if (idx === -1) return null
  const raw = url.slice(idx + marker.length)
  // Decode any percent-encoding in the path
  try { return decodeURIComponent(raw) } catch { return raw }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  // Simple secret token guard — prevents accidental re-runs from the web.
  // Set MIGRATE_SECRET_TOKEN in edge function env vars before calling.
  const authHeader = req.headers.get('authorization') ?? ''
  if (MIGRATE_TOKEN && authHeader !== `Bearer ${MIGRATE_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Parse optional dry_run query param: ?dry_run=true → log only, no writes.
  const url    = new URL(req.url)
  const dryRun = url.searchParams.get('dry_run') === 'true'

  const results = {
    dry_run: dryRun,
    moments: { processed: 0, updated: 0, skipped: 0, errors: 0 },
    people:  { processed: 0, updated: 0, skipped: 0, errors: 0 },
    details: [] as string[],
  }

  // ── Migrate moments ─────────────────────────────────────────────────────────
  const { data: moments, error: mErr } = await admin
    .from('moments')
    .select('id, photo_url, photo_path')
    .is('photo_path', null)
    .not('photo_url', 'is', null)
    .limit(BATCH_SIZE)

  if (mErr) {
    return new Response(JSON.stringify({ error: `moments fetch: ${mErr.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  for (const row of (moments ?? [])) {
    results.moments.processed++
    const path = extractStoragePath(row.photo_url)

    if (!path) {
      results.moments.skipped++
      results.details.push(`moment ${row.id}: skipped (external or already signed)`)
      continue
    }

    if (dryRun) {
      results.moments.updated++
      results.details.push(`moment ${row.id}: would set photo_path="${path}"`)
      continue
    }

    // Generate signed URL using service role (bypasses storage RLS).
    const { data: signed, error: signErr } = await admin.storage
      .from('photos')
      .createSignedUrl(path, SIGNED_URL_TTL)

    if (signErr || !signed?.signedUrl) {
      results.moments.errors++
      results.details.push(`moment ${row.id}: sign error — ${signErr?.message ?? 'no URL'}`)
      continue
    }

    const { error: upErr } = await admin
      .from('moments')
      .update({ photo_path: path, photo_url: signed.signedUrl })
      .eq('id', row.id)

    if (upErr) {
      results.moments.errors++
      results.details.push(`moment ${row.id}: update error — ${upErr.message}`)
    } else {
      results.moments.updated++
    }
  }

  // ── Migrate people ──────────────────────────────────────────────────────────
  const { data: people, error: pErr } = await admin
    .from('people')
    .select('id, photo_url, photo_path')
    .is('photo_path', null)
    .not('photo_url', 'is', null)
    .limit(BATCH_SIZE)

  if (pErr) {
    return new Response(JSON.stringify({ error: `people fetch: ${pErr.message}` }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  for (const row of (people ?? [])) {
    results.people.processed++
    const path = extractStoragePath(row.photo_url)

    if (!path) {
      results.people.skipped++
      results.details.push(`person ${row.id}: skipped (external or already signed)`)
      continue
    }

    if (dryRun) {
      results.people.updated++
      results.details.push(`person ${row.id}: would set photo_path="${path}"`)
      continue
    }

    const { data: signed, error: signErr } = await admin.storage
      .from('photos')
      .createSignedUrl(path, SIGNED_URL_TTL)

    if (signErr || !signed?.signedUrl) {
      results.people.errors++
      results.details.push(`person ${row.id}: sign error — ${signErr?.message ?? 'no URL'}`)
      continue
    }

    const { error: upErr } = await admin
      .from('people')
      .update({ photo_path: path, photo_url: signed.signedUrl })
      .eq('id', row.id)

    if (upErr) {
      results.people.errors++
      results.details.push(`person ${row.id}: update error — ${upErr.message}`)
    } else {
      results.people.updated++
    }
  }

  // ── Remaining count (to know if another call is needed) ─────────────────────
  const [{ count: remainingMoments }, { count: remainingPeople }] = await Promise.all([
    admin.from('moments').select('id', { count: 'exact', head: true })
      .is('photo_path', null).not('photo_url', 'is', null),
    admin.from('people').select('id', { count: 'exact', head: true })
      .is('photo_path', null).not('photo_url', 'is', null),
  ])

  return new Response(
    JSON.stringify({
      ...results,
      remaining: { moments: remainingMoments ?? 0, people: remainingPeople ?? 0 },
      done: (remainingMoments ?? 0) === 0 && (remainingPeople ?? 0) === 0,
    }, null, 2),
    { headers: { 'Content-Type': 'application/json', ...CORS } },
  )
})
