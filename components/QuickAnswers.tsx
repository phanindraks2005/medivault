'use client'

import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Languages, Loader2, Phone, Pill, Stethoscope } from 'lucide-react'
import { toast } from 'sonner'
import { authHeaders } from '@/lib/supabase'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { ease } from '@/lib/motion'

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
  see_doctor_if?: string | null
  disclaimer?: string | null
}

type NoteResult = {
  plain_explanation: string
  key_terms?: { term: string; meaning: string }[]
  should_be_concerned?: string
  disclaimer?: string
}

const TOOLS = [
  { id: 'medicine', label: 'Medicine', icon: Pill },
  { id: 'symptoms', label: 'Symptoms', icon: Stethoscope },
  { id: 'note', label: "Doctor's note", icon: Languages },
] as const

type ToolId = (typeof TOOLS)[number]['id']

const urgencyVariant = { mild: 'ok', moderate: 'due', urgent: 'overdue' } as const

async function post<T>(url: string, body: object): Promise<T> {
  const res = await fetch(url, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body) })
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export default function QuickAnswers({ demo = false }: { demo?: boolean }) {
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
    if (demo) {
      toast('Quick answers need an account', { description: 'Sign up free to ask about medicines, symptoms and doctors’ notes.' })
      return
    }
    setLoading(true)
    setError('')
    try {
      await task()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  const submitLabel = { medicine: 'Look up', symptoms: 'Get guidance', note: 'Explain it' }[active]
  const busyLabel = { medicine: 'Looking up…', symptoms: 'Checking…', note: 'Explaining…' }[active]

  return (
    <section aria-labelledby="quick-answers" className="flex flex-col gap-4 rounded-xl bg-canvas p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="quick-answers" className="text-[15px] font-semibold">Quick answers</h2>
          <p className="mt-0.5 text-[13px] text-ink-3">General information, not a diagnosis</p>
        </div>
        <Tabs className="max-w-full overflow-x-auto [scrollbar-width:none]" value={active} onValueChange={(v) => !loading && (setActive(v as ToolId), setError(''))}>
          <TabsList className="h-10 rounded-full bg-[#e6ebf1] p-1">
            {TOOLS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="h-8 rounded-full px-3 text-[14px] data-active:bg-surface data-active:shadow-[var(--shadow-card)]">
                <t.icon aria-hidden="true" /> {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={active}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease }}
            onSubmit={(e) => {
              e.preventDefault()
              if (active === 'medicine')
                run(async () => {
                  setMedicine(null)
                  setMedicine(await post<MedicineResult>('/api/medicine-lookup', { medicineName: medicineQuery }))
                })
              if (active === 'symptoms')
                run(async () => {
                  setTriage(null)
                  setTriage(await post<TriageResult>('/api/symptom-triage', { symptoms }))
                })
              if (active === 'note')
                run(async () => {
                  setNote(null)
                  setNote(await post<NoteResult>('/api/jargon-translate', { text: noteText }))
                })
            }}
            className={active === 'medicine' ? 'flex flex-col gap-2 sm:flex-row' : 'flex flex-col gap-2.5'}
          >
            {active === 'medicine' && (
              <>
                <Label htmlFor="qa-medicine" className="sr-only">Medicine name</Label>
                <Input
                  id="qa-medicine"
                  name="medicine"
                  autoComplete="off"
                  placeholder="Brand or generic name, e.g. Dolo 650…"
                  value={medicineQuery}
                  onChange={(e) => setMedicineQuery(e.target.value)}
                  required
                />
              </>
            )}
            {active === 'symptoms' && (
              <>
                <Label htmlFor="qa-symptoms" className="sr-only">Symptoms</Label>
                <Textarea
                  id="qa-symptoms"
                  name="symptoms"
                  placeholder="What's wrong, since when, how bad? e.g. sore throat for two days, no fever…"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  required
                  rows={3}
                />
              </>
            )}
            {active === 'note' && (
              <>
                <Label htmlFor="qa-note" className="sr-only">Doctor&apos;s note or lab result</Label>
                <Textarea
                  id="qa-note"
                  name="note"
                  placeholder="Paste a doctor's note or lab result, e.g. HbA1c 7.8%, continue OHA…"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                  rows={3}
                />
              </>
            )}
            <Button type="submit" disabled={loading} className={active === 'medicine' ? 'h-11 sm:w-auto' : 'h-11 self-start'}>
              {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
              {loading ? busyLabel : submitLabel}
            </Button>
          </motion.form>
        </AnimatePresence>

        <div aria-live="polite">
          {loading && <p className="mt-3 text-[13.5px] text-ink-3">This can take up to half a minute when the service is busy.</p>}
          {error && <p role="alert" className="mt-3 rounded-lg bg-surface px-4 py-3 text-ink-2 border border-line">{error}</p>}

          {active === 'medicine' && medicine && !loading && (
            <Result>
              <p className="text-[18px] font-semibold">{medicine.name}</p>
              {medicine.common_brands_india?.length ? <p className="text-[13.5px] text-ink-3">Sold as {medicine.common_brands_india.join(', ')}</p> : null}
              <dl className="mt-3 grid gap-x-6 gap-y-2.5 sm:grid-cols-[130px_1fr]">
                <dt className="text-ink-3">Used for</dt>
                <dd>{medicine.uses}</dd>
                <dt className="text-ink-3">Usual dose</dt>
                <dd>{medicine.typical_dosage}</dd>
                {medicine.side_effects?.length ? (
                  <>
                    <dt className="text-ink-3">Side effects</dt>
                    <dd>{medicine.side_effects.join(', ')}</dd>
                  </>
                ) : null}
                {medicine.precautions && (
                  <>
                    <dt className="text-ink-3">Take care</dt>
                    <dd>{medicine.precautions}</dd>
                  </>
                )}
              </dl>
              {medicine.disclaimer && <p className="mt-3 text-[13.5px] text-ink-3">{medicine.disclaimer}</p>}
            </Result>
          )}

          {active === 'symptoms' && triage && !loading && (
            <Result>
              <Badge variant={urgencyVariant[triage.urgency] || 'ok'} className="h-7 px-3 text-[13px]">
                {triage.urgency_label}
              </Badge>
              <p className="mt-3">{triage.general_guidance}</p>
              {triage.urgency === 'urgent' && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="tel:112" className={buttonVariants({ variant: 'destructive', size: 'sm' })}>
                    <Phone aria-hidden="true" /> Call 112 (emergency)
                  </a>
                  <a href="tel:108" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                    <Phone aria-hidden="true" /> Call 108 (ambulance)
                  </a>
                </div>
              )}
              {triage.see_doctor_if && (
                <p className="mt-2">
                  <span className="font-semibold">See a doctor if </span>
                  {triage.see_doctor_if.replace(/^./, (c) => c.toLowerCase())}
                </p>
              )}
              {triage.disclaimer && <p className="mt-3 text-[13.5px] text-ink-3">{triage.disclaimer}</p>}
            </Result>
          )}

          {active === 'note' && note && !loading && (
            <Result>
              <p>{note.plain_explanation}</p>
              {note.key_terms?.length ? (
                <dl className="mt-4 grid gap-x-6 gap-y-2 sm:grid-cols-[130px_1fr]">
                  {note.key_terms.map((t) => (
                    <div key={t.term} className="contents">
                      <dt className="font-semibold">{t.term}</dt>
                      <dd className="text-ink-2">{t.meaning}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {note.should_be_concerned && <p className="mt-4 rounded-lg bg-due-soft px-4 py-3 text-due-ink">{note.should_be_concerned}</p>}
              {note.disclaimer && <p className="mt-3 text-[13.5px] text-ink-3">{note.disclaimer}</p>}
            </Result>
          )}
        </div>
      </div>
    </section>
  )
}

function Result({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease }}
      className="mt-4 rounded-lg bg-surface p-4 border border-line md:p-5"
    >
      {children}
    </motion.div>
  )
}
