import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { recordId } = await req.json()

    if (!recordId) {
      return NextResponse.json({ error: 'Missing recordId' }, { status: 400 })
    }

    // Look the record up by owner too, and use its stored path rather than
    // one supplied by the client.
    const { data: record } = await supabaseAdmin
      .from('medical_records')
      .select('file_url, doctor_name')
      .eq('id', recordId)
      .eq('user_id', user.id)
      .single()

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('medical-records')
      .download(record.file_url)

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
    const { error: updateError } = await supabaseAdmin
      .from('medical_records')
      .update({
        extracted_data: extracted,
        doctor_name: record.doctor_name || extracted.doctor_name || null,
        record_date: extracted.record_date || null,
      })
      .eq('id', recordId)
      .eq('user_id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, extracted })
  } catch (err: any) {
    console.error('OCR extraction error:', err)
    return NextResponse.json({ error: err.message || 'Extraction failed' }, { status: 500 })
  }
}