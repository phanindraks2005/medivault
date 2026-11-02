'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import { Droplet, Phone, Printer } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import MemberAvatar from '@/components/app/MemberAvatar'
import { ease } from '@/lib/motion'

export function EmergencyCardPreview() {
  return (
    <div className="relative mx-auto w-[290px] rounded-[44px] bg-ink p-3 shadow-[var(--shadow-float)]">
      <div className="absolute left-1/2 top-5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-ink" />
      <div className="overflow-hidden rounded-[34px] bg-canvas">
        <div className="bg-red px-5 pb-4 pt-12 text-white">
          <p className="text-[13px] font-semibold text-white/85">Emergency information</p>
          <div className="mt-3 flex items-center gap-3">
            <MemberAvatar name="Ramesh" color="#8c4fbf" size={44} ring />
            <div>
              <p className="font-heading text-[19px] font-extrabold leading-tight">Ramesh Sharma</p>
              <p className="text-[13px] text-white/80 num">62 yrs · Male</p>
            </div>
          </div>
        </div>
        <div className="space-y-2.5 p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
            <span className="grid size-10 place-items-center rounded-xl bg-red-soft text-red">
              <Droplet className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[12px] text-ink-3">Blood group</p>
              <p className="font-display text-[26px] font-extrabold leading-none">O+</p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface p-3.5 shadow-card">
            <p className="text-[12px] text-ink-3">Allergies</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <Badge variant="overdue">Sulfa drugs</Badge>
            </div>
          </div>
          <div className="rounded-2xl bg-surface p-3.5 shadow-card">
            <p className="text-[12px] text-ink-3">Current medicines</p>
            <p className="mt-1 text-[14px] leading-relaxed">Amlodipine 5 mg · Metformin 500 mg · Atorvastatin 10 mg</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-surface p-3.5 shadow-card">
            <span className="grid size-9 place-items-center rounded-xl bg-band-soft text-band">
              <Phone className="size-[18px]" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] text-ink-3">Emergency contact</p>
              <p className="truncate text-[14px] font-semibold">Arjun (son) · 98450 12345</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-xl bg-ink py-2.5 text-[14px] font-semibold text-white">
            <Printer className="size-4" aria-hidden="true" /> Print or save as PDF
          </div>
        </div>
      </div>
    </div>
  )
}

const CHAT = [
  { from: 'user', text: 'What is Dad taking for blood pressure?' },
  {
    from: 'doc',
    text: 'Amlodipine 5 mg, once every morning. Dr. Anita Rao at City Care Clinic prescribed it last week. He’s also on Metformin and Atorvastatin.',
  },
  { from: 'user', text: 'Can he take a sulfa antibiotic?' },
  {
    from: 'doc',
    text: 'His records list a sulfa drug allergy, so avoid it. Ask his doctor or pharmacist for an alternative before he takes any antibiotic.',
  },
] as const

export function DocChatPreview() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(reduce ? CHAT.length : 0)

  useEffect(() => {
    if (!inView || reduce || shown >= CHAT.length) return
    const t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 300 : CHAT[shown].from === 'doc' ? 1300 : 900)
    return () => clearTimeout(t)
  }, [inView, shown, reduce])

  const typing = shown < CHAT.length && CHAT[shown]?.from === 'doc' && inView && !reduce

  return (
    <div ref={ref} className="rounded-3xl bg-surface p-5 shadow-[var(--shadow-float)] ring-1 ring-black/5 md:p-6">
      <div className="flex items-center gap-3 border-b border-line pb-4">
        <span className="grid size-10 place-items-center rounded-xl bg-band text-white font-heading font-extrabold">D</span>
        <div>
          <p className="font-semibold leading-tight">Doc</p>
          <p className="text-[13px] text-ink-3">Answers from your family&apos;s records</p>
        </div>
      </div>
      <div className="mt-4 flex min-h-[330px] flex-col gap-3" aria-live="polite">
        {CHAT.slice(0, shown).map((m, i) => (
          <motion.p
            key={i}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.3, ease }}
            className={
              m.from === 'user'
                ? 'max-w-[80%] self-end rounded-2xl rounded-br-md bg-band px-4 py-2.5 text-[15px] text-white'
                : 'max-w-[88%] self-start rounded-2xl rounded-bl-md bg-canvas px-4 py-2.5 text-[15px] leading-relaxed'
            }
          >
            {m.text}
          </motion.p>
        ))}
        {typing && (
          <span className="flex w-16 items-center justify-center gap-1 self-start rounded-2xl rounded-bl-md bg-canvas py-3.5" aria-label="Doc is typing">
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
