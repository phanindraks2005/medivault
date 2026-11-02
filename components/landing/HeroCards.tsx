'use client'

import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Check, FileText, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import MemberAvatar from '@/components/app/MemberAvatar'
import { ease } from '@/lib/motion'

const MEDICINES = [
  { name: 'Amlodipine', dose: '5 mg', when: 'Morning' },
  { name: 'Metformin', dose: '500 mg', when: 'After meals, twice' },
  { name: 'Atorvastatin', dose: '10 mg', when: 'At night' },
]

// Plays the moment a prescription photo turns into a record: reading, then
// each medicine appearing, then a pause before it starts again.
export default function HeroCards() {
  const reduce = useReducedMotion()
  const [step, setStep] = useState(reduce ? MEDICINES.length + 1 : 0)

  useEffect(() => {
    if (reduce) return
    const delays = [1600, 650, 650, 650, 5200]
    const t = setTimeout(() => setStep((s) => (s + 1) % (MEDICINES.length + 2)), delays[step] ?? 1000)
    return () => clearTimeout(t)
  }, [step, reduce])

  const reading = step === 0

  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:mx-0">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.15 }}
        className="relative z-10 rounded-2xl bg-surface p-5 shadow-[var(--shadow-float)] ring-1 ring-black/5"
      >
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-band-soft text-band">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold leading-tight">Prescription from Dr. Anita Rao</p>
            <p className="text-[13.5px] text-ink-3">City Care Clinic · for Ramesh</p>
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

        <ul className="mt-4 space-y-2" aria-label="Medicines read from the prescription">
          {MEDICINES.map((m, i) => {
            const shown = step > i
            return (
              <li key={m.name} className="relative h-[52px] overflow-hidden rounded-xl bg-canvas">
                <AnimatePresence initial={false}>
                  {shown ? (
                    <motion.div
                      key="row"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="absolute inset-0 flex items-center justify-between px-3.5"
                    >
                      <span>
                        <span className="font-semibold">{m.name}</span> <span className="text-ink-2 num">{m.dose}</span>
                      </span>
                      <span className="text-[13.5px] text-ink-3">{m.when}</span>
                    </motion.div>
                  ) : (
                    <motion.div key="shimmer" exit={{ opacity: 0 }} className="absolute inset-0 flex items-center gap-3 px-3.5">
                      <span className="h-3 w-28 rounded-full bg-line animate-pulse" />
                      <span className="ml-auto h-3 w-16 rounded-full bg-line animate-pulse" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.45 }}
        className="relative z-20 -mt-4 ml-auto w-[78%] rounded-2xl bg-surface p-4 shadow-[var(--shadow-lift)] ring-1 ring-black/5 sm:-mr-8"
      >
        <div className="flex items-center gap-3">
          <MemberAvatar name="Ramesh" color="#8c4fbf" size={36} />
          <div className="min-w-0">
            <p className="font-semibold leading-tight">Ramesh Sharma</p>
            <p className="text-[13px] text-ink-3 num">Father · 62 yrs · O+</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="overdue">Allergic: Sulfa drugs</Badge>
          <Badge variant="info">3 medicines</Badge>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease, delay: 0.65 }}
        className="relative z-30 -mt-3 flex w-[70%] items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-[var(--shadow-lift)] ring-1 ring-black/5 sm:-ml-6"
      >
        <div className="flex w-[48px] shrink-0 flex-col items-center overflow-hidden rounded-xl ring-1 ring-due/40">
          <span className="w-full bg-due py-0.5 text-center text-[10px] font-bold tracking-[0.06em] text-due-ink">NOV</span>
          <span className="font-display py-1 text-[22px] font-extrabold leading-none num">08</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight">Influenza</p>
          <p className="text-[13px] text-ink-3">Ramesh</p>
        </div>
        <Badge variant="due">In 6 days</Badge>
      </motion.div>
    </div>
  )
}
