import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { memberName, records } = await req.json()

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'No records to summarize' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const recordsText = records.map((r: any, i: number) => {
      const meds = r.medicines?.map((m: any) => `${m.name} (${m.dosage || 'dosage unknown'}, ${m.frequency || 'frequency unknown'})`).join(', ') || 'none listed'
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

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Visit summary error:', err)
    return NextResponse.json({ error: err.message || 'Summary failed' }, { status: 500 })
  }
}