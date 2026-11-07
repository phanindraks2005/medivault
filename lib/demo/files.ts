import { demoFiles, demoTables } from '@/lib/demo/db'
import { formatDay } from '@/lib/dates'

type Med = { name: string; dosage?: string | null; frequency?: string | null }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// The sample family's "original files": a prescription drawn from the record
// itself, so its date and medicines always match what the screen shows.
function prescriptionSvg(r: Record<string, unknown>, patient: string) {
  const x = (r.extracted_data || {}) as { medicines?: Med[]; notes?: string | null }
  const meds = x.medicines || []
  const lines = meds
    .map((m, i) => {
      const y = 300 + i * 64
      return `<text x="64" y="${y}" font-size="22" font-weight="600">${i + 1}. ${esc(m.name)} ${esc(m.dosage || '')}</text>
<text x="92" y="${y + 28}" font-size="18" fill="#425466">${esc(m.frequency || '')}</text>`
    })
    .join('')
  const notesY = 320 + meds.length * 64
  const note = x.notes ? `<text x="64" y="${notesY}" font-size="17" fill="#425466">${esc(x.notes.slice(0, 80))}</text>` : ''
  const date = r.record_date ? formatDay(String(r.record_date)) : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000" font-family="Georgia, serif" fill="#0d253d">
<rect width="800" height="1000" fill="#fffdf8"/>
<rect x="0" y="0" width="800" height="12" fill="#0b6b60"/>
<text x="64" y="96" font-size="34" font-weight="700">${esc(String(r.hospital_name || 'Clinic'))}</text>
<text x="64" y="134" font-size="20" fill="#425466">${esc(String(r.doctor_name || ''))}, MBBS MD</text>
<line x1="64" y1="164" x2="736" y2="164" stroke="#c1ccd8"/>
<text x="64" y="206" font-size="19">Patient: ${esc(patient)}</text>
<text x="736" y="206" font-size="19" text-anchor="end">Date: ${esc(date)}</text>
<text x="64" y="262" font-size="40" font-style="italic" font-weight="700">Rx</text>
${lines}${note}
<text x="736" y="930" font-size="18" text-anchor="end" fill="#425466">Sample prescription · MediVault demo</text>
</svg>`
}

export function demoFileUrl(path: string) {
  const uploaded = demoFiles.get(path)
  if (uploaded) return uploaded
  const t = demoTables()
  const record = t.medical_records.find((r) => r.file_url === path)
  if (!record) return null
  const member = t.family_members.find((m) => m.id === record.family_member_id)
  // A blob link, not a data: URL: browsers refuse to open data: URLs in a new tab, so "Open" did nothing.
  return URL.createObjectURL(new Blob([prescriptionSvg(record, String(member?.name || ''))], { type: 'image/svg+xml' }))
}
