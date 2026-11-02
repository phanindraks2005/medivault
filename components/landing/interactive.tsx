'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { ButtonLink } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import MemberAvatar from '@/components/app/MemberAvatar'
import { LogoMark } from '@/components/Logo'
import { useStage } from '@/components/landing/Stage'
import { EmergencyCard } from '@/components/landing/scenes'
import { sampleColors, sampleMembers } from '@/lib/sample-family'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#emergency-card', label: 'Emergency card' },
  { href: '#security', label: 'Privacy' },
]

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
  }, [])
  return signedIn
}

export function LandingNav() {
  const signedIn = useSignedIn()
  return (
    <nav aria-label="Main" className="flex items-center justify-between gap-6">
      <Link href="/" aria-label="MediVault home" className="rounded-full lg:hidden">
        <LogoMark size={34} />
      </Link>
      <ul className="hidden items-center gap-6 whitespace-nowrap xl:gap-7 lg:flex">
        {LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} className="text-[15px] text-ink-2 transition-colors duration-150 hover:text-ink">
              {l.label}
            </a>
          </li>
        ))}
        {!signedIn && (
          <li>
            <Link href="/auth" className="text-[15px] text-ink-2 transition-colors duration-150 hover:text-ink">
              Log in
            </Link>
          </li>
        )}
      </ul>
      <div className="flex items-center gap-1">
      {!signedIn && (
        <ButtonLink variant="ghost" className="lg:hidden" href="/auth">
          Log in
        </ButtonLink>
      )}
      {signedIn ? (
        <ButtonLink href="/dashboard">
          Open dashboard <ArrowRight aria-hidden="true" />
        </ButtonLink>
      ) : (
        <ButtonLink href="/demo">
          Try the demo <ArrowRight aria-hidden="true" />
        </ButtonLink>
      )}
      </div>
    </nav>
  )
}

// The name, set at monument size. It settles a few percent smaller as the
// first screen scrolls away.
export function Wordmark({ className }: { className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['end end', 'start start'] })
  const scale = useTransform(scrollYProgress, [0, 1], [1, reduce ? 1 : 0.93])
  return (
    <motion.h1 ref={ref} style={{ scale }} className={cn('origin-bottom-left', className)}>
      MediVault
    </motion.h1>
  )
}

// Parts of a section arrive one after another as it scrolls into view.
export function Reveal({
  children,
  className,
  delay = 0,
  as = 'div',
  stage,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
  as?: 'div' | 'li' | 'figure'
  stage?: string
}) {
  const M = as === 'li' ? motion.li : as === 'figure' ? motion.figure : motion.div
  return (
    <M
      className={className}
      data-stage={stage}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.6, ease, delay }}
    >
      {children}
    </M>
  )
}

// The live thing: choose someone from the sample family and their card is
// rebuilt in their colour, on the stage on desktop and in place on a phone.
// Arrow keys move along a tab list or radio group, as screen reader users expect.
function arrowTo<T>(e: React.KeyboardEvent, list: readonly T[], current: T, set: (v: T) => void) {
  const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
  if (!step) return
  e.preventDefault()
  const next = list[(list.indexOf(current) + step + list.length) % list.length]
  set(next)
  const group = (e.currentTarget as HTMLElement).parentElement
  requestAnimationFrame(() => group?.querySelector<HTMLElement>('[aria-selected="true"],[aria-checked="true"]')?.focus())
}

export function MemberTabs() {
  const { member, setMember } = useStage()
  const ids = sampleMembers.map((m) => m.id)
  return (
    <div>
      <div role="tablist" aria-label="Sample family member" className="flex flex-wrap gap-x-6 gap-y-2">
        {sampleMembers.map((m) => {
          const active = m.id === member
          return (
            <button
              key={m.id}
              role="tab"
              aria-selected={active}
              aria-controls="emergency-card-preview"
              tabIndex={active ? 0 : -1}
              onClick={() => setMember(m.id)}
              onKeyDown={(e) => arrowTo(e, ids, member, setMember)}
              className={cn(
                'group relative flex items-center gap-2 py-2 text-[18px] transition-colors duration-150',
                active ? 'font-medium text-ink' : 'text-ink-3 hover:text-ink-2'
              )}
            >
              <span className="size-2.5 rounded-full" style={{ background: sampleColors[m.id] }} aria-hidden="true" />
              {m.name.split(' ')[0]}
              {active && <motion.span layoutId="card-tab" className="absolute inset-x-0 -bottom-0.5 h-[3px] rounded-full bg-ink" transition={{ duration: 0.3, ease }} />}
            </button>
          )
        })}
      </div>
      <div id="emergency-card-preview" role="tabpanel" aria-live="polite" className="mt-10 flex justify-center lg:hidden">
        <EmergencyCard memberId={member} />
      </div>
      <p className="sr-only" aria-live="polite">
        Showing the card for {sampleMembers.find((m) => m.id === member)?.name}
      </p>
    </div>
  )
}

const RELATIONS = ['Parent', 'Child', 'Partner'] as const
const NEXT_COLOUR = '#8b5e34'

// The product's own "Add a family member" dialog, already open.
export function AddMemberDialog() {
  const [name, setName] = useState('Amma')
  const [relation, setRelation] = useState<(typeof RELATIONS)[number]>('Parent')
  const id = useId()
  const shown = name.trim() || 'Someone'

  return (
    <div data-ui role="group" aria-labelledby={`${id}-title`} className="w-full max-w-[440px] rounded-2xl bg-surface p-6 text-ink shadow-[var(--shadow-float)] md:p-7">
      <p id={`${id}-title`} className="text-[20px] font-semibold">Add a family member</p>
      <p className="mt-1 text-[14px] text-ink-3">They get their own colour on every screen.</p>

      <label htmlFor={`${id}-name`} className="mt-5 block text-[14px] font-medium text-ink-2">
        Name
      </label>
      <Input id={`${id}-name`} value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" spellCheck={false} className="mt-1.5" />

      <p id={`${id}-rel`} className="mt-4 text-[14px] font-medium text-ink-2">
        Relation
      </p>
      <div role="radiogroup" aria-labelledby={`${id}-rel`} className="mt-1.5 grid grid-cols-3 gap-1 rounded-lg bg-canvas p-1">
        {RELATIONS.map((r) => (
          <button
            key={r}
            role="radio"
            aria-checked={relation === r}
            tabIndex={relation === r ? 0 : -1}
            onClick={() => setRelation(r)}
            onKeyDown={(e) => arrowTo(e, RELATIONS, relation, setRelation)}
            className={cn(
              'h-9 rounded-md text-[14px] transition-[background-color,color,box-shadow] duration-150',
              relation === r ? 'bg-surface font-medium text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:text-ink'
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3 rounded-lg bg-canvas px-3.5 py-3">
        <MemberAvatar name={shown} color={NEXT_COLOUR} size={34} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight">{shown}</p>
          <p className="text-[13px] text-ink-3">{relation}</p>
        </div>
        <Badge variant="neutral" className="gap-1.5">
          <span className="size-2 rounded-full" style={{ background: NEXT_COLOUR }} aria-hidden="true" /> Brown
        </Badge>
      </div>

      <ButtonLink size="lg" className="mt-6 w-full" href="/demo">
        Try the demo <ArrowRight aria-hidden="true" />
      </ButtonLink>
      <p className="mt-3 text-center text-[14px] text-ink-3">
        Ready for your own family?{' '}
        <Link href="/auth?mode=signup" className="font-medium text-band underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
