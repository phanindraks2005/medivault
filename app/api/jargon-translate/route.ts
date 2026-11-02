import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text || !text.trim()) {
      return NextResponse.json({ error: 'Missing text to translate' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const prompt = `You are a medical translator that explains confusing doctor's notes, lab reports, or medical jargon in plain, simple language for a non-medical person. Here's the text:

"${text}"

Return ONLY valid JSON, no markdown, no preamble:

{
  "plain_explanation": "2-4 sentences explaining what this means in everyday language, as if talking to a friend",
  "key_terms": [
    { "term": "medical term found in the text", "meaning": "simple one-line explanation" }
  ],
  "should_be_concerned": "brief note on whether this seems routine/normal or worth discussing with a doctor soon - stay cautious, don't diagnose",
  "disclaimer": "This is a plain-language explanation only, not medical advice. Always discuss your results with your doctor."
}`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Jargon translate error:', err)
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 })
  }
}