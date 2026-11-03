import type { Medicine } from '@/components/dashboard/types'

// When a medicine stops being "current". A course read from the prescription
// ("5 days", "1 month") ends that long after the doctor's date; "continue" or
// a tick on Ongoing keeps it current; the user can set the end date by hand.
// Anything without a length stays current, flagged so someone checks it.
// Pure functions on YYYY-MM-DD strings, so the server and the browser agree.

export type MedicineState = 'ongoing' | 'until' | 'ended' | 'unsure'

const UNIT_DAYS: Record<string, number> = { d: 1, w: 7, m: 30, y: 365 }
const WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, fifteen: 15, thirty: 30 }

const ONGOING = /\b(continue[ds]?|ongoing|long[- ]?term|life[- ]?long|for life|indefinite(ly)?|(till|until) further (advice|orders?|notice))\b/i
const LENGTH = new RegExp(String.raw`\b(\d+(?:\.\d+)?|${Object.keys(WORDS).join('|')})\s*(days?|d|weeks?|wks?|w|months?|mths?|mo|years?|yrs?|y)\b`, 'i')
// Doctors' shorthand: 5/7 is five days, 2/52 two weeks, 3/12 three months.
const SLASH = /\b(\d{1,2})\s*\/\s*(7|52|12)\b/

// "5 days" → 5, "1 month" → 30, "continue" → 'ongoing', no length → null.
export function parseDuration(text?: string | null): number | 'ongoing' | null {
  if (!text) return null
  if (ONGOING.test(text)) return 'ongoing'
  const slash = text.match(SLASH)
  if (slash) return Number(slash[1]) * { '7': 1, '52': 7, '12': 30 }[slash[2] as '7' | '52' | '12']
  const m = text.match(LENGTH)
  if (!m) return null
  const n = WORDS[m[1].toLowerCase()] ?? Number(m[1])
  const unit = m[2].toLowerCase().startsWith('mo') || m[2].toLowerCase().startsWith('mth') ? 'm' : m[2][0].toLowerCase()
  const days = Math.round(n * UNIT_DAYS[unit])
  return days > 0 ? days : null
}

export function addDays(day: string, n: number) {
  const [y, m, d] = day.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10)
}

// Today in a time zone, as YYYY-MM-DD. The public card uses India time.
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}

// The end date worked out from the course length: the last day of the course.
// Duration first; OCR often puts "for 5 days" in the timing instead.
export function derivedEnd(med: Medicine, start: string): string | 'ongoing' | null {
  const length = parseDuration(med.duration) ?? parseDuration(med.frequency)
  if (length === 'ongoing') return 'ongoing'
  return length ? addDays(start, length - 1) : null
}

// An end_date key, even null, means the user decided; only without one is it worked out.
export function medicineStatus(med: Medicine, start: string, today: string): { state: MedicineState; end: string | null } {
  if (med.ongoing) return { state: 'ongoing', end: null }
  const end = med.end_date !== undefined ? med.end_date : derivedEnd(med, start)
  if (end === 'ongoing') return { state: 'ongoing', end: null }
  if (!end) return { state: 'unsure', end: null }
  return { state: end >= today ? 'until' : 'ended', end }
}

type RecordLike = { id: string; record_date: string | null; created_at: string; extracted_data: { error?: string; medicines?: Medicine[] } | null }

export type ListedMedicine = Medicine & { state: MedicineState; end: string | null; date: string; recordId: string }

// Each medicine once, from the newest record that lists it (a newer
// prescription replaces an older one), split into current and ended.
export function medicinesByStatus(records: RecordLike[], today: string) {
  const newest = [...records].sort((a, b) => (b.record_date || b.created_at).localeCompare(a.record_date || a.created_at))
  const seen = new Set<string>()
  const current: ListedMedicine[] = []
  const ended: ListedMedicine[] = []
  for (const r of newest) {
    if (r.extracted_data?.error) continue
    const start = (r.record_date || r.created_at).slice(0, 10)
    for (const med of r.extracted_data?.medicines || []) {
      const key = med?.name?.trim().toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      const status = medicineStatus(med, start, today)
      ;(status.state === 'ended' ? ended : current).push({ ...med, ...status, date: start, recordId: r.id })
    }
  }
  return { current, ended }
}

export const currentMedicines = (records: RecordLike[], today: string) => medicinesByStatus(records, today).current

// Plain-language status for lists: "Ongoing", "Until 12 Nov 2026", "Ended 3 Nov 2026".
export function statusLabel(m: { state: MedicineState; end: string | null }, format: (day: string) => string) {
  if (m.state === 'ongoing') return 'Ongoing'
  if (m.state === 'until') return `Until ${format(m.end!)}`
  if (m.state === 'ended') return `Ended ${format(m.end!)}`
  return 'No end date'
}
