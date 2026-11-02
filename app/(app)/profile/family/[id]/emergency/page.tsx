'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Phone, Printer } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import { ageFrom, allergyList } from '@/lib/family'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import MemberAvatar from '@/components/app/MemberAvatar'
import { ErrorLine, Page, PageHeader } from '@/components/app/kit'
import type { Medicine } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'

type Card = {
  name: string
  dob: string | null
  gender: string | null
  blood_group: string | null
  allergies: string | null
  known_conditions: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

// Large type for older eyes and for someone reading it in a hurry; prints on one page.
export default function EmergencyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { colors } = useFamily()
  const [card, setCard] = useState<Card | null>(null)
  const [medicines, setMedicines] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async () => {
    const [m, r] = await Promise.all([
      supabase
        .from('family_members')
        .select('name, dob, gender, blood_group, allergies, known_conditions, emergency_contact_name, emergency_contact_phone')
        .eq('id', id)
        .maybeSingle(),
      supabase.from('medical_records').select('record_date, created_at, extracted_data').eq('family_member_id', id),
    ])
    if (m.error || r.error || !m.data) return setStatus('error')
    // Each medicine once, newest prescription first.
    const rows = (r.data || []).sort((a, b) => (b.record_date || b.created_at).localeCompare(a.record_date || a.created_at))
    const seen = new Map<string, string>()
    for (const row of rows)
      for (const med of (row.extracted_data?.medicines || []) as Medicine[]) {
        const key = med?.name?.toLowerCase()
        if (key && !seen.has(key)) seen.set(key, [med.name, med.dosage].filter(Boolean).join(' '))
      }
    setCard(m.data)
    setMedicines([...seen.values()])
    setStatus('ready')
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const first = card?.name.split(' ')[0] || 'Back'
  const allergies = allergyList(card?.allergies)
  const conditions = allergyList(card?.known_conditions)
  const age = ageFrom(card?.dob)
  const color = colors[id] || '#5b6b7f'

  return (
    <Page className="print:p-0">
      <div className="print:hidden">
        <PageHeader
          back={{ href: `/profile/family/${id}`, label: first }}
          title="Emergency card"
          sub="Show it on this screen or print it for a wallet or the fridge door."
          actions={
            <Button onClick={() => window.print()} disabled={status !== 'ready'}>
              <Printer aria-hidden="true" /> Print or save as PDF
            </Button>
          }
        />
      </div>

      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load this card. Check your connection and try again.</ErrorLine>}

      <article
        aria-label={card ? `Emergency information for ${card.name}` : 'Emergency information'}
        className="mx-auto mt-10 max-w-[680px] overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-lift)] print:mt-0 print:max-w-none print:rounded-none print:shadow-none"
      >
        <header className="bg-navy px-6 pb-6 pt-6 text-white sm:px-8 print:bg-white print:text-ink" style={{ boxShadow: `inset 0 6px 0 ${color}` }}>
          <p className="text-[15px] font-medium text-white/75 print:text-ink-2">Emergency information</p>
          <div className="mt-3 flex items-center gap-4">
            {card ? <MemberAvatar name={card.name} color={color} size={56} ring /> : <Skeleton className="size-14 rounded-full bg-white/15" />}
            <div className="min-w-0">
              <h2 className="text-[30px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{card ? card.name : <span className="inline-block h-9 w-56 animate-pulse rounded-md bg-white/15" />}</h2>
              {card && <p className="mt-0.5 text-[17px] text-white/80 print:text-ink-2 num">{[age !== null ? `${age} years` : null, card.gender].filter(Boolean).join(' · ') || ' '}</p>}
            </div>
          </div>
        </header>

        <dl className="divide-y divide-line px-6 sm:px-8">
          <div className="flex items-end justify-between gap-4 py-6">
            <dt className="text-[17px] text-ink-2">Blood group</dt>
            <dd className={cn('font-display text-[72px] font-bold leading-[0.8] num sm:text-[88px]', !card?.blood_group && 'text-line-strong')}>
              {status === 'loading' ? <Skeleton className="h-16 w-24" /> : card?.blood_group || '—'}
            </dd>
          </div>

          <div className="py-6">
            <dt className="text-[17px] text-ink-2">Allergies</dt>
            <dd className="mt-3">
              {allergies.length ? (
                <ul className="flex flex-wrap gap-2">
                  {allergies.map((a) => (
                    <li key={a} className="rounded-lg bg-red-soft px-3.5 py-2 text-[20px] font-semibold text-red-ink print:border print:border-red">
                      {a}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[20px]">{status === 'ready' ? 'None known' : ''}</p>
              )}
            </dd>
          </div>

          <div className="py-6">
            <dt className="text-[17px] text-ink-2">Current medicines</dt>
            <dd className="mt-2 text-[20px] leading-relaxed">
              {medicines.length ? (
                <ul className="space-y-1">
                  {medicines.map((m) => (
                    <li key={m} className="num">
                      {m}
                    </li>
                  ))}
                </ul>
              ) : (
                status === 'ready' && 'None on record'
              )}
            </dd>
          </div>

          {conditions.length > 0 && (
            <div className="py-6">
              <dt className="text-[17px] text-ink-2">Known conditions</dt>
              <dd className="mt-2 text-[20px]">{conditions.join(', ')}</dd>
            </div>
          )}

          <div className="py-6">
            <dt className="text-[17px] text-ink-2">Who to call</dt>
            <dd className="mt-2">
              {card?.emergency_contact_name || card?.emergency_contact_phone ? (
                <>
                  <p className="text-[22px] font-semibold">{card.emergency_contact_name}</p>
                  {card.emergency_contact_phone && (
                    <a
                      href={`tel:${card.emergency_contact_phone.replace(/\s+/g, '')}`}
                      className="mt-2 inline-flex min-h-12 items-center gap-2.5 rounded-full bg-band px-5 text-[20px] font-medium text-white hover:bg-band-deep print:bg-white print:px-0 print:text-ink num"
                    >
                      <Phone className="size-5 print:hidden" aria-hidden="true" />
                      {card.emergency_contact_phone}
                    </a>
                  )}
                </>
              ) : (
                status === 'ready' && <p className="text-[20px]">Not added yet</p>
              )}
            </dd>
          </div>
        </dl>

        <footer className="bg-canvas px-6 py-4 text-[14px] text-ink-3 sm:px-8 print:bg-white">
          From MediVault{status === 'ready' && `, ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}. Medicines are as read from prescriptions; confirm with a doctor.
        </footer>
      </article>
    </Page>
  )
}
