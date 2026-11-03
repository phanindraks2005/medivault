import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { BadReply, parseReply, summaryShape } from '@/lib/ai-shape'
import { getUserFromRequest } from '@/lib/supabase-admin'
import type { Medicine } from '@/components/dashboard/types'

type SummaryRecord = {
  record_type?: string | null
  date?: string
  doctor?: string | null
  hospital?: string | null
  medicines?: Medicine[]
  notes?: string | null
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { memberName, records } = await req.json()

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records to summarize' }, { status: 400 })
    }

    const recordsText = (records as SummaryRecord[]).map((r, i) => {
      const meds = r.medicines?.map((m) => `${m.name} (${m.dosage || 'dosage unknown'}, ${m.frequency || 'frequency unknown'})`).join(', ') || 'none listed'
      return `${i + 1}. [${r.record_type}] ${r.date} — Doctor: ${r.doctor || 'unknown'}, Hospital: ${r.hospital || 'unknown'}, Medicines: ${meds}${r.notes ? `, Notes: ${r.notes}` : ''}`
    }).join('\n')

    const prompt = `You are summarizing the medical visit history for ${memberName} based on their records below, in chronological order (most recent first):

${recordsText}

Write a warm, clear summary of their recent health journey. Return ONLY valid JSON, no markdown, no preamble:

{
  "overview": "2-3 sentence summary of the overall pattern - what's been going on recently",
  "timeline": [
    { "date": "date from record", "summary": "1 sentence plain-language summary of this specific visit/record" }
  ],
  "key_takeaway": "1-2 sentences on the most important thing to know or watch for",
  "disclaimer": "This is a summary of your records, not medical advice. Always consult your doctor for guidance."
}`

    const result = await generate((model) => model.generateContent(prompt))
    const parsed = parseReply(result.response.text())
    const data = summaryShape(parsed)
    if (!data) throw new BadReply('Missing fields')

    return NextResponse.json(data)
  } catch (err) {
    console.error('Visit summary error:', err)
    const { message, status } = aiError(err, "Couldn't create a summary. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}