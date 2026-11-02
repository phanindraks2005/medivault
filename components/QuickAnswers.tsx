'use client'

import { useState } from 'react'
import { Languages, Pill, Stethoscope } from 'lucide-react'
import { authHeaders } from '@/lib/supabase'

type MedicineResult = {
  name: string
  common_brands_india?: string[]
  uses: string
  typical_dosage: string
  side_effects?: string[]
  precautions?: string
  disclaimer?: string
}

type TriageResult = {
  urgency: 'mild' | 'moderate' | 'urgent'
  urgency_label: string
  general_guidance: string
  see_doctor_if: string
  disclaimer?: string
}

type NoteResult = {
  plain_explanation: string
  key_terms?: { term: string; meaning: string }[]
  should_be_concerned?: string
  disclaimer?: string
}

const tools = [
  { id: 'medicine', label: 'Look up a medicine', short: 'Medicine', icon: Pill },
  { id: 'symptoms', label: 'Check symptoms', short: 'Symptoms', icon: Stethoscope },
  { id: 'note', label: "Explain a doctor's note", short: 'Explain', icon: Languages },
] as const

type ToolId = (typeof tools)[number]['id']

const inputClass =
  'w-full px-3 rounded-[6px] border border-rule bg-paper text-[15px] text-ink placeholder:text-ink-3 focus:border-band focus:outline-none transition-colors'
const buttonClass =
  'h-11 px-4 rounded-[6px] bg-band text-band-ink font-semibold hover:bg-band-hover disabled:opacity-60 disabled:cursor-not-allowed transition-colors shrink-0'

const urgencyStyles: Record<TriageResult['urgency'], string> = {
  mild: 'bg-ok-soft text-ok-ink',
  moderate: 'bg-due-soft text-due-ink',
  urgent: 'bg-red-soft text-red-ink',
}

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export default function QuickAnswers() {
  const [active, setActive] = useState<ToolId>('medicine')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [medicineQuery, setMedicineQuery] = useState('')
  const [medicine, setMedicine] = useState<MedicineResult | null>(null)
  const [symptoms, setSymptoms] = useState('')
  const [triage, setTriage] = useState<TriageResult | null>(null)
  const [noteText, setNoteText] = useState('')
  const [note, setNote] = useState<NoteResult | null>(null)

  const run = async (task: () => Promise<void>) => {
    setLoading(true)
    setError('')
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const switchTo = (id: ToolId) => {
    if (loading) return
    setActive(id)
    setError('')
  }

  return (
    <section aria-labelledby="quick-answers" className="mt-10">
      <h2 id="quick-answers" className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink-2 mb-3">
        Quick answers
      </h2>

      <div role="tablist" aria-label="Quick answers" className="flex border-b border-rule">
        {tools.map((tool) => {
          const Icon = tool.icon
          const selected = active === tool.id
          return (
            <button
              key={tool.id}
              role="tab"
              id={`tab-${tool.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tool.id}`}
              onClick={() => switchTo(tool.id)}
              className={`flex items-center gap-2 px-3 md:px-4 h-11 -mb-px border-b-2 text-[15px] font-medium transition-colors ${
                selected ? 'border-band text-ink' : 'border-transparent text-ink-3 hover:text-ink'
              }`}
            >
              <Icon size={17} aria-hidden="true" />
              <span className="sm:hidden">{tool.short}</span>
              <span className="hidden sm:inline">{tool.label}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="pt-4">
        {active === 'medicine' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                setMedicine(null)
                setMedicine(await post<MedicineResult>('/api/medicine-lookup', { medicineName: medicineQuery }))
              })
            }}
            className="flex gap-2"
          >
            <label htmlFor="medicine-query" className="sr-only">Medicine name</label>
            <input
              id="medicine-query"
              placeholder="Brand or generic name, e.g. Dolo 650"
              value={medicineQuery}
              onChange={(e) => setMedicineQuery(e.target.value)}
              required
              className={`${inputClass} h-11`}
            />
            <button type="submit" disabled={loading} className={buttonClass}>
              {loading ? 'Looking up…' : 'Look up'}
            </button>
          </form>
        )}

        {active === 'symptoms' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                setTriage(null)
                setTriage(await post<TriageResult>('/api/symptom-triage', { symptoms }))
              })
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="symptoms" className="sr-only">Symptoms</label>
            <textarea
              id="symptoms"
              placeholder="What's wrong, since when, and how bad? e.g. sore throat for two days, no fever"
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              required
              rows={3}
              className={`${inputClass} py-2.5 resize-none`}
            />
            <button type="submit" disabled={loading} className={`${buttonClass} self-start`}>
              {loading ? 'Checking…' : 'Get guidance'}
            </button>
          </form>
        )}

        {active === 'note' && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              run(async () => {
                setNote(null)
                setNote(await post<NoteResult>('/api/jargon-translate', { text: noteText }))
              })
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="note-text" className="sr-only">Doctor&apos;s note or lab result</label>
            <textarea
              id="note-text"
              placeholder="Paste a doctor's note or lab result, e.g. HbA1c 7.8%, continue OHA"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              required
              rows={4}
              className={`${inputClass} py-2.5 resize-none`}
            />
            <button type="submit" disabled={loading} className={`${buttonClass} self-start`}>
              {loading ? 'Explaining…' : 'Explain in plain English'}
            </button>
          </form>
        )}

        {loading && <p className="mt-3 text-sm text-ink-3">This can take up to half a minute when the service is busy.</p>}
        {error && (
          <p role="alert" className="mt-3 px-3 py-2.5 rounded-[6px] bg-panel text-[15px] text-ink-2">
            {error}
          </p>
        )}

        {active === 'medicine' && medicine && !loading && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="text-[18px] font-semibold">{medicine.name}</p>
            {medicine.common_brands_india && medicine.common_brands_india.length > 0 && (
              <p className="text-sm text-ink-3">Sold as {medicine.common_brands_india.join(', ')}</p>
            )}
            <dl className="mt-3 grid gap-3 text-[15px] sm:grid-cols-[150px_1fr]">
              <dt className="text-ink-3">Used for</dt>
              <dd>{medicine.uses}</dd>
              <dt className="text-ink-3">Usual dose</dt>
              <dd>{medicine.typical_dosage}</dd>
              {medicine.side_effects && medicine.side_effects.length > 0 && (
                <>
                  <dt className="text-ink-3">Side effects</dt>
                  <dd>{medicine.side_effects.join(', ')}</dd>
                </>
              )}
              {medicine.precautions && (
                <>
                  <dt className="text-ink-3">Take care</dt>
                  <dd>{medicine.precautions}</dd>
                </>
              )}
            </dl>
            {medicine.disclaimer && <p className="mt-3 text-sm text-ink-3">{medicine.disclaimer}</p>}
          </div>
        )}

        {active === 'symptoms' && triage && !loading && (
          <div className="mt-4">
            <p className={`inline-block px-2.5 py-1 rounded-[4px] text-sm font-semibold ${urgencyStyles[triage.urgency] || urgencyStyles.mild}`}>
              {triage.urgency_label}
            </p>
            <p className="mt-3 text-[15px]">{triage.general_guidance}</p>
            <p className="mt-2 text-[15px]">
              <span className="font-semibold">See a doctor if </span>
              {triage.see_doctor_if.replace(/^./, (c) => c.toLowerCase())}
            </p>
            {triage.disclaimer && <p className="mt-3 text-sm text-ink-3">{triage.disclaimer}</p>}
          </div>
        )}

        {active === 'note' && note && !loading && (
          <div className="mt-4 border-t border-rule pt-4">
            <p className="text-[15px]">{note.plain_explanation}</p>
            {note.key_terms && note.key_terms.length > 0 && (
              <dl className="mt-4 grid gap-2 text-[15px] sm:grid-cols-[150px_1fr]">
                {note.key_terms.map((t) => (
                  <div key={t.term} className="contents">
                    <dt className="font-semibold">{t.term}</dt>
                    <dd className="text-ink-2">{t.meaning}</dd>
                  </div>
                ))}
              </dl>
            )}
            {note.should_be_concerned && (
              <p className="mt-4 px-3 py-2.5 rounded-[6px] bg-due-soft text-due-ink text-[15px]">{note.should_be_concerned}</p>
            )}
            {note.disclaimer && <p className="mt-3 text-sm text-ink-3">{note.disclaimer}</p>}
          </div>
        )}
      </div>
    </section>
  )
}
