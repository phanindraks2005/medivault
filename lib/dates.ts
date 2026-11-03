const DAY_MS = 24 * 60 * 60 * 1000

// Dates from Postgres `date` columns come as YYYY-MM-DD. Parsing them with
// new Date() treats them as UTC midnight, which shows the previous day in
// timezones west of UTC, so build them as local dates instead.
export function parseDay(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function daysFromToday(value: string) {
  return Math.round((parseDay(value).getTime() - startOfToday().getTime()) / DAY_MS)
}

export function dayLeaf(value: string) {
  const d = parseDay(value)
  return {
    day: String(d.getDate()).padStart(2, '0'),
    month: d.toLocaleString('en-IN', { month: 'short' }).toUpperCase(),
  }
}

export function formatDay(value: string) {
  return parseDay(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function dueLabel(days: number) {
  if (days < 0) return `Overdue ${-days} ${-days === 1 ? 'day' : 'days'}`
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  return `In ${days} days`
}

// Today as YYYY-MM-DD in the visitor's time zone, for date inputs' max and checks.
export function todayISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
