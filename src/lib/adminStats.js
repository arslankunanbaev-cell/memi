import { supabase } from './supabase'

export async function getAdminStats() {
  const url = import.meta.env.VITE_SUPABASE_URL ?? ''
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ''

  if (!url || !anonKey) {
    throw new Error('Supabase is not configured')
  }

  const { data: sessionData } = supabase
    ? await supabase.auth.getSession()
    : { data: { session: null } }

  const token = sessionData?.session?.access_token

  if (!token) {
    throw new Error('Открой статистику из Telegram Mini App после загрузки профиля')
  }

  const response = await fetch(`${url}/functions/v1/admin-stats`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
    },
  })

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(body?.error ?? `Admin stats failed with ${response.status}`)
  }

  return body
}
