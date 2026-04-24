import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

const WELCOME_TEXT = [
  'Привет 👋',
  'Добро пожаловать в memi.',
  '',
  'Сохраняй моменты, которые не хочется забыть —',
  'с фото, людьми и музыкой.',
  '',
  'Создай свою капсулу воспоминаний.',
].join('\n')

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
    body: JSON.stringify({
      chat_id: chatId,
      text: WELCOME_TEXT,
    }),
  })

  const tgJson = await tgRes.json().catch(() => null)

  if (!tgRes.ok || !tgJson?.ok) {
    throw new Error(tgJson?.description ?? 'Telegram sendMessage failed')
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok')

  if (req.method !== 'POST') {
    return json({ ok: true, info: 'telegram-webhook expects Telegram updates via POST' })
  }

  if (!BOT_TOKEN) {
    return json({ error: 'Bot token not configured' }, 500)
  }

  try {
    const update = await req.json()
    const message = update?.message ?? update?.edited_message
    const chatId = message?.chat?.id
    const text = typeof message?.text === 'string' ? message.text : ''

    if (!chatId || !isStartCommand(text)) {
      return json({ ok: true, ignored: true })
    }

    await sendWelcomeMessage(chatId)

    return json({ ok: true })
  } catch (error) {
    console.error('[telegram-webhook]', error)
    return json({ error: (error as Error).message }, 500)
  }
})
