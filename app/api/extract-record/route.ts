import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@supabase/supabase-js'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Server-side client with service role key (bypasses RLS, safe since this only runs on server)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { recordId, filePath } = await req.json()

    if (!recordId || !filePath) {
      return NextResponse.json({ error: 'Missing recordId or filePath' }, { status: 400 })
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('medical-records')
      .download(filePath)

    if (downloadError || !fileData) {
      return NextResponse.json({ error: 'Failed to download file' }, { status: 500 })
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = fileData.type || 'image/jpeg'

    // Send to Gemini for extraction
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const prompt = `You are analyzing a medical prescription or lab report image. Extract the following information and return ONLY valid JSON, no markdown, no preamble:

{
  "doctor_name": "string or null",
  "record_date": "YYYY-MM-DD or null",
  "medicines": [
    { "name": "string", "dosage": "string or null", "frequency": "string or null" }
  ],
  "notes": "any other relevant info as a short string, or null"
}

If this doesn't look like a prescription or medical report, return {"error": "not a medical document"}.`

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64, mimeType } },
    ])

    const responseText = result.response.text()
    const cleaned = responseText.replace(/```json|```/g, '').trim()
    const extracted = JSON.parse(cleaned)

    // Save extracted data back to the record
    const { data: existingRecord } = await supabaseAdmin
  .from('medical_records')
  .select('doctor_name')
  .eq('id', recordId)
  .single()

const { error: updateError } = await supabaseAdmin
  .from('medical_records')
  .update({
    extracted_data: extracted,
    doctor_name: existingRecord?.doctor_name || extracted.doctor_name || null,
    record_date: extracted.record_date || null,
  })
  .eq('id', recordId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, extracted })
  } catch (err: any) {
    console.error('OCR extraction error:', err)
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}