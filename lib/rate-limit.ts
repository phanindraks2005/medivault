// A sliding-window limit kept in this server instance's memory. On Vercel each
// instance keeps its own count, so it slows down scraping and floods rather
// than counting exactly; the card tokens themselves are unguessable.
const hits = new Map<string, number[]>()
let lastSweep = 0

export function rateLimited(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  if (now - lastSweep > windowMs) {
    lastSweep = now
    for (const [k, times] of hits) if (times[times.length - 1] <= now - windowMs) hits.delete(k)
  }
  const recent = (hits.get(key) || []).filter((t) => t > now - windowMs)
  if (recent.length >= limit) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  return false
}
