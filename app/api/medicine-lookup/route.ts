import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { getUserFromRequest } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { medicineName } = await req.json()

    if (!medicineName) {
      return NextResponse.json({ error: 'Missing medicine name' }, { status: 400 })
    }

    const prompt = `You are a medicine information assistant for an Indian audience. Give info about the medicine "${medicineName}". Return ONLY valid JSON, no markdown, no preamble:

{
  "name": "official/common name",
  "common_brands_india": ["brand1", "brand2"],
  "uses": "short plain-language description of what it's used for",
  "typical_dosage": "general dosage info as a string, with a note to follow doctor's advice",
  "side_effects": ["side effect 1", "side effect 2"],
  "precautions": "short string of key warnings",
  "disclaimer": "This is general information only. Always consult a doctor or pharmacist before taking any medicine."
}

If "${medicineName}" is not a recognizable medicine, return {"error": "Medicine not found. Please check the spelling or try another name."}`

    const result = await generate((model) => model.generateContent(prompt))
    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const data = JSON.parse(cleaned)

    return NextResponse.json(data)
  } catch (err) {
    console.error('Medicine lookup error:', err)
    const { message, status } = aiError(err, "Couldn't look that up. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}