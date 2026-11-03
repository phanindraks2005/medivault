import { sampleMembers, sampleRecords, sampleVaccinations } from '@/lib/sample-family'

// The demo's database: the sample family as rows, held in memory for this
// tab. Writes change these rows and are gone on reload; nothing is sent anywhere.

type Row = Record<string, unknown>

export const DEMO_USER_ID = '00000000-0000-4000-8000-00000000d3e0'
export const DEMO_EMAIL = 'arjun@example.com'

// Fields the landing page's sample doesn't need but the full screens show.
const memberExtras: Record<string, Row> = {
  arjun: { height_cm: 176, weight_kg: 72, emergency_contact_name: 'Priya Sharma', emergency_contact_phone: '98450 12345' },
  ramesh: { height_cm: 168, weight_kg: 76.4, emergency_contact_name: 'Arjun Sharma', emergency_contact_phone: '98450 67890' },
  sunita: { height_cm: 158, weight_kg: 61, emergency_contact_name: 'Arjun Sharma', emergency_contact_phone: '98450 67890' },
  diya: { height_cm: 96, weight_kg: 14.2, emergency_contact_name: 'Arjun Sharma', emergency_contact_phone: '98450 67890' },
}

const recordNotes: Record<string, string> = {
  r1: 'Low-salt diet, walk 30 minutes daily. Review in 4 weeks with HbA1c.',
  r2: 'TSH 5.8 mIU/L, mildly raised. Continue thyroxine, repeat TSH in 6 weeks.',
  r3: 'Viral fever. Plenty of fluids. Return if fever lasts beyond 3 days.',
  r4: 'Seasonal allergic rhinitis. Avoid dust; steam inhalation at night.',
}

const vaccineNotes: Record<string, string> = {
  v1: 'Last given at City Care Clinic',
  v2: 'Annual flu shot',
  v3: 'Little Steps Paediatrics',
}

// Kept in sessionStorage too, so a reload keeps the visitor's changes. Entering
// /demo again starts from a fresh copy; leaving the demo throws it away.
export const DB_KEY = 'medivault-demo-db'
let tables: Record<string, Row[]> | null = null

function build(): Record<string, Row[]> {
  return {
    family_members: sampleMembers.map((m) => ({ ...m, user_id: DEMO_USER_ID, ...memberExtras[m.id] })),
    medical_records: sampleRecords.map((r) => ({
      ...r,
      user_id: DEMO_USER_ID,
      file_url: `${DEMO_USER_ID}/sample-${r.id}.svg`,
      extracted_data: { ...r.extracted_data, doctor_name: r.doctor_name, record_date: r.record_date, notes: recordNotes[r.id] || null },
    })),
    vaccinations: sampleVaccinations.map((v) => ({ ...v, user_id: DEMO_USER_ID, notes: vaccineNotes[v.id] || null, created_at: new Date().toISOString() })),
    chat_history: [],
  }
}

export function demoTables() {
  if (!tables) {
    try {
      const saved = sessionStorage.getItem(DB_KEY)
      tables = saved ? JSON.parse(saved) : build()
    } catch {
      tables = build()
    }
  }
  return tables!
}

export function saveDemo() {
  try {
    sessionStorage.setItem(DB_KEY, JSON.stringify(demoTables()))
  } catch {
    // Full or blocked: changes still last until the next reload.
  }
}

export function resetDemo() {
  tables = null
  try {
    sessionStorage.removeItem(DB_KEY)
  } catch {}
}

// Files "uploaded" in the demo, kept as object URLs in this tab.
export const demoFiles = new Map<string, string>()

const children: Record<string, string[]> = { family_members: ['medical_records', 'vaccinations'] }

// Deleting a member takes their records and vaccinations with them, as the
// real foreign keys do.
export function cascadeDelete(table: string, removed: Row[]) {
  const t = demoTables()
  for (const child of children[table] || []) {
    const ids = new Set(removed.map((r) => r.id))
    t[child] = t[child].filter((r) => !ids.has(r.family_member_id))
  }
}
