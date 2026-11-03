import { NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

export { LIMITS } from '@/lib/limits'

// Gemini's free tier is shared by every account, so each account gets a daily
// allowance. The count lives in the user's app_metadata, which only the
// service role can write, so no extra table is needed.
export const DAILY_AI_LIMIT = 30

// Days run on Indian time, so the allowance resets at midnight for the people using it.
function todayInIndia() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
}

type Usage = { date: string; count: number }

// Counts one request against today's allowance. Returns a 429 response when
// the allowance is used up, or null to go ahead.
export async function spendAiQuota(user: User) {
  const today = todayInIndia()
  const usage = user.app_metadata?.ai_usage as Usage | undefined
  const count = usage?.date === today ? usage.count : 0
  if (count >= DAILY_AI_LIMIT) {
    return NextResponse.json(
      { error: `You've used today's ${DAILY_AI_LIMIT} AI requests. They reset at midnight.` },
      { status: 429 }
    )
  }
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    app_metadata: { ...user.app_metadata, ai_usage: { date: today, count: count + 1 } },
  })
  return null
}

export function badInput(message: string) {
  return NextResponse.json({ error: message }, { status: 400 })
}

// A non-empty string no longer than max, trimmed; otherwise null.
export function text(v: unknown, max: number) {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t && t.length <= max ? t : null
}
