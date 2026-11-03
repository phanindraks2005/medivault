import { demoTables, saveDemo } from '@/lib/demo/db'
import { formatDay, todayISO } from '@/lib/dates'

// Sample answers for the AI tools in the demo. They are worked out from the
// sample family's own data where that makes sense (Doc, visit summary,
// extraction), and from small fixed tables otherwise. No AI is called.

type Row = Record<string, unknown>
type Med = { name: string; dosage?: string | null; frequency?: string | null }

const SAMPLE = 'Sample answer in the demo. Sign up to ask about anything.'
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

const medicines: Record<string, object> = {
  paracetamol: {
    name: 'Paracetamol 650 mg (Dolo 650)',
    common_brands_india: ['Dolo 650', 'Calpol 650', 'Crocin 650'],
    uses: 'Fever and mild to moderate pain such as headache, body ache and toothache.',
    typical_dosage: 'Adults: one tablet every 4 to 6 hours if needed, no more than 4 tablets a day. Follow your doctor’s advice.',
    side_effects: ['Nausea', 'Rash (rare)', 'Liver damage in overdose'],
    precautions: 'Don’t combine with other paracetamol products. Avoid alcohol. Ask a doctor first if you have liver disease.',
  },
  metformin: {
    name: 'Metformin',
    common_brands_india: ['Glycomet', 'Gluformin', 'Obimet'],
    uses: 'Lowers blood sugar in type 2 diabetes.',
    typical_dosage: 'Usually 500 mg once or twice a day with meals, increased slowly. Follow your doctor’s advice.',
    side_effects: ['Upset stomach', 'Diarrhoea', 'Metallic taste'],
    precautions: 'Take with food. Tell the doctor before scans with contrast dye or surgery.',
  },
  amlodipine: {
    name: 'Amlodipine',
    common_brands_india: ['Amlong', 'Stamlo', 'Amlip'],
    uses: 'High blood pressure and some kinds of chest pain (angina).',
    typical_dosage: 'Usually 5 mg once a day. Follow your doctor’s advice.',
    side_effects: ['Ankle swelling', 'Flushing', 'Headache'],
    precautions: 'Stand up slowly at first. Don’t stop suddenly without asking your doctor.',
  },
  cetirizine: {
    name: 'Cetirizine',
    common_brands_india: ['Okacet', 'Cetzine', 'Alerid'],
    uses: 'Allergies: sneezing, runny nose, itchy eyes and hives.',
    typical_dosage: 'Adults: 10 mg once a day, usually at night. Follow your doctor’s advice.',
    side_effects: ['Drowsiness', 'Dry mouth'],
    precautions: 'Can make you sleepy; take care when driving.',
  },
  levothyroxine: {
    name: 'Levothyroxine',
    common_brands_india: ['Thyronorm', 'Eltroxin', 'Thyrox'],
    uses: 'Replaces thyroid hormone when the thyroid is underactive (hypothyroidism).',
    typical_dosage: 'Once a day on an empty stomach, 30 to 60 minutes before breakfast. The dose depends on blood tests.',
    side_effects: ['Palpitations or sweating if the dose is too high'],
    precautions: 'Keep 4 hours apart from calcium or iron tablets.',
  },
}
const aliases: Record<string, string> = { dolo: 'paracetamol', crocin: 'paracetamol', calpol: 'paracetamol', glycomet: 'metformin', thyronorm: 'levothyroxine', okacet: 'cetirizine' }

function lookup(name: string) {
  const q = name.toLowerCase()
  const key = Object.keys(medicines).find((k) => q.includes(k)) || Object.entries(aliases).find(([a]) => q.includes(a))?.[1]
  if (!key) return { error: 'The demo knows Dolo 650, Metformin, Amlodipine, Cetirizine and Levothyroxine. Sign up to look up any medicine.' }
  return { ...medicines[key], disclaimer: SAMPLE }
}

function triage(symptoms: string) {
  const s = symptoms.toLowerCase()
  if (/chest|breath|faint|unconscious|stroke|seizure|bleeding/.test(s)) {
    return {
      urgency: 'urgent',
      urgency_label: 'Seek care now',
      general_guidance: 'These can be signs of an emergency. Call 112 or 108 for an ambulance now, stop any activity and stay with someone until help arrives.',
      see_doctor_if: 'right away, without waiting to see if it passes.',
      disclaimer: SAMPLE,
    }
  }
  if (/fever|vomit|days|week|rash|pain/.test(s)) {
    return {
      urgency: 'moderate',
      urgency_label: 'See a doctor soon',
      general_guidance: 'Rest, drink plenty of fluids and keep track of your temperature. Book a visit if it isn’t easing in a day or two.',
      see_doctor_if: 'a fever lasts more than 3 days, you can’t keep fluids down, or you feel much worse.',
      disclaimer: SAMPLE,
    }
  }
  return {
    urgency: 'mild',
    urgency_label: 'Monitor at home',
    general_guidance: 'Rest, stay hydrated and see how it goes over the next day.',
    see_doctor_if: 'it gets worse, new symptoms appear, or it lasts more than a few days.',
    disclaimer: SAMPLE,
  }
}

const glossary: Record<string, string> = {
  hba1c: 'Average blood sugar over the last 2 to 3 months',
  fbs: 'Fasting blood sugar, measured after not eating overnight',
  tsh: 'Thyroid stimulating hormone; high usually means an underactive thyroid',
  oha: 'Oral hypoglycaemic agents: diabetes tablets',
  od: 'Once a day',
  bd: 'Twice a day',
  tds: 'Three times a day',
  hs: 'At bedtime',
  sos: 'Only when needed',
}

function explain(text: string) {
  const words = new Set(text.toLowerCase().match(/[a-z0-9]+/g) || [])
  const key_terms = Object.entries(glossary)
    .filter(([term]) => words.has(term))
    .map(([term, meaning]) => ({ term: term.toUpperCase(), meaning }))
  return {
    plain_explanation: key_terms.length
      ? 'This note uses common short forms that doctors write. The terms below say what each one means; together they describe the test results and how often to take each medicine.'
      : 'This is a sample explanation. The demo recognises common short forms such as HbA1c, FBS, TSH, OD, BD and SOS.',
    key_terms,
    should_be_concerned: 'If anything here is new to you, ask your doctor at the next visit.',
    disclaimer: SAMPLE,
  }
}

const pairs: [string, string, 'minor' | 'moderate' | 'major', string][] = [
  ['clarithromycin', 'atorvastatin', 'major', 'Clarithromycin raises atorvastatin levels and the risk of muscle damage.'],
  ['clarithromycin', 'amlodipine', 'major', 'Clarithromycin raises amlodipine levels, which can drop blood pressure too far.'],
  ['amlodipine', 'atorvastatin', 'minor', 'Amlodipine slightly raises atorvastatin levels; usually fine at these doses.'],
  ['ibuprofen', 'amlodipine', 'moderate', 'Regular ibuprofen can raise blood pressure and blunt amlodipine.'],
  ['levothyroxine', 'calcium', 'moderate', 'Calcium stops levothyroxine being absorbed; take them 4 hours apart.'],
]

function interactions(list: string[]) {
  const names = list.map((m) => m.toLowerCase())
  const found = pairs
    .filter(([a, b]) => names.some((n) => n.includes(a)) && names.some((n) => n.includes(b)))
    .map(([a, b, severity, description]) => ({ medicines: [a, b].map((x) => x[0].toUpperCase() + x.slice(1)), severity, description }))
  const order = ['none', 'minor', 'moderate', 'major']
  const overall = found.reduce((w, f) => (order.indexOf(f.severity) > order.indexOf(w) ? f.severity : w), 'none')
  return {
    overall_risk: overall,
    summary: found.length ? `${found.length} known ${found.length === 1 ? 'interaction' : 'interactions'} between these medicines.` : 'No known interactions between these medicines.',
    interactions: found,
    disclaimer: `${SAMPLE} The demo knows a few common pairs; try adding Clarithromycin for Ramesh.`,
  }
}

function summary(memberName: string, records: { date?: string; doctor?: string; medicines?: Med[] }[]) {
  return {
    overview: `${memberName} has ${records.length} read ${records.length === 1 ? 'record' : 'records'}. The latest is from ${records[0]?.date || 'recently'}${records[0]?.doctor ? ` with ${records[0].doctor}` : ''}.`,
    timeline: records.map((r) => ({ date: r.date || '', summary: `${r.doctor || 'A doctor'} prescribed ${(r.medicines || []).map((m) => m.name).join(', ') || 'no medicines'}.` })),
    key_takeaway: 'Bring the current medicine list to the next appointment and mention anything that has changed.',
    disclaimer: SAMPLE,
  }
}

// Doc: answers the suggested questions from the sample data, politely declines the rest.
function doc(question: string) {
  const t = demoTables()
  const q = question.toLowerCase()
  const members = t.family_members
  const first = (id: unknown) => String(members.find((m) => m.id === id)?.name || '').split(' ')[0]
  if (q.includes('vaccin')) {
    const today = todayISO()
    const due = t.vaccinations.filter((v) => v.next_due_date).sort((a, b) => String(a.next_due_date).localeCompare(String(b.next_due_date)))
    const lines = due.map((v) => `- **${first(v.family_member_id)}**: ${v.vaccine_name}, ${String(v.next_due_date) < today ? '**overdue** since' : 'due'} ${formatDay(String(v.next_due_date))}`)
    return `Here's what's coming up, overdue first:\n\n${lines.join('\n')}\n\nThe overdue one is worth booking this week.`
  }
  if (q.includes('allerg')) {
    const lines = members.filter((m) => m.allergies).map((m) => `- **${first(m.id)}** is allergic to ${m.allergies}`)
    return `${lines.join('\n')}\n\nThese show in red on everyone's emergency card. Mention them before any new prescription.`
  }
  const who = members.find((m) => q.includes(String(m.name).split(' ')[0].toLowerCase())) || members.find((m) => m.relation === 'self')
  if (who && (q.includes('taking') || q.includes('medicine') || q.includes('prescription') || q.includes('summar'))) {
    const recs = t.medical_records.filter((r) => r.family_member_id === who.id).sort((a, b) => String(b.record_date).localeCompare(String(a.record_date)))
    const latest = recs[0] as Row | undefined
    const meds = ((latest?.extracted_data as { medicines?: Med[] } | undefined)?.medicines || []).map((m) => `- ${m.name} ${m.dosage || ''}, ${m.frequency || ''}`)
    if (!latest) return `${first(who.id)} has no records yet.`
    return `${first(who.id)}'s latest prescription is from ${latest.doctor_name} (${latest.hospital_name}) on ${formatDay(String(latest.record_date))}:\n\n${meds.join('\n')}\n\nCheck with the doctor before changing any of these.`
  }
  return `In the demo I can answer the suggested questions: what someone is taking, allergies, a latest prescription, and vaccinations due. Sign up and I'll answer anything about your own family's records.`
}

// Reads a demo upload: the sample prescription, saved to the record like real extraction would.
function extract(recordId: string) {
  const record = demoTables().medical_records.find((r) => r.id === recordId)
  if (!record) return { error: 'Record not found' }
  const data = {
    doctor_name: 'Dr. Meera Iyer',
    record_date: todayISO(),
    medicines: [
      { name: 'Azithromycin', dosage: '250 mg', frequency: 'Once daily for 3 days' },
      { name: 'Paracetamol', dosage: '650 mg', frequency: 'If fever, up to 3 times a day' },
    ],
    notes: 'Sample reading in the demo. With an account, MediVault reads your real file.',
  }
  Object.assign(record, { extracted_data: data, doctor_name: record.doctor_name || data.doctor_name, record_date: data.record_date })
  saveDemo()
  return { success: true, extracted: data }
}

export async function demoAnswer(path: string, body: Record<string, unknown>): Promise<object> {
  await pause(700 + Math.random() * 600)
  switch (path) {
    case 'medicine-lookup':
      return lookup(String(body.medicineName || ''))
    case 'symptom-triage':
      return triage(String(body.symptoms || ''))
    case 'jargon-translate':
      return explain(String(body.text || ''))
    case 'interaction-check':
      return interactions((body.medicines as string[]) || [])
    case 'visit-summary':
      return summary(String(body.memberName || 'This family member'), (body.records as []) || [])
    case 'doc-chat': {
      const messages = (body.messages as { content: string }[]) || []
      return { reply: doc(messages[messages.length - 1]?.content || '') }
    }
    case 'extract-record':
      return extract(String(body.recordId || ''))
    default:
      return { error: 'Not available in the demo.' }
  }
}
