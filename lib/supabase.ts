import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isDemo } from '@/lib/demo/mode'
import { demoFetch, demoUser } from '@/lib/demo/fetch'
import { demoFileUrl } from '@/lib/demo/files'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const real = createClient(supabaseUrl, supabaseAnonKey)

// The demo's client: same API, but its fetch is the in-memory sample family and
// its session is a fixed sample user, so no request reaches Supabase.
let demoClient: SupabaseClient | null = null
function demo() {
  if (!demoClient) {
    const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
    const expires = Math.floor(Date.now() / 1000) + 365 * 24 * 3600
    const session = JSON.stringify({
      access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: demoUser.id, role: 'authenticated', exp: expires })}.demo`,
      refresh_token: 'demo',
      token_type: 'bearer',
      expires_in: 365 * 24 * 3600,
      expires_at: expires,
      user: demoUser,
    })
    demoClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { fetch: demoFetch },
      auth: {
        storageKey: 'medivault-demo-auth',
        storage: { getItem: () => session, setItem: () => {}, removeItem: () => {} },
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }
  return demoClient
}

// Every screen imports this one client; in a demo tab it quietly becomes the demo's.
export const supabase: SupabaseClient = new Proxy(real, {
  get(target, prop) {
    const client = isDemo() ? demo() : target
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? value.bind(client) : value
  },
})

// A link to an uploaded file: a short-lived signed URL, or the demo's local copy.
export async function fileUrl(path: string, seconds: number) {
  if (isDemo()) return demoFileUrl(path)
  const { data } = await real.storage.from('medical-records').createSignedUrl(path, seconds)
  return data?.signedUrl || null
}

export const OFFLINE_MESSAGE = "You're offline. Your changes are still here; save again when you're back online."

// The demo never needs the network, so it never counts as offline.
export function isOffline() {
  return typeof navigator !== 'undefined' && !navigator.onLine && !isDemo()
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
