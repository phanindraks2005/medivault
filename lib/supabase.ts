import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const OFFLINE_MESSAGE = "You're offline. Your changes are still here; save again when you're back online."

export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine
}

// The signed-in user's id for a save, or the message to show instead. Reads
// the stored session rather than asking the server, so being offline isn't
// mistaken for being logged out (RLS still checks the token on save).
export async function userForSave(): Promise<{ id: string; error?: undefined } | { id?: undefined; error: string }> {
  if (isOffline()) return { error: OFFLINE_MESSAGE }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { error: 'Your session has ended. Log in again.' }
  return { id: session.user.id }
}

// The message for a failed save: offline gets its own, anything else the fallback.
export function saveError(fallback: string) {
  return isOffline() ? OFFLINE_MESSAGE : fallback
}

// Headers for calls to our own API routes, which verify the access token.
export async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token}`,
  }
}
