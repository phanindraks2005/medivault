'use client'

import Link from 'next/link'
import { motion } from 'motion/react'
import { AlertTriangle, ChevronRight, MessageCircle, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import MemberAvatar from '@/components/app/MemberAvatar'
import DateLeaf from '@/components/app/DateLeaf'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import QuickAnswers from '@/components/QuickAnswers'
import type { Member } from '@/lib/family-context'
import { ageFrom, allergyList, relationLabel } from '@/lib/family'
import { dayLeaf, daysFromToday, dueLabel, formatDay, startOfToday } from '@/lib/dates'
import { rise, stagger } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CalendarEvent, MedicalRecord, Vaccination } from './types'

// How far ahead "Coming up" looks. Overdue items always show.
const LOOKAHEAD_DAYS = 60

type Props = {
  status: 'loading' | 'ready' | 'error'
  members: Member[]
  colors: Record<string, string>
  vaccinations: Vaccination[]
  records: MedicalRecord[]
  demo?: boolean
  // Rendered as a picture inside another page: no h1, nothing animates in.
  preview?: boolean
  onRetry?: () => void
}

/*
  Grid: a centred 1100px column, 12 columns of 77px with 16px gutters
  (12 × 77 + 11 × 16 = 1100). Rows span 3/3/3/3, then 9/3, then 6/6, then 12,
  so every internal edge meets one above it.
*/
export default function DashboardView({ status, members, colors, vaccinations, records, demo, preview, onRetry }: Props) {
  const today = startOfToday()
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))
  const firstName = (id: string) => memberById[id]?.name.split(' ')[0] || ''
  const self = members.find((m) => m.relation?.toLowerCase() === 'self')

  const upcoming = vaccinations
    .filter((v) => v.next_due_date && daysFromToday(v.next_due_date) <= LOOKAHEAD_DAYS)
    .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
    .sort((a, b) => a.days - b.days)
  const overdue = upcoming.filter((v) => v.days < 0)
  const dueSoon = upcoming.filter((v) => v.days >= 0 && v.days <= 30)

  const medicinesByMember: Record<string, Set<string>> = {}
  for (const r of records) {
    for (const med of r.extracted_data?.medicines || []) {
      if (med?.name) (medicinesByMember[r.family_member_id] ||= new Set()).add(med.name.toLowerCase())
    }
  }
  const medicineCount = Object.values(medicinesByMember).reduce((n, s) => n + s.size, 0)
  const readCount = records.filter((r) => r.extracted_data && !r.extracted_data.error).length
  const unread = records.length - readCount

  const events: CalendarEvent[] = [
    ...vaccinations
      .filter((v) => v.next_due_date)
      .map((v) => ({
        date: v.next_due_date!,
        memberId: v.family_member_id,
        label: v.vaccine_name,
        kind: (daysFromToday(v.next_due_date!) < 0 ? 'overdue' : 'due') as CalendarEvent['kind'],
      })),
    ...records
      .filter((r) => r.record_date)
      .map((r) => ({ date: r.record_date!, memberId: r.family_member_id, label: recordTitle(r), kind: 'record' as const })),
  ]

  const signUp = '/auth?mode=signup'
  const addHref = demo ? signUp : self ? `/profile/family/${self.id}?upload=1` : '/profile'
  const loading = status === 'loading'
  const Title = preview ? 'p' : 'h1'
  const enter = preview ? {} : { initial: 'hidden', animate: 'show' }

  // The one finding, read first: the oldest overdue item, else the next one due.
  const finding = loading
    ? 'Getting your family’s calendar ready…'
    : overdue.length
      ? `${firstName(overdue[0].family_member_id)}’s ${overdue[0].vaccine_name.toLowerCase()} is ${-overdue[0].days} ${-overdue[0].days === 1 ? 'day' : 'days'} overdue.${
          dueSoon.length ? ` ${dueSoon.length} more due in the next 30 days.` : ''
        }`
      : dueSoon.length
        ? `Next up: ${firstName(dueSoon[0].family_member_id)}’s ${dueSoon[0].vaccine_name.toLowerCase()}, ${dueLabel(dueSoon[0].days).toLowerCase()}.`
        : members.length
          ? 'Nothing due in the next 30 days.'
          : 'Add yourself to start your family’s calendar.'

  const nextDue = upcoming.find((v) => v.days >= 0)

  return (
    <div className="mx-auto max-w-[1100px] px-4 pb-10 pt-6 sm:px-6 lg:px-0 lg:pt-14">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <Title className="font-heading text-[26px] leading-tight tracking-[-0.03em] sm:text-[32px]">
            {today.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Title>
          <p className={cn('mt-1.5 max-w-[64ch] text-[16px]', overdue.length && !loading ? 'text-ink' : 'text-ink-2')}>{finding}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href={demo ? signUp : '/doc'} />}>
            <MessageCircle aria-hidden="true" /> Ask Doc
          </Button>
          <Button nativeButton={false} render={<Link href={addHref} />}>
            <Plus aria-hidden="true" /> Add a prescription
          </Button>
        </div>
      </header>

      {status === 'error' && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-5 py-4">
          <AlertTriangle className="size-5 text-red" aria-hidden="true" />
          <p className="flex-1 text-ink">Couldn&apos;t load your family&apos;s records. Check your connection and try again.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      {/* Counts: label, figure, one plain caption. */}
      <motion.section aria-label="Summary" variants={stagger()} {...enter} className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Count label="Family members" value={members.length} loading={loading}>
          {members.length ? (
            <span className="flex items-center gap-1">
              {members.map((m) => (
                <span key={m.id} className="size-2 rounded-full" style={{ background: colors[m.id] }} aria-hidden="true" />
              ))}
              <span className="ml-1 truncate">{members.map((m) => m.name.split(' ')[0]).join(', ')}</span>
            </span>
          ) : (
            'Start with yourself'
          )}
        </Count>
        <Count label="Records read" value={readCount} loading={loading}>
          {records.length === 0 ? 'No records yet' : unread ? `${unread} waiting or need a retry` : 'All read'}
        </Count>
        <Count label="Medicines on record" value={medicineCount} loading={loading}>
          {medicineCount ? `For ${Object.keys(medicinesByMember).length} of ${members.length} people` : 'Read from prescriptions'}
        </Count>
        {overdue.length ? (
          <Count label="Overdue" value={overdue.length} tone="red" loading={loading}>
            {overdue[0].vaccine_name} · {firstName(overdue[0].family_member_id)}
          </Count>
        ) : (
          <Count label="Due in 30 days" value={dueSoon.length} loading={loading}>
            {nextDue ? `Next: ${formatDay(nextDue.next_due_date!)}` : 'Nothing scheduled'}
          </Count>
        )}
      </motion.section>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <motion.div variants={rise} {...enter} className="min-w-0 lg:col-span-9">
          {loading ? <Skeleton className="h-[560px] rounded-xl" /> : <MonthCalendar today={today} events={events} members={members} colors={colors} />}
        </motion.div>

        <motion.section variants={rise} {...enter} aria-labelledby="coming-up" className="flex flex-col rounded-xl bg-canvas p-5 lg:col-span-3">
          <PanelHead id="coming-up" title="Coming up" count={loading ? undefined : upcoming.length} hint={`Next ${LOOKAHEAD_DAYS} days`} />
          {loading && <RowsSkeleton count={4} />}
          {!loading && upcoming.length === 0 && <EmptyLine>Vaccinations with a next-due date show up here.</EmptyLine>}
          {!loading && upcoming.length > 0 && (
            <ul className="mt-3 space-y-2">
              {upcoming.slice(0, 6).map((v) => {
                const leaf = dayLeaf(v.next_due_date!)
                const tone = v.days < 0 ? 'red' : v.days <= 30 ? 'due' : 'plain'
                return (
                  <li key={v.id}>
                    <Link
                      href={demo ? signUp : `/profile/family/${v.family_member_id}/vaccinations`}
                      className="flex items-center gap-3 rounded-lg bg-surface p-2.5 border border-line transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-lift)]"
                    >
                      <DateLeaf day={leaf.day} month={leaf.month} tone={tone} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium">{v.vaccine_name}</p>
                        <p className="flex items-center gap-1.5 text-[13px] text-ink-3">
                          <span className="size-2 shrink-0 rounded-full" style={{ background: colors[v.family_member_id] }} aria-hidden="true" />
                          <span className="truncate">{firstName(v.family_member_id)}</span>
                        </p>
                        <p className={cn('text-[13px] font-medium num', tone === 'red' ? 'text-red-ink' : tone === 'due' ? 'text-due-ink' : 'text-ink-3')}>
                          {dueLabel(v.days)}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          {!loading && (
            <Link
              href={demo ? signUp : '/profile'}
              className="mt-auto inline-flex items-center gap-1 self-start pt-4 text-[14px] font-medium text-band underline-offset-4 hover:underline"
            >
              All vaccinations <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          )}
        </motion.section>

        <motion.section variants={rise} {...enter} aria-labelledby="recent-records" className="rounded-xl bg-canvas p-5 lg:col-span-6">
          <PanelHead
            id="recent-records"
            title="Recent records"
            count={loading ? undefined : records.length}
            hint="By the date the doctor wrote them"
          />
          {loading && <RowsSkeleton count={4} />}
          {!loading && records.length === 0 && (
            <EmptyLine
              action={
                <Button size="sm" nativeButton={false} render={<Link href={addHref} />}>
                  <Plus aria-hidden="true" /> Add a prescription
                </Button>
              }
            >
              Upload a photo or PDF of a prescription. MediVault reads the doctor, the date and every medicine.
            </EmptyLine>
          )}
          {!loading && records.length > 0 && (
            <ul className="mt-3 space-y-2">
              {records.slice(0, 4).map((r) => (
                <li key={r.id}>
                  <RecordRow record={r} member={memberById[r.family_member_id]} color={colors[r.family_member_id]} demo={demo} />
                </li>
              ))}
            </ul>
          )}
        </motion.section>

        <motion.section variants={rise} {...enter} aria-labelledby="family-heading" className="rounded-xl bg-canvas p-5 lg:col-span-6">
          <PanelHead
            id="family-heading"
            title="Family"
            count={loading ? undefined : members.length}
            action={
              !demo && (
                <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/profile?add=1" />}>
                  <Plus aria-hidden="true" /> Add
                </Button>
              )
            }
          />
          {loading && <RowsSkeleton count={4} />}
          {!loading && members.length === 0 && (
            <EmptyLine action={<Button size="sm" nativeButton={false} render={<Link href="/onboarding" />}>Set up your profile</Button>}>
              Add your own profile, then the people you look after.
            </EmptyLine>
          )}
          {!loading && members.length > 0 && (
            <ul className="mt-3 space-y-2">
              {[...members]
                .sort((a, b) => (a.relation?.toLowerCase() === 'self' ? -1 : b.relation?.toLowerCase() === 'self' ? 1 : 0))
                .slice(0, 4)
                .map((m) => {
                  const allergies = allergyList(m.allergies)
                  const age = ageFrom(m.dob)
                  const meds = medicinesByMember[m.id]?.size || 0
                  return (
                    <li key={m.id}>
                      <Link
                        href={demo ? signUp : `/profile/family/${m.id}`}
                        className="group flex min-h-[84px] items-center gap-3 rounded-lg bg-surface px-3 py-2.5 border border-line transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-lift)]"
                      >
                        <MemberAvatar name={m.name} color={colors[m.id]} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-medium">{m.name}</p>
                          <p className="truncate text-[13px] text-ink-3 num">
                            {[relationLabel(m.relation), age !== null ? `${age} yrs` : null, m.blood_group, `${meds} ${meds === 1 ? 'medicine' : 'medicines'}`]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </div>
                        {allergies.length > 0 && (
                          <Badge variant="overdue" className="hidden max-w-[45%] truncate sm:inline-flex">
                            Allergic: {allergies.join(', ')}
                          </Badge>
                        )}
                        <ChevronRight className="size-4 shrink-0 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
            </ul>
          )}
        </motion.section>

        <motion.div variants={rise} {...enter} className="lg:col-span-12">
          <QuickAnswers demo={demo} />
        </motion.div>
      </div>
    </div>
  )
}

function recordTitle(r: MedicalRecord) {
  return r.record_type === 'lab_report' ? 'Lab report' : r.record_type === 'other' ? 'Record' : 'Prescription'
}

function Count({
  label,
  value,
  tone = 'plain',
  loading,
  children,
}: {
  label: string
  value: number
  tone?: 'plain' | 'red'
  loading?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.div variants={rise} className="flex h-[128px] min-w-0 flex-col rounded-xl bg-canvas p-4">
      <p className="text-[14px] text-ink-2">{label}</p>
      {loading ? (
        <Skeleton className="mt-2 h-8 w-12" />
      ) : (
        <p className={cn('mt-1 text-[32px] font-normal leading-none tracking-[-0.02em] num', tone === 'red' ? 'text-red' : 'text-ink')}>{value}</p>
      )}
      <div className="mt-auto truncate text-[13px] text-ink-3">{loading ? <Skeleton className="h-3 w-24" /> : children}</div>
    </motion.div>
  )
}

function PanelHead({ id, title, count, hint, action }: { id: string; title: string; count?: number; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-[15px] font-semibold">
          {title}
          {count !== undefined && <span className="rounded-full bg-surface px-2 py-0.5 text-[12px] font-medium text-ink-2 border border-line num">{count}</span>}
        </h2>
        {hint && <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function RecordRow({ record, member, color, demo }: { record: MedicalRecord; member?: Member; color?: string; demo?: boolean }) {
  const date = record.record_date || record.created_at
  const leaf = dayLeaf(date)
  const meds = record.extracted_data?.medicines?.map((m) => m.name).filter(Boolean) || []
  let status: { label: string; variant: 'ok' | 'due' | 'overdue' }
  if (!record.extracted_data) status = { label: 'Reading…', variant: 'due' }
  else if (record.extracted_data.error) status = { label: 'Needs a retry', variant: 'overdue' }
  else status = { label: 'Read', variant: 'ok' }

  return (
    <Link
      href={demo ? '/auth?mode=signup' : `/profile/family/${record.family_member_id}/records/${record.id}`}
      className="flex min-h-[63px] items-center gap-3 rounded-lg bg-surface px-3 py-2.5 border border-line transition-[box-shadow] duration-150 hover:shadow-[var(--shadow-lift)]"
    >
      <DateLeaf day={leaf.day} month={leaf.month} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium">
          {recordTitle(record)}
          {record.doctor_name && <span className="font-normal text-ink-2"> · {record.doctor_name}</span>}
        </p>
        <p className="truncate text-[13px] text-ink-3">
          {member && (
            <>
              <span className="mr-1 inline-block size-2 rounded-full align-middle" style={{ background: color }} aria-hidden="true" />
              {member.name.split(' ')[0]} ·{' '}
            </>
          )}
          {meds.length ? meds.join(', ') : record.extracted_data?.error ? "The file couldn't be read" : 'No medicines listed'}
          {!record.record_date && ` · uploaded ${formatDay(record.created_at)}`}
        </p>
      </div>
      <Badge variant={status.variant}>{status.label}</Badge>
    </Link>
  )
}

function EmptyLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg bg-surface p-4 border border-line">
      <p className="text-[14px] text-ink-2">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex h-[63px] items-center gap-3 rounded-lg bg-surface px-3 border border-line">
          <Skeleton className="h-[46px] w-[50px] rounded-[10px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
