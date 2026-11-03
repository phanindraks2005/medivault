'use client'

import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, Loader2, ScanLine } from 'lucide-react'
import DashboardView from '@/components/dashboard/DashboardView'
import MemberAvatar from '@/components/app/MemberAvatar'
import { Badge } from '@/components/ui/badge'
import { ageFrom, allergyList, relationLabel } from '@/lib/family'
import { dayLeaf, dueLabel, daysFromToday, todayISO } from '@/lib/dates'
import { sampleColors, sampleMembers, sampleRecords, sampleVaccinations } from '@/lib/sample-family'
import { currentMedicines } from '@/lib/medicines'
import DateLeaf from '@/components/app/DateLeaf'
import EmergencyCardView from '@/components/app/EmergencyCardView'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useHydrated } from '@/lib/use-hydrated'


const RX = [
  { name: 'Amlodipine', dose: '5 mg', when: 'Morning', hand: 'Tab. Amlodipine 5mg  1–0–0' },
  { name: 'Metformin', dose: '500 mg', when: 'After meals, twice', hand: 'Tab. Metformin 500  1–0–1  p.c.' },
  { name: 'Atorvastatin', dose: '10 mg', when: 'At night', hand: 'Tab. Atorva 10  0–0–1' },
]

// The moment a photo of a prescription becomes a dated record: the page is
// scanned, each medicine is read out of the doctor's hand, and the next due
// date lands on the calendar. Plays twice, then rests on the finished record.
const ROUNDS = 2

export function PrescriptionScene({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const last = RX.length + 1
  const [step, setStep] = useState(reduce ? last : 0)
  const [round, setRound] = useState(1)

  useEffect(() => {
    if (reduce || (step === last && round >= ROUNDS)) return
    const delays = [1900, 700, 700, 900, 4600]
    const t = setTimeout(() => {
      if (step === last) setRound((r) => r + 1)
      setStep((s) => (s + 1) % (last + 1))
    }, delays[step] ?? 1000)
    return () => clearTimeout(t)
  }, [step, round, reduce, last])

  const reading = step === 0
  const hydrated = useHydrated()
  const leaf = dayLeaf(sampleVaccinations[1].next_due_date!)

  return (
    <div data-ui className={cn('relative mx-auto aspect-[5/6] w-full max-w-[520px]', className)}>
      {/* The paper prescription, as the doctor wrote it. */}
      <div className="absolute left-0 top-[2%] w-[60%] -rotate-[4deg] rounded-md bg-[#fffdf7] p-[5%] shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-2 border-b-2 border-band/70 pb-2">
          <div>
            <p className="text-[clamp(12px,1vw,14px)] font-semibold leading-tight text-band-deep">Dr. Anita Rao</p>
            <p className="text-[clamp(11px,0.8vw,12px)] text-ink-3">MBBS, MD · City Care Clinic</p>
          </div>
          <span className="font-display text-[clamp(18px,1.8vw,26px)] font-bold leading-none text-band-deep">℞</span>
        </div>
        <p className="mt-2 text-[clamp(11px,0.8vw,12px)] text-ink-3 num">Ramesh Sharma · 62 M</p>
        <ul className="mt-2 space-y-[6%] text-[clamp(11px,0.95vw,13.5px)] italic leading-snug text-[#24325a]">
          {RX.map((m) => (
            <li key={m.name} className="-rotate-[0.6deg]">{m.hand}</li>
          ))}
          <li className="pt-1 text-ink-3">Review after 1 month</li>
        </ul>
        <div className="mt-[10%] ml-auto h-4 w-20 rounded-full border-b-2 border-[#24325a]/60" aria-hidden="true" />
        <AnimatePresence>
          {reading && !reduce && (
            <motion.span
              key="scan"
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-transparent via-band-bright/30 to-band-bright/0"
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: [0, 260, 0], opacity: [0, 1, 1, 0] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.9, ease: 'easeInOut' }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* What MediVault read from it. */}
      <div className="absolute right-0 top-[26%] w-[72%] rounded-2xl sm:w-[66%] bg-surface p-[4.5%] shadow-[var(--shadow-float)]">
        <div className="flex items-center gap-3">
          <MemberAvatar name="Ramesh" color={sampleColors.ramesh} size={34} className="hidden lg:inline-grid" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">Prescription</p>
            <p className="truncate text-[13px] text-ink-3">Dr. Anita Rao · for Ramesh</p>
          </div>
          <AnimatePresence mode="wait" initial={false}>
            {reading ? (
              <motion.span key="r" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Badge variant="due" className="gap-1.5">
                  <Loader2 className="animate-spin" aria-hidden="true" /> Reading
                </Badge>
              </motion.span>
            ) : (
              <motion.span key="d" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <Badge variant="ok" className="gap-1">
                  <Check aria-hidden="true" /> Read
                </Badge>
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <ul className="mt-3.5 space-y-1.5">
          {RX.map((m, i) => (
            <li key={m.name} className="relative h-[46px] overflow-hidden rounded-lg bg-canvas">
              <AnimatePresence initial={false}>
                {step > i ? (
                  <motion.div
                    key="row"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="absolute inset-0 flex items-center justify-between gap-2 px-3"
                  >
                    <span className="truncate text-[14px]">
                      <span className="font-semibold">{m.name}</span> <span className="text-ink-2 num">{m.dose}</span>
                    </span>
                    <span className="shrink-0 text-[13px] text-ink-3">{m.when}</span>
                  </motion.div>
                ) : (
                  <motion.div key="wait" exit={{ opacity: 0 }} className="absolute inset-0 flex items-center gap-3 px-3">
                    <span className="h-2.5 w-24 animate-pulse rounded-full bg-line" />
                    <span className="ml-auto h-2.5 w-14 animate-pulse rounded-full bg-line" />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>
      </div>

      {/* The next date it put on the calendar. */}
      {hydrated && (
      <motion.div
        animate={{ opacity: step > RX.length ? 1 : 0.0, y: step > RX.length ? 0 : 12 }}
        transition={{ duration: 0.4, ease }}
        className="absolute bottom-[3%] left-[6%] flex w-[64%] items-center gap-3 rounded-2xl bg-surface p-3 shadow-[var(--shadow-lift)]"
      >
        <DateLeaf day={leaf.day} month={leaf.month} tone="due" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold leading-tight">Influenza vaccine</p>
          <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
            <span className="size-2 rounded-full" style={{ background: sampleColors.ramesh }} aria-hidden="true" /> Ramesh
          </p>
        </div>
        <Badge variant="due">{dueLabel(daysFromToday(sampleVaccinations[1].next_due_date!))}</Badge>
      </motion.div>
      )}
    </div>
  )
}

// The real dashboard with the sample family, scaled to whatever box holds it.
export function DashboardScene({ width = 940, className }: { width?: number; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [width])

  return (
    <div data-ui className={cn('overflow-hidden rounded-2xl bg-canvas shadow-[var(--shadow-float)]', className)}>
      <div className="flex h-8 items-center gap-1.5 bg-surface px-4 shadow-[0_1px_0_var(--line)]">
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="size-2.5 rounded-full bg-line-strong" />
        <span className="ml-3 text-[12px] text-ink-3">medivault · Today</span>
      </div>
      <div ref={box} className="relative w-full overflow-hidden" style={{ height: 700 * scale }}>
        <div inert aria-hidden="true" className="absolute left-0 top-0 origin-top-left px-8" style={{ width, transform: `scale(${scale})` }}>
          <DashboardView status="ready" members={sampleMembers} colors={sampleColors} vaccinations={sampleVaccinations} records={sampleRecords} demo preview />
        </div>
      </div>
    </div>
  )
}

function medicinesFor(id: string) {
  return currentMedicines(sampleRecords.filter((r) => r.family_member_id === id), todayISO()).map((m) => [m.name, m.dosage].filter(Boolean).join(' '))
}

const CONTACT: Record<string, string> = {
  arjun: 'Sunita (mother) · 98450 22130',
  ramesh: 'Arjun (son) · 98450 12345',
  sunita: 'Arjun (son) · 98450 12345',
  diya: 'Arjun (father) · 98450 12345',
}

export function FamilyScene({ className }: { className?: string }) {
  return (
    <div data-ui className={cn('w-full max-w-[460px] rounded-2xl bg-surface p-5 shadow-[var(--shadow-float)]', className)}>
      <div className="flex items-center justify-between">
        <p className="text-[17px] font-semibold">Family</p>
        <span className="text-[13px] text-ink-3 num">{sampleMembers.length} people</span>
      </div>
      <ul className="mt-3 space-y-1">
        {sampleMembers.map((m) => (
          <li key={m.id} className="flex items-start gap-3 rounded-lg px-2 py-2.5">
            <MemberAvatar name={m.name} color={sampleColors[m.id]} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-snug">{m.name}</p>
              <p className="text-[13px] text-ink-3 num">
                {relationLabel(m.relation)} · {ageFrom(m.dob)} yrs · {m.blood_group}
              </p>
              {allergyList(m.allergies).length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {allergyList(m.allergies).map((a) => (
                    <Badge key={a} variant="overdue">Allergic: {a}</Badge>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function EmergencyCard({ memberId, className }: { memberId: string; className?: string }) {
  const m = sampleMembers.find((x) => x.id === memberId) || sampleMembers[0]
  return (
    <div data-ui className={cn('w-full max-w-[340px]', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25, ease }}>
          <EmergencyCardView
            data={{
              name: m.name,
              color: sampleColors[m.id],
              age: ageFrom(m.dob),
              gender: m.gender,
              bloodGroup: m.blood_group,
              allergies: allergyList(m.allergies),
              medicines: medicinesFor(m.id),
              contact: CONTACT[m.id],
            }}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

const POLICY = `create policy "Own records only"
  on medical_records for select
  using (auth.uid() = user_id);

create policy "Own folder only"
  on storage.objects for select
  using (bucket_id = 'medical-records'
    and (storage.foldername(name))[1]
        = auth.uid()::text);`

export function PolicyScene({ className }: { className?: string }) {
  return (
    <div data-ui className={cn('w-full max-w-[520px] overflow-hidden rounded-2xl bg-navy shadow-[var(--shadow-float)]', className)}>
      <div className="flex items-center gap-2 px-5 py-3 text-[13px] text-white/60 shadow-[0_1px_0_rgb(255_255_255/0.08)]">
        <ScanLine className="size-4" aria-hidden="true" /> supabase/schema.sql
      </div>
      <pre className="overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] text-[#cfe3f5]">
        <code>{POLICY}</code>
      </pre>
      <div className="space-y-2 bg-navy-2 px-5 py-4 text-[13px]">
        <p className="flex items-center justify-between gap-3 text-white/85">
          <span>Another account asks for your records</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white num">0 rows</span>
        </p>
        <p className="flex items-center justify-between gap-3 text-white/85">
          <span>A request without a login</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold text-white num">401</span>
        </p>
      </div>
    </div>
  )
}
