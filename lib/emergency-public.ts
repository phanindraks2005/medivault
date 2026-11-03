import { after } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { DEMO_CARD_TOKEN, TOKEN_PATTERN, hashCardToken, isExpired } from '@/lib/emergency-link'
import { currentMedicines, todayIn } from '@/lib/medicines'
import { ageFrom, allergyList } from '@/lib/family'
import { sampleMembers, sampleRecords } from '@/lib/sample-family'
import { memberExtras } from '@/lib/demo/db'

// What the public card page may show, and nothing else from the account.
export type PublicCard = {
  name: string
  age: number | null
  bloodGroup: string | null
  allergies: string[]
  conditions: string[]
  medicines: string[]
  contactName: string | null
  contactPhone: string | null
  sample?: boolean
}

const KEEP_OPENS = 20

type Member = {
  name: string
  dob: string | null
  blood_group: string | null
  allergies: string | null
  known_conditions: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

function toCard(m: Member, records: Parameters<typeof currentMedicines>[0]): PublicCard {
  return {
    name: m.name,
    age: ageFrom(m.dob),
    bloodGroup: m.blood_group,
    allergies: allergyList(m.allergies),
    conditions: allergyList(m.known_conditions),
    medicines: currentMedicines(records, todayIn('Asia/Kolkata')).map((x) => [x.name, x.dosage].filter(Boolean).join(' ')),
    contactName: m.emergency_contact_name,
    contactPhone: m.emergency_contact_phone,
  }
}

// The demo's QR codes open /e/demo-<member>: a sample card, never a real one.
function sampleCard(token: string): PublicCard | null {
  const id = token.slice(DEMO_CARD_TOKEN.length + 1)
  const m = sampleMembers.find((x) => x.id === id)
  if (!token.startsWith(`${DEMO_CARD_TOKEN}-`) || !m) return null
  const extra = memberExtras[m.id] as { emergency_contact_name?: string; emergency_contact_phone?: string }
  const card = toCard(
    { ...m, emergency_contact_name: extra?.emergency_contact_name ?? null, emergency_contact_phone: extra?.emergency_contact_phone ?? null },
    sampleRecords.filter((r) => r.family_member_id === m.id)
  )
  return { ...card, sample: true }
}

// Finds the live link for a token by its hash and returns only that member's
// emergency fields. Unknown, revoked and expired links all come back as null,
// so the page can't be used to tell them apart.
export async function publicCard(token: string): Promise<PublicCard | null> {
  if (token.startsWith(`${DEMO_CARD_TOKEN}-`)) return sampleCard(token)
  if (!TOKEN_PATTERN.test(token)) return null

  const { data: link, error } = await supabaseAdmin
    .from('emergency_links')
    .select('id, user_id, family_member_id, expires_at')
    .eq('token_hash', await hashCardToken(token))
    .is('revoked_at', null)
    .maybeSingle()
  if (error) throw error
  if (!link || isExpired(link)) return null

  const [m, r] = await Promise.all([
    supabaseAdmin
      .from('family_members')
      .select('name, dob, blood_group, allergies, known_conditions, emergency_contact_name, emergency_contact_phone')
      .eq('id', link.family_member_id)
      .eq('user_id', link.user_id)
      .maybeSingle(),
    supabaseAdmin
      .from('medical_records')
      .select('id, record_date, created_at, extracted_data')
      .eq('family_member_id', link.family_member_id)
      .eq('user_id', link.user_id),
  ])
  if (m.error || r.error) throw m.error || r.error
  if (!m.data) return null

  // After the response: note the time it was opened (nothing else) and keep the latest few.
  after(async () => {
    await supabaseAdmin.from('emergency_link_opens').insert({ link_id: link.id, user_id: link.user_id })
    const { data: old } = await supabaseAdmin
      .from('emergency_link_opens')
      .select('id')
      .eq('link_id', link.id)
      .order('opened_at', { ascending: false })
      .range(KEEP_OPENS, KEEP_OPENS + 100)
    if (old?.length) await supabaseAdmin.from('emergency_link_opens').delete().in('id', old.map((o) => o.id))
  })

  return toCard(m.data, r.data || [])
}
