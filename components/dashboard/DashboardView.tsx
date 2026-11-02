'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { AlertTriangle, CalendarClock, ChevronRight, FileText, MessageCircle, Pill, Plus, Users } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { NumberTicker } from '@/components/ui/number-ticker'
import MemberAvatar from '@/components/app/MemberAvatar'
import MonthCalendar from '@/components/dashboard/MonthCalendar'
import QuickAnswers from '@/components/QuickAnswers'
import type { Member } from '@/lib/family-context'
import { ageFrom, allergyList, relationLabel } from '@/lib/family'
import { dayLeaf, daysFromToday, dueLabel, formatDay, startOfToday } from '@/lib/dates'
import { ease, rise, stagger } from '@/lib/motion'
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
  // Rendered as a picture inside another page: no h1, numbers drawn at rest.
  preview?: boolean
  onRetry?: () => void
}

export default function DashboardView({ status, members, colors, vaccinations, records, demo, preview, onRetry }: Props) {
  const today = startOfToday()
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))
  const firstName = (id: string) => memberById[id]?.name.split(' ')[0] || ''
  const self = members.find((m) => m.relation?.toLowerCase() === 'self')

  const upcoming = vaccinations
    .filter((v) => v.next_due_date && daysFromToday(v.next_due_date) <= LOOKAHEAD_DAYS)
    .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
    .sort((a, b) => a.days - b.days)
  const overdueCount = upcoming.filter((v) => v.days < 0).length
  const dueSoonCount = upcoming.filter((v) => v.days >= 0 && v.days <= 30).length

  const medicinesByMember: Record<string, Set<string>> = {}
  for (const r of records) {
    for (const med of r.extracted_data?.medicines || []) {
      if (med?.name) (medicinesByMember[r.family_member_id] ||= new Set()).add(med.name.toLowerCase())
    }
  }
  const medicineCount = Object.values(medicinesByMember).reduce((n, s) => n + s.size, 0)
  const readCount = records.filter((r) => r.extracted_data && !r.extracted_data.error).length

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

  const addHref = demo ? '/auth?mode=signup' : self ? `/profile/family/${self.id}?upload=1` : '/profile'
  const attention = overdueCount + dueSoonCount
  const loading = status === 'loading'
  const Title = preview ? 'p' : 'h1'

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-6 md:px-8 md:py-9">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[15px] text-ink-3">{today.toLocaleDateString('en-IN', { weekday: 'long' })}</p>
          <Title className="font-heading text-[34px] md:text-[42px] font-extrabold leading-[1.05] tracking-[-0.02em]">
            {today.toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
          </Title>
          <p className="mt-1.5 text-[16px] text-ink-2">
            {loading
              ? 'Getting your family’s calendar ready…'
              : overdueCount > 0
                ? `${overdueCount} overdue and ${dueSoonCount} due in the next 30 days`
                : attention > 0
                  ? `${dueSoonCount} ${dueSoonCount === 1 ? 'thing' : 'things'} due in the next 30 days`
                  : 'Nothing due in the next 30 days'}
          </p>
        </div>
        <div className="flex gap-2.5">
          <Button variant="outline" nativeButton={false} render={<Link href={demo ? '/auth?mode=signup' : '/doc'} />}>
            <MessageCircle aria-hidden="true" /> Ask Doc
          </Button>
          <Button nativeButton={false} render={<Link href={addHref} />}>
            <Plus aria-hidden="true" /> Add a prescription
          </Button>
        </div>
      </header>

      {status === 'error' && (
        <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-red-soft px-5 py-4 text-red-ink">
          <AlertTriangle className="size-5" aria-hidden="true" />
          <p className="flex-1">Couldn&apos;t load your family&apos;s records. Check your connection and try again.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}

      <motion.section
        aria-label="Summary"
        variants={stagger()}
        initial="hidden"
        animate="show"
        className="mt-7 grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
      >
        <Stat icon={Users} label="Family members" value={members.length} loading={loading} />
        <Stat icon={FileText} label="Records read" value={readCount} loading={loading} />
        <Stat icon={Pill} label="Medicines on record" value={medicineCount} loading={loading} />
        <Stat
          icon={CalendarClock}
          label={overdueCount ? 'Overdue' : 'Due in 30 days'}
          value={overdueCount || dueSoonCount}
          tone={overdueCount ? 'red' : dueSoonCount ? 'due' : 'plain'}
          loading={loading}
        />
      </motion.section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <motion.div variants={rise} initial="hidden" animate="show" className="min-w-0">
          {loading ? <Skeleton className="h-[470px] rounded-2xl" /> : <MonthCalendar today={today} events={events} members={members} colors={colors} />}
        </motion.div>

        <motion.section variants={rise} initial="hidden" animate="show" aria-labelledby="coming-up">
          <Card className="h-full gap-0">
            <SectionHead id="coming-up" title="Coming up" hint={`Next ${LOOKAHEAD_DAYS} days`} />
            {loading && <RowsSkeleton count={4} />}
            {!loading && upcoming.length === 0 && (
              <Empty
                image="/illustrations/empty-calendar.svg"
                title="All clear"
                body="Vaccinations with a next-due date show up here, with a reminder before they're due."
              />
            )}
            {!loading && upcoming.length > 0 && (
              <motion.ul variants={stagger(0.1)} initial="hidden" animate="show" className="px-3">
                {upcoming.slice(0, 6).map((v) => {
                  const leaf = dayLeaf(v.next_due_date!)
                  const overdue = v.days < 0
                  return (
                    <motion.li key={v.id} variants={rise}>
                      <Link
                        href={demo ? '/auth?mode=signup' : `/profile/family/${v.family_member_id}/vaccinations`}
                        className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-muted/70"
                      >
                        <DateLeaf day={leaf.day} month={leaf.month} tone={overdue ? 'red' : v.days <= 30 ? 'due' : 'plain'} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold">{v.vaccine_name}</p>
                          <p className="flex items-center gap-1.5 text-[13.5px] text-ink-3">
                            <span className="size-2 rounded-full" style={{ background: colors[v.family_member_id] }} aria-hidden="true" />
                            {firstName(v.family_member_id)}
                          </p>
                        </div>
                        <Badge variant={overdue ? 'overdue' : v.days <= 30 ? 'due' : 'neutral'}>{dueLabel(v.days)}</Badge>
                      </Link>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </Card>
        </motion.section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <motion.section variants={rise} initial="hidden" animate="show" aria-labelledby="recent-records">
            <Card className="gap-0">
              <SectionHead id="recent-records" title="Recent records" hint="By the date the doctor wrote them" />
              {loading && <RowsSkeleton count={3} />}
              {!loading && records.length === 0 && (
                <Empty
                  image="/illustrations/empty-records.svg"
                  title="No records yet"
                  body="Upload a photo or PDF of a prescription. MediVault reads the doctor, the date and every medicine for you."
                  action={
                    <Button nativeButton={false} render={<Link href={addHref} />}>
                      <Plus aria-hidden="true" /> Add a prescription
                    </Button>
                  }
                />
              )}
              {!loading && records.length > 0 && (
                <motion.ul variants={stagger(0.1)} initial="hidden" animate="show" className="px-3">
                  {records.slice(0, 4).map((r) => (
                    <motion.li key={r.id} variants={rise}>
                      <RecordRow record={r} member={memberById[r.family_member_id]} color={colors[r.family_member_id]} demo={demo} />
                    </motion.li>
                  ))}
                </motion.ul>
              )}
            </Card>
          </motion.section>

          <motion.div variants={rise} initial="hidden" animate="show">
            <QuickAnswers demo={demo} />
          </motion.div>
        </div>

        <motion.section variants={rise} initial="hidden" animate="show" aria-labelledby="family-heading">
          <Card className="gap-0">
            <SectionHead
              id="family-heading"
              title="Family"
              action={
                !demo && (
                  <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/profile?add=1" />}>
                    <Plus aria-hidden="true" /> Add
                  </Button>
                )
              }
            />
            {loading && <RowsSkeleton count={3} />}
            {!loading && members.length === 0 && (
              <Empty
                image="/illustrations/family.svg"
                title="Start with yourself"
                body="Add your own profile, then the people you look after."
                action={<Button nativeButton={false} render={<Link href="/onboarding" />}>Set up your profile</Button>}
              />
            )}
            {!loading && members.length > 0 && (
              <motion.ul variants={stagger(0.12)} initial="hidden" animate="show" className="px-3">
                {[...members]
                  .sort((a, b) => (a.relation?.toLowerCase() === 'self' ? -1 : b.relation?.toLowerCase() === 'self' ? 1 : 0))
                  .map((m) => {
                    const allergies = allergyList(m.allergies)
                    const age = ageFrom(m.dob)
                    const meds = medicinesByMember[m.id]?.size || 0
                    return (
                      <motion.li key={m.id} variants={rise}>
                        <Link
                          href={demo ? '/auth?mode=signup' : `/profile/family/${m.id}`}
                          className="group flex items-start gap-3 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-muted/70"
                        >
                          <MemberAvatar name={m.name} color={colors[m.id]} size={40} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-semibold leading-snug">{m.name}</p>
                            <p className="text-[13.5px] text-ink-3 num">
                              {[relationLabel(m.relation), age !== null ? `${age} yrs` : null].filter(Boolean).join(' · ')}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {m.blood_group && <Badge variant="neutral">{m.blood_group}</Badge>}
                              {allergies.map((a) => (
                                <Badge key={a} variant="overdue">
                                  Allergic: {a}
                                </Badge>
                              ))}
                              <Badge variant="info">
                                {meds} {meds === 1 ? 'medicine' : 'medicines'}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="mt-2.5 size-[18px] text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                        </Link>
                      </motion.li>
                    )
                  })}
              </motion.ul>
            )}
          </Card>
        </motion.section>
      </div>
    </div>
  )
}

function recordTitle(r: MedicalRecord) {
  const type = r.record_type === 'lab_report' ? 'Lab report' : r.record_type === 'other' ? 'Record' : 'Prescription'
  return type
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = 'plain',
  loading,
}: {
  icon: typeof Users
  label: string
  value: number
  tone?: 'plain' | 'red' | 'due'
  loading?: boolean
}) {
  return (
    <motion.div variants={rise}>
      <Card size="sm" className="gap-3 px-(--card-spacing) md:[--card-spacing:--spacing(5)]">
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-medium text-ink-2">{label}</span>
          <span
            className={cn(
              'grid size-8 place-items-center rounded-lg',
              tone === 'red' ? 'bg-red-soft text-red-ink' : tone === 'due' ? 'bg-due-soft text-due-ink' : 'bg-band-soft text-band'
            )}
          >
            <Icon className="size-[17px]" aria-hidden="true" />
          </span>
        </div>
        {loading ? (
          <Skeleton className="h-9 w-14" />
        ) : (
          <p className={cn('font-display text-[38px] font-extrabold leading-none num', tone === 'red' && 'text-red')}>
            <NumberTicker value={value} className={cn(tone === 'red' ? 'text-red' : 'text-ink')} />
          </p>
        )}
      </Card>
    </motion.div>
  )
}

function SectionHead({ id, title, hint, action }: { id: string; title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-(--card-spacing) pb-3">
      <div>
        <h2 id={id} className="font-heading text-[19px] font-bold leading-tight">
          {title}
        </h2>
        {hint && <p className="text-[13.5px] text-ink-3">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

function DateLeaf({ day, month, tone }: { day: string; month: string; tone: 'red' | 'due' | 'plain' }) {
  return (
    <div
      className={cn(
        'flex w-[52px] shrink-0 flex-col items-center overflow-hidden rounded-xl ring-1',
        tone === 'red' ? 'ring-red/25' : tone === 'due' ? 'ring-due/40' : 'ring-line'
      )}
    >
      <span
        className={cn(
          'w-full py-0.5 text-center text-[10.5px] font-bold tracking-[0.06em] text-white',
          tone === 'red' ? 'bg-red' : tone === 'due' ? 'bg-due text-due-ink' : 'bg-band'
        )}
      >
        {month}
      </span>
      <span className={cn('font-display py-1 text-[24px] font-extrabold leading-none num', tone === 'red' && 'text-red')}>{day}</span>
    </div>
  )
}

function RecordRow({ record, member, color, demo }: { record: MedicalRecord; member?: Member; color?: string; demo?: boolean }) {
  const date = record.record_date || record.created_at
  const leaf = dayLeaf(date)
  const meds = record.extracted_data?.medicines?.map((m) => m.name).filter(Boolean) || []
  const where = [record.doctor_name, record.hospital_name].filter(Boolean).join(', ')
  let status: { label: string; variant: 'ok' | 'due' | 'overdue' }
  if (!record.extracted_data) status = { label: 'Reading…', variant: 'due' }
  else if (record.extracted_data.error) status = { label: 'Needs a retry', variant: 'overdue' }
  else status = { label: 'Read', variant: 'ok' }

  return (
    <Link
      href={demo ? '/auth?mode=signup' : `/profile/family/${record.family_member_id}/records/${record.id}`}
      className="flex items-center gap-3.5 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-muted/70"
    >
      <DateLeaf day={leaf.day} month={leaf.month} tone="plain" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {recordTitle(record)}
          {where && <span className="font-normal text-ink-2"> · {where}</span>}
        </p>
        <p className="truncate text-[13.5px] text-ink-3">
          {meds.length ? meds.join(', ') : record.extracted_data?.error ? "The file couldn't be read" : 'No medicines listed'}
          {!record.record_date && ` · uploaded ${formatDay(record.created_at)}`}
        </p>
      </div>
      {member && (
        <span className="hidden sm:flex items-center gap-1.5 text-[13.5px] text-ink-2">
          <span className="size-2 rounded-full" style={{ background: color }} aria-hidden="true" />
          {member.name.split(' ')[0]}
        </span>
      )}
      <Badge variant={status.variant}>{status.label}</Badge>
    </Link>
  )
}

function Empty({ image, title, body, action }: { image: string; title: string; body: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease }}
      className="flex flex-col items-center px-6 pb-7 pt-2 text-center"
    >
      <Image src={image} alt="" width={180} height={135} />
      <p className="mt-3 font-semibold">{title}</p>
      <p className="mt-1 max-w-[34ch] text-[14px] text-ink-3">{body}</p>
      {action && <div className="mt-4">{action}</div>}
    </motion.div>
  )
}

function RowsSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-1 px-(--card-spacing) pb-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3.5 py-3">
          <Skeleton className="h-[52px] w-[52px] rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
