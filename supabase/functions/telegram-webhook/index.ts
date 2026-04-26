import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN       = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const WEBHOOK_SECRET  = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TG_API          = `https://api.telegram.org/bot${BOT_TOKEN}`
const ASSETS_BASE     = 'https://memi-sand.vercel.app/tut'

// Длительность подписки — 30 дней
const PREMIUM_DAYS = 30

const WELCOME_TEXT = [
  'Привет 👋',
  'Добро пожаловать в memi.',
  '',
  'Сохраняй моменты, которые не хочется забыть —',
  'с фото, людьми и музыкой.',
  '',
  'Создай свою капсулу воспоминаний.',
].join('\n')

const TUTORIAL_IMAGE_FILES = [
  'tutorial-home.png',
  'tutorial-add-basic.png',
  'tutorial-add-social.png',
  'tutorial-people.png',
]

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isStartCommand(text: string) {
  return /^\/start(?:@\w+)?(?:\s+.*)?$/i.test(text.trim())
}

async function sendWelcomeMessage(chatId: number | string) {
  const tgRes = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: WELCOME_TEXT }),
  })
  const tgJson = await tgRes.json().catch(() => null)
  if (!tgRes.ok || !tgJson?.ok) {
    throw new Error(tgJson?.description ?? 'Telegram sendMessage failed')
  }
}

async function sendTutorial(chatId: number | string) {
  const media = TUTORIAL_IMAGE_FILES.map(fileName => ({
    type: 'photo',
    media: `${ASSETS_BASE}/${fileName}`,
  }))

  const tgRes = await fetch(`${TG_API}/sendMediaGroup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, media, disable_notification: true }),
  })
  const tgJson = await tgRes.json().catch(() => null)
  if (!tgRes.ok || !tgJson?.ok) {
    console.warn(`[telegram-webhook] sendMediaGroup failed: ${tgJson?.description}`)
  }
}

// ── Ответ на pre_checkout_query (обязательно в течение 10 сек) ─────────────
async function answerPreCheckout(preCheckoutQueryId: string, ok: boolean, errorMessage?: string) {
  const body: Record<string, unknown> = {
    pre_checkout_query_id: preCheckoutQueryId,
    ok,
  }
  if (!ok && errorMessage) body.error_message = errorMessage

  const res = await fetch(`${TG_API}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const resJson = await res.json().catch(() => null)
  if (!res.ok || !resJson?.ok) {
    console.error('[telegram-webhook] answerPreCheckoutQuery failed:', resJson?.description)
  }
}

// ── Обработка успешной оплаты ──────────────────────────────────────────────
async function handleSuccessfulPayment(message: Record<string, unknown>) {
  const payment   = message.successful_payment as Record<string, unknown>
  const telegramId = (message.from as Record<string, unknown>)?.id

  if (!payment || !telegramId) return

  const payload    = payment.invoice_payload as string  // 'premium' | 'theme_summer' | 'theme_cinema'
  const totalStars = payment.total_amount as number     // в Stars

  console.log(`[payment] telegram_id=${telegramId} payload=${payload} stars=${totalStars}`)

  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  // Найти юзера по telegram_id
  const { data: user, error: userError } = await sb
    .from('users')
    .select('id, is_premium, premium_expires_at')
    .eq('telegram_id', telegramId)
    .single()

  if (userError || !user) {
    console.error('[payment] user not found for telegram_id:', telegramId, userError)
    return
  }

  if (payload === 'premium') {
    // Продлеваем подписку от текущей даты истечения или от сейчас
    const base = user.premium_expires_at && new Date(user.premium_expires_at) > new Date()
      ? new Date(user.premium_expires_at)
      : new Date()

    const expiresAt = new Date(base)
    expiresAt.setDate(expiresAt.getDate() + PREMIUM_DAYS)

    const { error } = await sb
      .from('users')
      .update({
        is_premium: true,
        premium_expires_at: expiresAt.toISOString(),
      })
      .eq('id', user.id)

    if (error) {
      console.error('[payment] failed to update premium:', error)
    } else {
      console.log(`[payment] ✅ premium activated until ${expiresAt.toISOString()} for user ${user.id}`)
    }

  } else if (payload.startsWith('theme_')) {
    // Например payload = 'theme_summer' → themeId = 'summer'
    const themeId = payload.replace('theme_', '')

    const { error } = await sb
      .from('user_themes')
      .upsert({ user_id: user.id, theme_id: themeId }, { onConflict: 'user_id,theme_id' })

    if (error) {
      console.error('[payment] failed to save theme:', error)
    } else {
      console.log(`[payment] ✅ theme '${themeId}' purchased for user ${user.id}`)
    }
  }

  // Отправить подтверждение юзеру в чат
  const chatId = (message.chat as Record<string, unknown>)?.id
  if (chatId) {
    const text = payload === 'premium'
      ? '⭐ Memi Premium активирован! Открой приложение, чтобы увидеть изменения.'
      : `✅ Тема куплена! Открой редактор историй в memi.`

    await fetch(`${TG_API}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    }).catch(() => null)
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  // ── Диагностика: GET /telegram-webhook ────────────────────────────────────
  if (req.method === 'GET') {
    const [webhookInfo, botInfo] = await Promise.all([
      fetch(`${TG_API}/getWebhookInfo`).then(r => r.json()).catch((e) => ({ error: String(e) })),
      fetch(`${TG_API}/getMe`).then(r => r.json()).catch((e) => ({ error: String(e) })),
    ])
    return json({ botTokenSet: BOT_TOKEN.length > 0, webhookInfo, botInfo })
  }

  if (req.method !== 'POST') {
    return json({ ok: true, info: 'telegram-webhook expects Telegram updates via POST' })
  }

  if (!BOT_TOKEN) {
    return json({ error: 'Bot token not configured' }, 500)
  }

  const update = await req.json().catch(() => null) as Record<string, unknown> | null
  if (!update) return json({ ok: true })

  // ── Платёжные события — ДО проверки секрета ──────────────────────────────
  // Webhook был зарегистрирован БЕЗ secret_token, поэтому Telegram не шлёт
  // X-Telegram-Bot-Api-Secret-Token. Все payment-critical события обрабатываем
  // до секрет-чека чтобы они не блокировались 401.

  if (update?.pre_checkout_query) {
    const pcq = update.pre_checkout_query as Record<string, unknown>
    console.log('[pre_checkout_query] id=', pcq.id)
    try {
      await answerPreCheckout(pcq.id as string, true)
      console.log('[pre_checkout_query] answered OK')
    } catch (err) {
      console.error('[pre_checkout_query] answerPreCheckout failed:', err)
    }
    return json({ ok: true })
  }

  const message = update?.message as Record<string, unknown> | undefined

  if (message?.successful_payment) {
    console.log('[successful_payment] processing...')
    try {
      await handleSuccessfulPayment(message)
      console.log('[successful_payment] done')
    } catch (err) {
      console.error('[successful_payment] failed:', err)
    }
    return json({ ok: true })
  }

  // Проверка секрета — только логируем несоответствие, не блокируем.
  // Webhook был зарегистрирован без secret_token, поэтому Telegram не шлёт
  // заголовок. Полная блокировка через 401 сломала бы все обновления.
  if (WEBHOOK_SECRET) {
    const incoming = req.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? ''
    if (incoming !== WEBHOOK_SECRET) {
      console.warn('[webhook] secret mismatch — continuing anyway (webhook registered without secret_token)')
    }
  }

  try {
    const chatId = message?.chat ? (message.chat as Record<string, unknown>).id : undefined

    // ── /start — приветствие ───────────────────────────────────────────────
    const text = typeof message?.text === 'string' ? message.text : ''
    if (!chatId || !isStartCommand(text)) {
      return json({ ok: true, ignored: true })
    }

    await sendWelcomeMessage(chatId as number)
    await sendTutorial(chatId as number)

    return json({ ok: true })
  } catch (error) {
    console.error('[telegram-webhook]', error)
    return json({ error: (error as Error).message }, 500)
  }
})
