import { useAppStore } from '../store/useAppStore'
import { assertSupabase } from './supabase'

function normalizeMetadata(metadata) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return {}
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined),
  )
}

export async function trackEvent(eventName, metadata) {
  try {
    if (!eventName) return

    const currentUserId = useAppStore.getState().currentUser?.id
    if (!currentUserId) return

    const sb = assertSupabase()

    await sb.from('events').insert({
      user_id: currentUserId,
      event_name: eventName,
      metadata: normalizeMetadata(metadata),
    })
  } catch {
    // Analytics must never affect the app flow.
  }
}
