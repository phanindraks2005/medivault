'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import { ageFrom, allergyList, relationLabel } from '@/lib/family'
import { dayLeaf, daysFromToday, dueLabel } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import MemberAvatar from '@/components/app/MemberAvatar'
import DateLeaf from '@/components/app/DateLeaf'
import MemberForm, { toRow } from '@/components/app/MemberForm'
import { EmptyLine, ErrorLine, Page, PageHeader } from '@/components/app/kit'
import type { MedicalRecord, Vaccination } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'

export default function FamilyPage() {
  return (
    <Suspense>
      <Family />
    </Suspense>
  )
}

function Family() {
  const { status, members, colors, reload } = useFamily()
  const router = useRouter()
  const params = useSearchParams()
  const [adding, setAdding] = useState(params.get('add') === '1')
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [records, setRecords] = useState<Pick<MedicalRecord, 'family_member_id' | 'extracted_data'>[]>([])
  const [extra, setExtra] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async () => {
    setExtra('loading')
    const [v, r] = await Promise.all([
      supabase.from('vaccinations').select('id, family_member_id, vaccine_name, date_given, next_due_date'),
      supabase.from('medical_records').select('family_member_id, extracted_data'),
    ])
    if (v.error || r.error) return setExtra('error')
    setVaccinations(v.data || [])
    setRecords(r.data || [])
    setExtra('ready')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // Opened from the sidebar "+" with ?add=1; drop the flag once the dialog closes.
  const setOpen = (open: boolean) => {
    setAdding(open)
    if (!open && params.get('add')) router.replace('/profile')
  }

  const ordered = [...members].sort((a, b) => (a.relation?.toLowerCase() === 'self' ? -1 : b.relation?.toLowerCase() === 'self' ? 1 : 0))
  const loading = status === 'loading'

  const meds = (id: string) => {
    const set = new Set<string>()
    for (const r of records) if (r.family_member_id === id) for (const m of r.extracted_data?.medicines || []) if (m?.name) set.add(m.name.toLowerCase())
    return set.size
  }
  const next = (id: string) =>
    vaccinations
      .filter((v) => v.family_member_id === id && v.next_due_date)
      .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
      .sort((a, b) => a.days - b.days)[0]

  return (
    <Page>
      <PageHeader
        title="Family"
        sub={loading ? 'Loading your family…' : `${members.length} ${members.length === 1 ? 'person' : 'people'}, each in their own colour. Allergies show in red.`}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus aria-hidden="true" /> Add a family member
          </Button>
        }
      />

      {status === 'error' && <ErrorLine onRetry={reload}>Couldn&apos;t load your family. Check your connection and try again.</ErrorLine>}
      {extra === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load medicines and due dates.</ErrorLine>}

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2">
        {loading &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[196px] rounded-xl bg-canvas p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            </div>
          ))}

        {!loading && members.length === 0 && status !== 'error' && (
          <div className="md:col-span-2">
            <EmptyLine action={<Button size="sm" nativeButton={false} render={<Link href="/onboarding" />}>Set up your profile</Button>}>
              Start with your own profile, then add the people you look after.
            </EmptyLine>
          </div>
        )}

        {ordered.map((m) => {
          const allergies = allergyList(m.allergies)
          const age = ageFrom(m.dob)
          const due = next(m.id)
          const n = meds(m.id)
          return (
            <Link
              key={m.id}
              href={`/profile/family/${m.id}`}
              className="group flex flex-col rounded-xl bg-canvas p-5 transition-[box-shadow,background-color] duration-150 hover:bg-surface hover:shadow-[var(--shadow-lift)] hover:ring-1 hover:ring-line"
            >
              <div className="flex items-start gap-3.5">
                <MemberAvatar name={m.name} color={colors[m.id]} size={48} />
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-[18px] font-semibold leading-tight">{m.name}</h2>
                  <p className="mt-0.5 text-[14px] text-ink-3 num">
                    {[relationLabel(m.relation), age !== null ? `${age} yrs` : null, m.gender].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[12px] text-ink-3">Blood group</p>
                  <p className={cn('font-display text-[30px] font-bold leading-none num', !m.blood_group && 'text-line-strong')}>{m.blood_group || '—'}</p>
                </div>
              </div>

              <div className="mt-4 flex min-h-6 flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <Badge key={a} variant="overdue">
                    Allergic: {a}
                  </Badge>
                ))}
                {m.known_conditions && <Badge variant="neutral">{m.known_conditions}</Badge>}
                {!allergies.length && !m.known_conditions && <span className="text-[14px] text-ink-3">No allergies or conditions noted</span>}
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
                {extra === 'loading' ? (
                  <Skeleton className="h-10 w-full" />
                ) : due ? (
                  <>
                    <DateLeaf {...dayLeaf(due.next_due_date!)} tone={due.days < 0 ? 'red' : due.days <= 30 ? 'due' : 'plain'} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{due.vaccine_name}</p>
                      <p className={cn('text-[13px] num', due.days < 0 ? 'font-medium text-red-ink' : due.days <= 30 ? 'text-due-ink' : 'text-ink-3')}>
                        {dueLabel(due.days)}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="px-1 py-2.5 text-[14px] text-ink-3">No vaccinations due</p>
                )}
                <p className="shrink-0 pr-1 text-right text-[13px] text-ink-3 num">
                  {n} {n === 1 ? 'medicine' : 'medicines'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>

      <Dialog open={adding} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add a family member</DialogTitle>
            <DialogDescription>They get their own colour on every screen. Only the name is required.</DialogDescription>
          </DialogHeader>
          <MemberForm
            submitLabel="Add family member"
            busyLabel="Adding…"
            onCancel={() => setOpen(false)}
            onSubmit={async (values) => {
              const { data: { user } } = await supabase.auth.getUser()
              if (!user) return 'Your session has ended. Log in again.'
              const { error } = await supabase.from('family_members').insert({ user_id: user.id, ...toRow(values) })
              if (error) return "Couldn't save. Check your connection and try again."
              await reload()
              setOpen(false)
              toast.success(`${values.name.trim()} added`)
              return null
            }}
          />
        </DialogContent>
      </Dialog>
    </Page>
  )
}
