// Tokens for public emergency card links (the QR code). A token is 32 random
// bytes in base64url: 256 bits, so it can't be guessed. Only its SHA-256 hash
// goes to the database; the token itself lives in the link and on the device
// that made it. Works in the browser and on the server (Web Crypto in both).

// Links always point at the live site so a printed QR keeps working.
// NEXT_PUBLIC_CARD_LINK_BASE overrides it for testing, e.g. a phone on the same Wi-Fi as `npm run dev`.
export const CARD_LINK_BASE = (process.env.NEXT_PUBLIC_CARD_LINK_BASE || 'https://medivault-ks.vercel.app').replace(/\/+$/, '')

// The demo's links all open the same sample card.
export const DEMO_CARD_TOKEN = 'demo'

export const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export const cardLink = (token: string) => `${CARD_LINK_BASE}/e/${token}`

export function newCardToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function hashCardToken(token: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// An expiry date picked in the app means "until the end of that day" in India.
export const expiryFromDay = (day: string) => `${day}T23:59:59+05:30`
export const dayFromExpiry = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(iso))

export type EmergencyLink = {
  id: string
  family_member_id: string
  token_hash: string
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

export const isExpired = (link: Pick<EmergencyLink, 'expires_at'>, now = Date.now()) => !!link.expires_at && Date.parse(link.expires_at) <= now
