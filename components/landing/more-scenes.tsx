'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import MemberAvatar from '@/components/app/MemberAvatar'
import DateLeaf from '@/components/app/DateLeaf'
import { Badge } from '@/components/ui/badge'
import { dayLeaf, daysFromToday, dueLabel } from '@/lib/dates'
import { sampleColors, sampleMembers, sampleVaccinations } from '@/lib/sample-family'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

const CHAT = [
  { from: 'user', text: 'What is Dad taking for blood pressure?' },
  { from: 'doc', text: 'Amlodipine 5 mg, every morning. Dr. Anita Rao at City Care Clinic prescribed it last week, with Metformin and Atorvastatin.' },
  { from: 'user', text: 'Can he take a sulfa antibiotic?' },
  { from: 'doc', text: 'His records list a sulfa drug allergy, so no. Ask his doctor or pharmacist for an alternative first.' },
] as const

// Doc answering from the sample family's records, one message at a time.
export function DocScene({ className }: { className?: string }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? CHAT.length : 0)

  useEffect(() => {
    if (reduce || shown >= CHAT.length) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 250 : CHAT[shown].from === 'doc' ? 1200 : 800)
    return () => clearTimeout(t)
  }, [shown, reduce])

  const typing = !reduce && shown < CHAT.length && CHAT[shown].from === 'doc'

  return (
    <div data-ui className={cn('w-full max-w-[460px] rounded-2xl bg-surface p-5 shadow-[var(--shadow-float)]', className)}>
      <div className="flex items-center gap-3 pb-4 shadow-[0_1px_0_var(--line)]">
        <span className="grid size-9 place-items-center rounded-full bg-band text-[15px] font-semibold text-white">D</span>
        <div>
          <p className="font-semibold leading-tight">Doc</p>
          <p className="text-[13px] text-ink-3">Answers from your family&apos;s records</p>
        </div>
      </div>
      <div className="mt-4 flex min-h-[300px] flex-col gap-2.5">
        {CHAT.slice(0, shown).map((m, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease }}
            className={
              m.from === 'user'
                ? 'max-w-[80%] self-end rounded-2xl rounded-br-md bg-band px-3.5 py-2 text-[14px] text-white'
                : 'max-w-[88%] self-start rounded-2xl rounded-bl-md bg-canvas px-3.5 py-2 text-[14px] leading-relaxed'
            }
          >
            {m.text}
          </motion.p>
        ))}
        {typing && (
          <span className="flex w-14 items-center justify-center gap-1 self-start rounded-2xl rounded-bl-md bg-canvas py-3">
            {[0, 1, 2].map((d) => (
              <motion.span
                key={d}
                className="size-1.5 rounded-full bg-ink-3"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
              />
            ))}
          </span>
        )}
      </div>
    </div>
  )
}

// "Coming up" from the dashboard: every vaccination with its next date.
export function ComingUpScene({ className }: { className?: string }) {
  const rows = [...sampleVaccinations].sort((a, b) => (a.next_due_date || '').localeCompare(b.next_due_date || ''))
  const first = (id: string) => sampleMembers.find((m) => m.id === id)?.name.split(' ')[0]
  return (
    <div data-ui className={cn('w-full max-w-[460px] rounded-2xl bg-surface p-5 shadow-[var(--shadow-float)]', className)}>
      <p className="text-[17px] font-semibold">Coming up</p>
      <p className="text-[13px] text-ink-3">Next 60 days</p>
      <ul className="mt-3 space-y-1">
        {rows.map((v, i) => {
          const days = daysFromToday(v.next_due_date!)
          const leaf = dayLeaf(v.next_due_date!)
          const tone = days < 0 ? 'red' : days <= 30 ? 'due' : 'plain'
          return (
            <motion.li
              key={v.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease, delay: 0.1 + i * 0.07 }}
              className="flex items-center gap-3 rounded-lg px-1 py-2"
            >
              <DateLeaf day={leaf.day} month={leaf.month} tone={tone} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{v.vaccine_name}</p>
                <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                  <span className="size-2 rounded-full" style={{ background: sampleColors[v.family_member_id] }} aria-hidden="true" />
                  {first(v.family_member_id)}
                </p>
              </div>
              <Badge variant={tone === 'red' ? 'overdue' : tone === 'due' ? 'due' : 'neutral'}>{dueLabel(days)}</Badge>
            </motion.li>
          )
        })}
      </ul>
    </div>
  )
}

const CHECKS = [
  { pair: 'Metformin + Atorvastatin', verdict: 'No known problem', tone: 'ok' as const, note: 'Commonly taken together.' },
  { pair: 'Amlodipine + Atorvastatin', verdict: 'Worth a mention', tone: 'due' as const, note: 'Usually fine at these doses; mention any muscle pain to the doctor.' },
  { pair: 'Amlodipine + Clarithromycin', verdict: 'Ask your doctor', tone: 'due' as const, note: 'The antibiotic can raise amlodipine levels.' },
]

export function ChecksScene({ className }: { className?: string }) {
  return (
    <div data-ui className={cn('w-full max-w-[460px] rounded-2xl bg-surface p-5 shadow-[var(--shadow-float)]', className)}>
      <div className="flex items-center gap-3">
        <MemberAvatar name="Ramesh" color={sampleColors.ramesh} size={34} />
        <div>
          <p className="font-semibold leading-tight">Interaction check</p>
          <p className="text-[13px] text-ink-3">Ramesh · 3 medicines and 1 new</p>
        </div>
      </div>
      <ul className="mt-4 space-y-2">
        {CHECKS.map((c, i) => (
          <motion.li
            key={c.pair}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease, delay: 0.1 + i * 0.08 }}
            className="rounded-lg bg-canvas p-3"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold">{c.pair}</p>
              <Badge variant={c.tone}>{c.verdict}</Badge>
            </div>
            <p className="mt-1 text-[13px] text-ink-2">{c.note}</p>
          </motion.li>
        ))}
      </ul>
    </div>
  )
}
