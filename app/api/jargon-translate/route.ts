import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { BadReply, parseReply, noteShape } from '@/lib/ai-shape'
import { getUserFromRequest } from '@/lib/supabase-admin'
import { LIMITS, badInput, spendAiQuota, text } from '@/lib/ai-guard'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const note = text(body.text, LIMITS.note)
    if (!note) return badInput(`Paste a note of up to ${LIMITS.note} characters.`)

    const limited = await spendAiQuota(user)
    if (limited) return limited

    const prompt = `You are a medical translator that explains confusing doctor's notes, lab reports, or medical jargon in plain, simple language for a non-medical person. Here's the text:

"${note}"

Return ONLY valid JSON, no markdown, no preamble:

{
  "plain_explanation": "2-4 sentences explaining what this means in everyday language, as if talking to a friend",
  "key_terms": [
    { "term": "medical term found in the text", "meaning": "simple one-line explanation" }
  ],
  "should_be_concerned": "brief note on whether this seems routine/normal or worth discussing with a doctor soon - stay cautious, don't diagnose",
  "disclaimer": "This is a plain-language explanation only, not medical advice. Always discuss your results with your doctor."
}`

    const result = await generate((model) => model.generateContent(prompt))
    const parsed = parseReply(result.response.text())
    const data = noteShape(parsed)
    if (!data) throw new BadReply('Missing fields')

    return NextResponse.json(data)
  } catch (err) {
    console.error('Jargon translate error:', err)
    const { message, status } = aiError(err, "Couldn't translate that. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}