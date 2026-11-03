// Gemini usually returns the JSON we ask for, but not always. These turn a
// parsed reply into the exact shape each screen renders, or null when the
// parts a screen depends on are missing, so a bad reply becomes an error
// message instead of a crash.

type Obj = Record<string, unknown>

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : [])
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]) => (allowed.includes(v as T) ? (v as T) : null)

export class BadReply extends Error {}

// Strips code fences and parses; throws BadReply on anything that isn't JSON.
export function parseReply(text: string): unknown {
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch {
    throw new BadReply('Reply was not JSON')
  }
}

export const badReplyMessage = 'The answer came back incomplete. Please try again.'

export function medicineShape(v: unknown) {
  if (!isObj(v)) return null
  const name = str(v.name)
  const uses = str(v.uses)
  if (!name || !uses) return null
  return {
    name,
    common_brands_india: strList(v.common_brands_india),
    uses,
    typical_dosage: str(v.typical_dosage) || 'Follow your doctor’s advice.',
    side_effects: strList(v.side_effects),
    precautions: str(v.precautions),
    disclaimer: str(v.disclaimer),
  }
}

export function triageShape(v: unknown) {
  if (!isObj(v)) return null
  const urgency = oneOf(v.urgency, ['mild', 'moderate', 'urgent'] as const)
  const guidance = str(v.general_guidance)
  if (!urgency || !guidance) return null
  const labels = { mild: 'Monitor at home', moderate: 'See a doctor soon', urgent: 'Seek care now' }
  return {
    urgency,
    urgency_label: str(v.urgency_label) || labels[urgency],
    general_guidance: guidance,
    see_doctor_if: str(v.see_doctor_if),
    disclaimer: str(v.disclaimer),
  }
}

export function noteShape(v: unknown) {
  if (!isObj(v)) return null
  const plain = str(v.plain_explanation)
  if (!plain) return null
  const terms = Array.isArray(v.key_terms) ? v.key_terms : []
  return {
    plain_explanation: plain,
    key_terms: terms
      .filter(isObj)
      .map((t) => ({ term: str(t.term), meaning: str(t.meaning) }))
      .filter((t): t is { term: string; meaning: string } => !!t.term && !!t.meaning),
    should_be_concerned: str(v.should_be_concerned),
    disclaimer: str(v.disclaimer),
  }
}

const SEVERITIES = ['none', 'minor', 'moderate', 'major'] as const

export function interactionShape(v: unknown) {
  if (!isObj(v)) return null
  const overall = oneOf(v.overall_risk, SEVERITIES)
  const summary = str(v.summary)
  if (!overall || !summary) return null
  const list = Array.isArray(v.interactions) ? v.interactions : []
  return {
    overall_risk: overall,
    summary,
    interactions: list.filter(isObj).flatMap((it) => {
      const severity = oneOf(it.severity, ['minor', 'moderate', 'major'] as const)
      const medicines = strList(it.medicines)
      const description = str(it.description)
      return severity && medicines.length && description ? [{ medicines, severity, description }] : []
    }),
    disclaimer: str(v.disclaimer),
  }
}

export function summaryShape(v: unknown) {
  if (!isObj(v)) return null
  const overview = str(v.overview)
  if (!overview) return null
  const timeline = Array.isArray(v.timeline) ? v.timeline : []
  return {
    overview,
    timeline: timeline
      .filter(isObj)
      .map((t) => ({ date: str(t.date), summary: str(t.summary) }))
      .filter((t): t is { date: string; summary: string } => !!t.date && !!t.summary),
    key_takeaway: str(v.key_takeaway),
    disclaimer: str(v.disclaimer),
  }
}

// Extraction: keeps whatever is usable; a reply with nothing usable is a failure.
export function extractionShape(v: unknown) {
  if (!isObj(v)) return null
  if (str(v.error)) return { error: 'not a medical document' as const }
  const meds = Array.isArray(v.medicines) ? v.medicines : []
  const date = str(v.record_date)
  return {
    doctor_name: str(v.doctor_name),
    record_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null,
    medicines: meds
      .filter(isObj)
      .map((m) => ({ name: str(m.name), dosage: str(m.dosage), frequency: str(m.frequency) }))
      .filter((m): m is { name: string; dosage: string | null; frequency: string | null } => !!m.name),
    notes: str(v.notes),
  }
}
