import { NextRequest, NextResponse } from 'next/server'
import { generate, aiError } from '@/lib/gemini'
import { supabaseAdmin, getUserFromRequest } from '@/lib/supabase-admin'
import type { Medicine } from '@/components/dashboard/types'

export async function POST(req: NextRequest) {
  try {
    const user = await getUserFromRequest(req)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = user.id
    const { messages, today: clientToday } = await req.json()

    // "Today" is the visitor's date, since the server may be in another time zone.
    const today = typeof clientToday === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(clientToday) ? clientToday : new Date().toISOString().slice(0, 10)
    const daysUntil = (date: string) => Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000)

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

    const { data: vaccinations } = await supabaseAdmin
      .from('vaccinations')
      .select('family_member_id, vaccine_name, date_given, next_due_date, notes')
      .eq('user_id', userId)

    const vaccineLine = (v: { vaccine_name: string; date_given: string | null; next_due_date: string | null; notes: string | null }) => {
      let due = ''
      if (v.next_due_date) {
        const days = daysUntil(v.next_due_date)
        due = days < 0 ? ` · next dose was due ${v.next_due_date} (OVERDUE by ${-days} days)` : ` · next dose due ${v.next_due_date} (in ${days} days)`
      }
      return `  - ${v.vaccine_name}${v.date_given ? ` · given ${v.date_given}` : ''}${due}${v.notes ? ` · ${v.notes}` : ''}`
    }

    const contextBlock = (members || []).map((m) => {
      const memberRecords = (records || []).filter((r) => r.family_member_id === m.id)
      const recordSummaries = memberRecords.map((r) => {
        const meds = r.extracted_data?.medicines?.map((med: Medicine) => `${med.name} (${med.dosage || 'dosage unknown'}, ${med.frequency || 'frequency unknown'})`).join('; ') || 'none extracted'
        return `  - [${r.record_type}] ${r.record_date || `uploaded ${new Date(r.created_at).toLocaleDateString('en-IN')}`} · Doctor: ${r.doctor_name || 'unknown'} · Hospital: ${r.hospital_name || 'unknown'} · Medicines: ${meds}${r.extracted_data?.notes ? ` · Notes: ${r.extracted_data.notes}` : ''}`
      }).join('\n')
      const memberVaccines = (vaccinations || []).filter((v) => v.family_member_id === m.id).map(vaccineLine).join('\n')

      return `${m.name} (${m.relation}, ${m.gender || 'gender unknown'}, blood group ${m.blood_group || 'unknown'}${m.dob ? `, DOB ${m.dob}` : ''})${m.allergies ? `\n  Allergies: ${m.allergies}` : ''}${m.known_conditions ? `\n  Known conditions: ${m.known_conditions}` : ''}\n  Records:\n${recordSummaries || '  (none)'}\n  Vaccinations:\n${memberVaccines || '  (none)'}`
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

Today's date is ${today}. When asked what is due, list overdue doses first, then upcoming ones by date.

FAMILY HEALTH DATA:
${contextBlock || 'No family members or records added yet.'}`

    const history = messages.slice(0, -1).map((m: { role: string; content: string }) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const lastMessage = messages[messages.length - 1]

    const result = await generate(
      (model) => model.startChat({ history }).sendMessage(lastMessage.content),
      { systemInstruction: systemPrompt }
    )
    const responseText = result.response.text()

    return NextResponse.json({ reply: responseText })
  } catch (err) {
    console.error('Doc chat error:', err)
    const { message, status } = aiError(err, "Doc couldn't answer that. Please try again.")
    return NextResponse.json({ error: message }, { status })
  }
}