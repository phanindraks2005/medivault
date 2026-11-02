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

    const userId = user.id
    const { messages } = await req.json()

    if (!messages) {
      return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
    }

    // Gather full family + records context
    const { data: members } = await supabaseAdmin
      .from('family_members')
      .select('*')
      .eq('user_id', userId)

    const { data: records } = await supabaseAdmin
      .from('medical_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    const contextBlock = (members || []).map((m) => {
      const memberRecords = (records || []).filter((r) => r.family_member_id === m.id)
      const recordSummaries = memberRecords.map((r) => {
        const meds = r.extracted_data?.medicines?.map((med: any) => `${med.name} (${med.dosage || 'dosage unknown'}, ${med.frequency || 'frequency unknown'})`).join('; ') || 'none extracted'
        return `  - [${r.record_type}] ${new Date(r.created_at).toLocaleDateString()} · Doctor: ${r.doctor_name || 'unknown'} · Hospital: ${r.hospital_name || 'unknown'} · Medicines: ${meds}${r.extracted_data?.notes ? ` · Notes: ${r.extracted_data.notes}` : ''}`
      }).join('\n')

      return `${m.name} (${m.relation}, ${m.gender || 'gender unknown'}, blood group ${m.blood_group || 'unknown'}${m.dob ? `, DOB ${m.dob}` : ''})${m.allergies ? `\n  Allergies: ${m.allergies}` : ''}${m.known_conditions ? `\n  Known conditions: ${m.known_conditions}` : ''}\n  Records:\n${recordSummaries || '  (none)'}`
    }).join('\n\n')

    const systemPrompt = `You are "Doc", a friendly and knowledgeable AI health copilot inside the MediVault app. You have access to the user's family health records below. Use this information to answer questions accurately and specifically — mention names, medicines, doctors, and dates when relevant.

You can:
- Answer questions about what medicines someone is taking, when, prescribed by whom
- Give general health guidance and quick remedies for common issues
- Help someone understand their prescriptions or medical records
- Flag if a question involves multiple family members' medicines (e.g. interaction concerns) — but always recommend confirming with a doctor/pharmacist for anything serious

You must NOT:
- Diagnose specific conditions
- Prescribe or recommend specific medicine dosages beyond what's already in their records
- Make definitive medical claims — always suggest professional consultation for anything beyond general guidance

Keep responses conversational, warm, and concise — this is a chat, not a report. Use the family's actual data when relevant instead of generic answers.

FAMILY HEALTH DATA:
${contextBlock || 'No family members or records added yet.'}`

    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-latest',
      systemInstruction: systemPrompt,
    })

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    const responseText = result.response.text()

    return NextResponse.json({ reply: responseText })
  } catch (err: any) {
    console.error('Doc chat error:', err)
    return NextResponse.json({ error: err.message || 'Chat failed' }, { status: 500 })
  }
}