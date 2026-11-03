// Fixed colours for family members. Red and marigold are left out on purpose:
// they mean "overdue" and "due soon" everywhere in the app.
const MEMBER_COLORS = ['#3b6fd8', '#8c4fbf', '#2e8540', '#0e7c9a', '#8b5e34', '#5b6b7f']

type MemberLike = { id: string; created_at?: string | null }

// Colour by position in the family, oldest member first, so a member keeps
// their colour on every screen and adding someone new never reshuffles it.
export function memberColors<T extends MemberLike>(members: T[]) {
  const ordered = [...members].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''))
  const map: Record<string, string> = {}
  ordered.forEach((m, i) => {
    map[m.id] = MEMBER_COLORS[i % MEMBER_COLORS.length]
  })
  return map
}

export function ageFrom(dob?: string | null) {
  if (!dob) return null
  const birth = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - birth.getFullYear()
  const beforeBirthday =
    now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())
  if (beforeBirthday) age--
  // A birth date in the future (saved before it was blocked) has no age to show.
  return age < 0 ? null : age
}

export function relationLabel(relation?: string | null) {
  if (!relation) return ''
  if (relation.toLowerCase() === 'self') return 'You'
  return relation.charAt(0).toUpperCase() + relation.slice(1)
}

export function allergyList(allergies?: string | null) {
  return (allergies || '')
    .split(',')
    .map((a) => a.trim())
    .filter(Boolean)
}
