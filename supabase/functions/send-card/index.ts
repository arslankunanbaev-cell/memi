import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { decode } from 'https://deno.land/std@0.168.0/encoding/base64.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const TG_API = `https://api.telegram.org/bot${BOT_TOKEN}`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!BOT_TOKEN) {
    return new Response(JSON.stringify({ error: 'Bot token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }

  try {
    const { imageBase64, chatId, caption } = await req.json()

    if (!imageBase64 || !chatId) {
      return new Response(JSON.stringify({ error: 'Missing imageBase64 or chatId' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    // Убираем data:image/jpeg;base64, префикс
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    // Декодируем base64 в бинарник через стандартную библиотеку Deno
    const binaryData = decode(base64Data)

    const formData = new FormData()
    formData.append('chat_id', chatId.toString())
    formData.append('photo', new Blob([binaryData], { type: 'image/jpeg' }), 'memi-moment.jpg')
    if (caption) formData.append('caption', caption)

    const tgRes = await fetch(`${TG_API}/sendPhoto`, { method: 'POST', body: formData })
    const tgJson = await tgRes.json()

    console.log('[send-card] Telegram response:', JSON.stringify(tgJson))

    if (!tgJson.ok) {
      return new Response(JSON.stringify({ error: tgJson.description }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', ...CORS },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  } catch (e) {
    console.error('[send-card] error:', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...CORS },
    })
  }
})
