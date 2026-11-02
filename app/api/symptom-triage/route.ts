import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { getUserFromRequest } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symptoms } = await req.json()

    if (!symptoms) {
      return NextResponse.json({ error: 'Missing symptoms' }, { status: 400 })
    }

    const prompt = `You are a cautious health guidance assistant, NOT a doctor. A user describes these symptoms: "${symptoms}"

Your job is ONLY to give general guidance and an urgency level — NEVER diagnose a specific condition or prescribe medicine. Always err on the side of caution.

Return ONLY valid JSON, no markdown, no preamble:

{
  "urgency": "mild" | "moderate" | "urgent",
  "urgency_label": "short human-readable label, e.g. 'Monitor at home' / 'See a doctor soon' / 'Seek care now'",
  "general_guidance": "2-3 sentences of general, safe self-care advice (rest, hydration, when to worry) — no specific medicine names or dosages",
  "see_doctor_if": "short string describing red-flag signs that mean they should see a doctor immediately",
  "disclaimer": "This is general guidance only, not a medical diagnosis. Please consult a doctor for proper evaluation."
}`

    const result = await generate((model) => model.generateContent(prompt))
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json(data)
  } catch (err) {
    console.error('Symptom triage error:', err)
    const { message, status } = aiError(err, "Couldn't check your symptoms. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}