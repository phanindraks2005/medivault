import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { BadReply, parseReply, interactionShape } from '@/lib/ai-shape'
import { getUserFromRequest } from '@/lib/supabase-admin'
import { LIMITS, badInput, spendAiQuota, text } from '@/lib/ai-guard'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const list: unknown[] = Array.isArray(body.medicines) ? body.medicines : []
    const medicines = list.map((m) => text(m, LIMITS.medicineName))
    if (medicines.length < 2 || medicines.length > LIMITS.medicines || medicines.some((m) => !m)) {
      return badInput(`Check between 2 and ${LIMITS.medicines} medicines, each up to ${LIMITS.medicineName} characters.`)
    }

    const limited = await spendAiQuota(user)
    if (limited) return limited

    const prompt = `You are a cautious medication safety assistant. Check the following list of medicines for potential interactions with each other:

${medicines.map((m, i) => `${i + 1}. ${m}`).join('\n')}

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