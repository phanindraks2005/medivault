import { NextRequest, NextResponse } from 'next/server'
import { getModel, withRetry, aiError } from '@/lib/gemini'
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin'

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
      .select('file_url, doctor_name, extracted_data')
      .eq('id', recordId)
      .eq('user_id', user.id)
      .single()

    if (!record) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 })
    }

    // Without a marker the record page would say "Still processing" forever.
    // Only set it when there's nothing good to lose, so a failed retry doesn't
    // wipe details that were already extracted.
    const markFailed = async () => {
      if (record.extracted_data && !record.extracted_data.error) return
      await supabaseAdmin
        .from('medical_records')
        .update({ extracted_data: { error: 'extraction_failed' } })
        .eq('id', recordId)
        .eq('user_id', user.id)
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('medical-records')
      .download(record.file_url)

    if (downloadError || !fileData) {
      await markFailed()
      return NextResponse.json({ error: "Couldn't open this file. Please try again." }, { status: 500 })
    }

    // Convert file to base64
    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = fileData.type || 'image/jpeg'

    // Send to Gemini for extraction
    const model = getModel()

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

    let extracted
    try {
      const result = await withRetry(() => model.generateContent([
        prompt,
        { inlineData: { data: base64, mimeType } },
      ]))

      const responseText = result.response.text()
      const cleaned = responseText.replace(/```json|```/g, '').trim()
      extracted = JSON.parse(cleaned)
    } catch (err) {
      console.error('OCR extraction error:', err)
      await markFailed()
      const { message, status } = aiError(err, "Couldn't read this file. Please try again.")
      return NextResponse.json({ error: message }, { status })
    }

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
      console.error('Saving extracted data failed:', updateError)
      return NextResponse.json({ error: "Couldn't save the details. Please try again." }, { status: 500 })
    }

    return NextResponse.json({ success: true, extracted })
  } catch (err) {
    console.error('OCR extraction error:', err)
    return NextResponse.json({ error: "Couldn't read this file. Please try again." }, { status: 500 })
  }
}