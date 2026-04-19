import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN       = Deno.env.get('TELEGRAM_BOT_TOKEN')        ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL')               ?? ''
const SERVICE_KEY     = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')  ?? ''
const JWT_SECRET      = Deno.env.get('SUPABASE_JWT_SECRET')        ?? ''

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Валидация подписи Telegram initData ───────────────────────────────────────
async function validateInitData(initData: string): Promise<URLSearchParams | null> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null

  params.delete('hash')
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n')

  const enc = new TextEncoder()

  // secret_key = HMAC_SHA256(bot_token, "WebAppData")
  const baseKey = await crypto.subtle.importKey(
    'raw', enc.encode('WebAppData'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const secretBytes = await crypto.subtle.sign('HMAC', baseKey, enc.encode(BOT_TOKEN))

  // computed_hash = HMAC_SHA256(data_check_string, secret_key)
  const hmacKey = await crypto.subtle.importKey(
    'raw', secretBytes,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sigBytes = await crypto.subtle.sign('HMAC', hmacKey, enc.encode(dataCheckString))

  const computed = Array.from(new Uint8Array(sigBytes))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return computed === hash ? params : null
}

// ── Детерминированный UUID из telegram_id ─────────────────────────────────────
// Один и тот же telegram_id всегда даёт один и тот же UUID — идемпотентность
async function telegramIdToUUID(telegramId: number): Promise<string> {
  const bytes = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`tg:${telegramId}`))
  ).slice(0, 16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40  // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80  // variant
  const h = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`
}

// ── Подписываем JWT совместимый с Supabase ────────────────────────────────────
async function signJWT(sub: string, email: string): Promise<string> {
  const enc = new TextEncoder()
  const b64url = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const header  = b64url({ alg: 'HS256', typ: 'JWT' })
  const now     = Math.floor(Date.now() / 1000)
  const payload = b64url({
    sub,
    email,
    role:  'authenticated',
    iss:   'supabase',
    aud:   'authenticated',
    iat:   now,
    exp:   now + 60 * 60 * 24,  // 24 часа
  })

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(JWT_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${header}.${payload}`))
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  return `${header}.${payload}.${signature}`
}

// ── Handler ───────────────────────────────────────────────────────────────────
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })

  try {
    const { initData } = await req.json()

    // ── Определяем пользователя Telegram ──────────────────────────────────────
    let tgUser: { id: number; first_name: string; last_name?: string; photo_url?: string }

    // Dev mode only when BOT_TOKEN is absent — never bypassed in production.
    const isDev = !BOT_TOKEN
    if (isDev) {
      tgUser = { id: 12345, first_name: 'Dev', last_name: 'User' }
    } else {
      const params = await validateInitData(initData ?? '')
      if (!params) {
        return new Response(JSON.stringify({ error: 'Invalid Telegram signature' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }

      // Replay protection: reject payloads older than 5 minutes.
      const authDate = Number(params.get('auth_date') ?? '0')
      const nowSec = Math.floor(Date.now() / 1000)
      if (!authDate || nowSec - authDate > 300) {
        return new Response(JSON.stringify({ error: 'Telegram auth data expired' }), {
          status: 401, headers: { 'Content-Type': 'application/json', ...CORS },
        })
      }

      tgUser = JSON.parse(params.get('user') ?? '{}')
    }

    if (!tgUser?.id) {
      return new Response(JSON.stringify({ error: 'No user in initData' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const authId = await telegramIdToUUID(tgUser.id)
    const email  = `tg_${tgUser.id}@memi.internal`
    const name   = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ') || 'Пользователь'

    // Stable public code: SHA-256 hex of telegram_id (matches security_hardening.sql backfill).
    const enc2 = new TextEncoder()
    const hashBytes = await crypto.subtle.digest('SHA-256', enc2.encode(String(tgUser.id)))
    const publicCode = Array.from(new Uint8Array(hashBytes))
      .map(b => b.toString(16).padStart(2, '0')).join('')

    // ── Создаём auth.users (идемпотентно — если уже есть, игнорируем ошибку) ──
    await admin.auth.admin.createUser({
      id: authId,
      email,
      email_confirm: true,
      user_metadata: { telegram_id: tgUser.id, name, photo_url: tgUser.photo_url ?? null },
    })
    // Ошибка "already exists" нас не волнует — UUID детерминирован, просто используем его

    // ── Синхронизируем public.users ────────────────────────────────────────────
    const { data: existingUser } = await admin
      .from('users')
      .select('id, auth_id, name, photo_url, public_code')
      .eq('telegram_id', tgUser.id)
      .maybeSingle()

    if (existingUser) {
      const updates: Record<string, unknown> = {}
      if (!existingUser.auth_id)                        updates.auth_id     = authId
      if (existingUser.name      !== name)              updates.name        = name
      if (existingUser.photo_url !== (tgUser.photo_url ?? null)) updates.photo_url = tgUser.photo_url ?? null
      if (!existingUser.public_code)                    updates.public_code = publicCode
      if (Object.keys(updates).length > 0) {
        await admin.from('users').update(updates).eq('id', existingUser.id)
      }
    } else {
      await admin.from('users').insert({
        auth_id:     authId,
        telegram_id: tgUser.id,
        name,
        photo_url:   tgUser.photo_url ?? null,
        public_code: publicCode,
      })
    }

    // ── Выдаём JWT ─────────────────────────────────────────────────────────────
    const access_token = await signJWT(authId, email)

    return new Response(JSON.stringify({ access_token }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })

  } catch (e) {
    console.error('[telegram-auth]', (e as Error).message)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
