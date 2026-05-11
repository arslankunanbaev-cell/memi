import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const BOT_TOKEN        = Deno.env.get('TELEGRAM_BOT_TOKEN') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const TG_API           = `https://api.telegram.org/bot${BOT_TOKEN}`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PRODUCTS: Record<string, { title: string; description: string; stars: number; payload: string }> = {
  premium: {
    title:       'Memi Premium',
    description: 'Premium badge, monthly album export, all card themes, 30 days',
    stars:       99,
    payload:     'premium',
  },
  theme_summer: {
    title:       'Summer theme',
    description: 'Warm summer tones for story cards, forever',
    stars:       79,
    payload:     'theme_summer',
  },
  theme_cinema: {
    title:       'Cinema theme',
    description: 'Cinematic style for story cards, forever',
    stars:       79,
    payload:     'theme_cinema',
  },
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS })
  }

  if (!BOT_TOKEN) return json({ error: 'Bot token not configured' }, 500)

  try {
    const { productId, telegramId } = await req.json()

    if (!productId || !telegramId) {
      return json({ error: 'productId and telegramId are required' }, 400)
    }

    const product = PRODUCTS[productId]
    if (!product) {
      return json({ error: `Unknown product: ${productId}` }, 400)
    }

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE)
    const { data: user } = await sb
      .from('users')
      .select('id')
      .eq('telegram_id', telegramId)
      .single()

    if (!user) {
      return json({ error: 'User not found' }, 404)
    }

    const tgRes = await fetch(`${TG_API}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title:          product.title,
        description:    product.description,
        payload:        product.payload,
        provider_token: '',
        currency:       'XTR',
        prices:         [{ label: product.title, amount: product.stars }],
      }),
    })

    const tgJson = await tgRes.json()
    if (!tgRes.ok || !tgJson.ok) {
      console.error('[create-stars-invoice] Telegram error:', tgJson)
      return json({ error: tgJson.description ?? 'Failed to create invoice' }, 500)
    }

    return json({ invoiceUrl: tgJson.result })

  } catch (err) {
    console.error('[create-stars-invoice]', err)
    return json({ error: (err as Error).message }, 500)
  }
})
