// Reading normally finishes within a minute. Past this, a record still without
// details almost certainly had its request lost, so screens offer a retry
// instead of "Reading…" forever.
export const STUCK_AFTER_MS = 2 * 60 * 1000

export type ReadState = 'reading' | 'stuck' | 'failed' | 'read'

export function readState(record: { created_at: string; extracted_data?: { error?: string } | null }): ReadState {
  if (record.extracted_data) return record.extracted_data.error ? 'failed' : 'read'
  return Date.now() - new Date(record.created_at).getTime() > STUCK_AFTER_MS ? 'stuck' : 'reading'
}
