import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN       = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const WEBHOOK_SECRET  = Deno.env.get('TELEGRAM_WEBHOOK_SECRET') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const FEEDBACK_CHAT_ID = Deno.env.get('TELEGRAM_FEEDBACK_CHAT_ID') ?? ''
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

const FEEDBACK_PROMPT = [
  'Напишите жалобу или предложение ответом на это сообщение.',
  '',
  'Можно также отправить сразу так:',
  '/feedback ваш текст',
].join('\n')

const FEEDBACK_SENT_TEXT = 'Спасибо! Я передал фидбек.'
const FEEDBACK_UNAVAILABLE_TEXT = 'Фидбек временно недоступен. Попробуйте позже.'
const MAX_FEEDBACK_TEXT_LENGTH = 3200

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function isStartCommand(text: string) {
  return /^\/start(?:@\w+)?(?:\s+.*)?$/i.test(text.trim())
}

function parseFeedbackCommand(text: string) {
  const match = text.trim().match(/^\/feedback(?:@\w+)?(?:\s+([\s\S]+))?$/i)
  if (!match) return null
  return (match[1] ?? '').trim()
}

function isFeedbackReply(message: Record<string, unknown>) {
  const reply = message.reply_to_message as Record<string, unknown> | undefined
  return typeof reply?.text === 'string' && reply.text === FEEDBACK_PROMPT
}

function formatFeedbackMessage(message: Record<string, unknown>, feedbackText: string) {
  const from = message.from as Record<string, unknown> | undefined
  const chat = message.chat as Record<string, unknown> | undefined
  const safeFeedbackText = feedbackText.length > MAX_FEEDBACK_TEXT_LENGTH
    ? `${feedbackText.slice(0, MAX_FEEDBACK_TEXT_LENGTH)}\n\n[обрезано: сообщение было слишком длинным]`
    : feedbackText
  const name = [
    typeof from?.first_name === 'string' ? from.first_name : '',
    typeof from?.last_name === 'string' ? from.last_name : '',
  ].filter(Boolean).join(' ')
  const username = typeof from?.username === 'string' ? `@${from.username}` : 'без username'

  return [
    'Новый фидбек в memi',
    '',
    `От: ${name || 'без имени'} (${username})`,
    `Telegram ID: ${from?.id ?? 'unknown'}`,
    `Chat ID: ${chat?.id ?? 'unknown'}`,
    '',
    safeFeedbackText,
  ].join('\n')
}

async function sendMessage(chatId: number | string, text: string, extra: Record<string, unknown> = {}) {
  const tgRes = await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, ...extra }),
  })
  const tgJson = await tgRes.json().catch(() => null)
  if (!tgRes.ok || !tgJson?.ok) {
    throw new Error(tgJson?.description ?? 'Telegram sendMessage failed')
  }
}

async function sendWelcomeMessage(chatId: number | string) {
  await sendMessage(chatId, WELCOME_TEXT)
}

async function handleFeedback(message: Record<string, unknown>, feedbackText: string) {
  const chatId = message.chat ? (message.chat as Record<string, unknown>).id : undefined
  if (!chatId) return

  if (!FEEDBACK_CHAT_ID) {
    console.error('[feedback] TELEGRAM_FEEDBACK_CHAT_ID is not configured')
    await sendMessage(chatId as number | string, FEEDBACK_UNAVAILABLE_TEXT)
    return
  }

  await sendMessage(FEEDBACK_CHAT_ID, formatFeedbackMessage(message, feedbackText))
  await sendMessage(chatId as number | string, FEEDBACK_SENT_TEXT)
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

  const telegramPaymentChargeId = payment.telegram_payment_charge_id as string | undefined
  const providerPaymentChargeId = payment.provider_payment_charge_id as string | undefined

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
      const purchaseRecord = {
        user_id: user.id,
        telegram_id: telegramId,
        product_id: 'premium',
        stars_amount: totalStars,
        premium_expires_at: expiresAt.toISOString(),
        telegram_payment_charge_id: telegramPaymentChargeId ?? null,
        provider_payment_charge_id: providerPaymentChargeId ?? null,
        payload,
      }

      const { error: purchaseError } = telegramPaymentChargeId
        ? await sb
          .from('premium_purchases')
          .upsert(purchaseRecord, { onConflict: 'telegram_payment_charge_id' })
        : await sb
          .from('premium_purchases')
          .insert(purchaseRecord)

      if (purchaseError) {
        console.error('[payment] failed to save premium purchase:', purchaseError)
      }
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
    const text = typeof message?.text === 'string' ? message.text : ''

    const feedbackText = parseFeedbackCommand(text)
    if (chatId && feedbackText !== null) {
      if (!feedbackText) {
        await sendMessage(chatId as number | string, FEEDBACK_PROMPT, {
          reply_markup: { force_reply: true, selective: true },
        })
        return json({ ok: true })
      }

      await handleFeedback(message, feedbackText)
      return json({ ok: true })
    }

    if (chatId && text.trim() && message && isFeedbackReply(message)) {
      await handleFeedback(message, text.trim())
      return json({ ok: true })
    }

    // ── /start — приветствие ───────────────────────────────────────────────
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
