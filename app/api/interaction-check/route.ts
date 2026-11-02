import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { medicines } = await req.json()

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 medicines to check' }, { status: 400 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const prompt = `You are a cautious medication safety assistant. Check the following list of medicines for potential interactions with each other:

${medicines.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}

Return ONLY valid JSON, no markdown, no preamble:

{
  "overall_risk": "none" | "minor" | "moderate" | "major",
  "summary": "1-2 sentence plain-language summary of the overall finding",
  "interactions": [
    {
      "medicines": ["Medicine A", "Medicine B"],
      "severity": "minor" | "moderate" | "major",
      "description": "plain-language explanation of the interaction risk"
    }
  ],
  "disclaimer": "This is general information only, not medical advice. Always confirm with a doctor or pharmacist before combining medications."
}

If no significant interactions are found, return an empty interactions array and overall_risk "none".`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('Interaction check error:', err)
    return NextResponse.json({ error: err.message || 'Check failed' }, { status: 500 })
  }
}