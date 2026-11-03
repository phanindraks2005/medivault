import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { BadReply, parseReply, interactionShape } from '@/lib/ai-shape'
import { getUserFromRequest } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { medicines } = await req.json()

    if (!medicines || !Array.isArray(medicines) || medicines.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 medicines to check' }, { status: 400 })
    }

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

    const result = await generate((model) => model.generateContent(prompt))
    const parsed = parseReply(result.response.text())
    const data = interactionShape(parsed)
    if (!data) throw new BadReply('Missing fields')

    return NextResponse.json(data)
  } catch (err) {
    console.error('Interaction check error:', err)
    const { message, status } = aiError(err, "Couldn't check interactions. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}