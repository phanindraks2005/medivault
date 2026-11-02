'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, UserPlus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import QuickAnswers from '@/components/QuickAnswers'
import { ageFrom, allergyList, memberColors, relationLabel } from '@/lib/family'
import { dayLeaf, daysFromToday, dueLabel, formatDay, parseDay, startOfToday } from '@/lib/dates'

type Member = {
  id: string
  name: string
  relation: string | null
  dob: string | null
  blood_group: string | null
  allergies: string | null
  created_at: string
}

type Vaccination = {
  id: string
  family_member_id: string
  vaccine_name: string
  date_given: string | null
  next_due_date: string | null
}

type MedicalRecord = {
  id: string
  family_member_id: string
  record_type: string | null
  record_date: string | null
  created_at: string
  doctor_name: string | null
  hospital_name: string | null
  extracted_data: { error?: string; medicines?: { name: string }[] } | null
}

// How far ahead "Coming up" looks. Overdue items always show.
const LOOKAHEAD_DAYS = 60

export default function Dashboard() {
  const [members, setMembers] = useState<Member[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const router = useRouter()

  const load = useCallback(async () => {
    setStatus('loading')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth')
      return
    }
    const [m, v, r] = await Promise.all([
      supabase.from('family_members').select('id, name, relation, dob, blood_group, allergies, created_at').eq('user_id', user.id),
      supabase.from('vaccinations').select('id, family_member_id, vaccine_name, date_given, next_due_date').eq('user_id', user.id),
      supabase
        .from('medical_records')
        .select('id, family_member_id, record_type, record_date, created_at, doctor_name, hospital_name, extracted_data')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (m.error || v.error || r.error) {
      setStatus('error')
      return
    }
    setMembers(m.data || [])
    setVaccinations(v.data || [])
    setRecords(r.data || [])
    setStatus('ready')
  }, [router])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const colors = memberColors(members)
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]))

  const today = startOfToday()
  const monthName = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })

  const comingUp = vaccinations
    .filter((v) => v.next_due_date && daysFromToday(v.next_due_date) <= LOOKAHEAD_DAYS)
    .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
    .sort((a, b) => a.days - b.days)
    .slice(0, 6)

  // Medicines per member, from all of their records that were read.
  const medicinesByMember: Record<string, Set<string>> = {}
  for (const r of records) {
    for (const med of r.extracted_data?.medicines || []) {
      if (!med?.name) continue
      ;(medicinesByMember[r.family_member_id] ||= new Set()).add(med.name.toLowerCase())
    }
  }

  // Events that land on a day of this month, for the dots on the strip.
  const monthEvents: Record<number, { color: string; text: string }[]> = {}
  const addEvent = (date: string | null, memberId: string, text: string) => {
    if (!date) return
    const d = parseDay(date)
    if (d.getFullYear() !== today.getFullYear() || d.getMonth() !== today.getMonth()) return
    const name = memberById[memberId]?.name?.split(' ')[0] || ''
    ;(monthEvents[d.getDate()] ||= []).push({ color: colors[memberId] || 'var(--ink-3)', text: `${text}${name ? ` for ${name}` : ''}` })
  }
  vaccinations.forEach((v) => addEvent(v.next_due_date, v.family_member_id, `${v.vaccine_name} due`))
  records.forEach((r) => addEvent(r.record_date, r.family_member_id, `${r.record_type?.replace('_', ' ') || 'Record'} written`))

  const thisMonthCount = Object.values(monthEvents).reduce((n, list) => n + list.length, 0)
  const latest = records[0]

  return (
    <div className="min-h-screen bg-paper pb-20 md:pb-0">
      <Nav />
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 grid gap-10 lg:gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
        <main className="min-w-0 lg:pr-10 lg:border-r lg:border-rule">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-display text-[40px] md:text-[48px] font-extrabold leading-none tracking-[-0.01em]">{monthName}</h1>
            {status === 'ready' && (
              <p className="text-ink-3">
                {thisMonthCount === 0
                  ? 'Nothing on the calendar this month'
                  : `${thisMonthCount} ${thisMonthCount === 1 ? 'thing' : 'things'} on the calendar this month`}
              </p>
            )}
          </div>

          <MonthStrip today={today} events={monthEvents} />

          {status === 'error' && (
            <div role="alert" className="mt-8 px-4 py-3 rounded-[6px] bg-panel flex flex-wrap items-center gap-3">
              <p className="text-ink-2">Couldn&apos;t load your family&apos;s records. Check your connection.</p>
              <button onClick={load} className="h-9 px-3 rounded-[6px] border border-rule bg-paper font-medium hover:border-band">
                Try again
              </button>
            </div>
          )}

          <section aria-labelledby="coming-up" className="mt-9">
            <h2 id="coming-up" className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink-2 mb-1">
              Coming up
            </h2>
            {status === 'loading' && <RowSkeleton count={2} />}
            {status === 'ready' && comingUp.length === 0 && (
              <p className="mt-2 px-4 py-3 rounded-[6px] bg-panel text-ink-2">
                Nothing due in the next two months. Vaccinations with a next-due date show up here.
              </p>
            )}
            {status === 'ready' && comingUp.length > 0 && (
              <ul>
                {comingUp.map((v) => {
                  const leaf = dayLeaf(v.next_due_date!)
                  const member = memberById[v.family_member_id]
                  const overdue = v.days < 0
                  return (
                    <li key={v.id}>
                      <Link
                        href={`/profile/family/${v.family_member_id}/vaccinations`}
                        className="grid grid-cols-[60px_1fr] md:grid-cols-[84px_1fr_auto] items-center gap-x-4 py-3.5 border-b border-rule-soft hover:bg-panel/60 transition-colors"
                      >
                        <DateLeaf day={leaf.day} month={leaf.month} red={overdue} />
                        <div className="min-w-0">
                          <p className="text-[17px] font-semibold flex items-center gap-2">
                            <MemberChip color={colors[v.family_member_id]} />
                            <span className="truncate">
                              {v.vaccine_name}
                              {member && <span className="font-normal text-ink-2"> · {member.name.split(' ')[0]}</span>}
                            </span>
                          </p>
                          <p className="text-sm text-ink-3 num">
                            {v.date_given ? `Last given ${formatDay(v.date_given)}` : 'No earlier dose recorded'}
                          </p>
                          <span className={`md:hidden inline-block mt-1.5 ${tagClass(overdue)}`}>{dueLabel(v.days)}</span>
                        </div>
                        <span className={`hidden md:inline-block ${tagClass(overdue)}`}>{dueLabel(v.days)}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="latest-record" className="mt-9">
            <h2 id="latest-record" className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink-2 mb-1">
              Latest record
            </h2>
            {status === 'loading' && <RowSkeleton count={1} />}
            {status === 'ready' && !latest && (
              <p className="mt-2 px-4 py-3 rounded-[6px] bg-panel text-ink-2">
                No records yet. Open a family member and upload a prescription photo or PDF. MediVault reads the doctor, date and
                medicines from it.
              </p>
            )}
            {status === 'ready' && latest && <LatestRecord record={latest} member={memberById[latest.family_member_id]} color={colors[latest.family_member_id]} />}
          </section>

          <QuickAnswers />
        </main>

        <aside aria-labelledby="family-heading" className="lg:pl-8">
          <div className="flex items-baseline justify-between mb-1">
            <h2 id="family-heading" className="font-display text-[15px] font-bold uppercase tracking-[0.06em] text-ink-2">
              Family
            </h2>
            <Link href="/profile" className="text-sm font-medium text-band hover:underline underline-offset-4">
              Manage
            </Link>
          </div>
          {status === 'loading' && <RowSkeleton count={3} />}
          {status === 'ready' && members.length === 0 && (
            <div className="mt-2 px-4 py-4 rounded-[6px] bg-panel">
              <p className="text-ink-2">Start with your own profile, then add the people you look after.</p>
              <Link href="/onboarding" className="mt-3 inline-flex items-center gap-2 h-10 px-3.5 rounded-[6px] bg-band text-band-ink font-semibold hover:bg-band-hover">
                <UserPlus size={17} aria-hidden="true" /> Set up your profile
              </Link>
            </div>
          )}
          {status === 'ready' && members.length > 0 && (
            <ul>
              {[...members]
                .sort((a, b) => (a.relation?.toLowerCase() === 'self' ? -1 : b.relation?.toLowerCase() === 'self' ? 1 : a.created_at.localeCompare(b.created_at)))
                .map((m) => {
                  const allergies = allergyList(m.allergies)
                  const age = ageFrom(m.dob)
                  const meds = medicinesByMember[m.id]?.size || 0
                  return (
                    <li key={m.id}>
                      <Link href={`/profile/family/${m.id}`} className="group flex items-start gap-3 py-3.5 border-b border-rule-soft">
                        <MemberChip color={colors[m.id]} className="mt-[7px]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-[17px] font-semibold leading-snug">
                            {m.name} <span className="font-normal text-ink-3">· {relationLabel(m.relation)}</span>
                          </p>
                          <p className="text-sm text-ink-3 num">
                            {[age !== null ? `${age} yrs` : null, m.blood_group].filter(Boolean).join(' · ')}
                            {allergies.length > 0 ? (
                              <span className="text-red-ink font-semibold">
                                {age !== null || m.blood_group ? ' · ' : ''}Allergic to {allergies.join(', ')}
                              </span>
                            ) : null}
                          </p>
                          <p className="text-sm text-ink-2 num">
                            {meds === 0 ? 'No medicines on record' : `${meds} ${meds === 1 ? 'medicine' : 'medicines'} on record`}
                          </p>
                        </div>
                        <ChevronRight size={18} className="mt-1 text-ink-3 group-hover:text-ink transition-colors" aria-hidden="true" />
                      </Link>
                    </li>
                  )
                })}
            </ul>
          )}
          {status === 'ready' && members.length > 0 && (
            <Link
              href="/profile"
              className="mt-5 inline-flex items-center gap-2 h-10 px-3.5 rounded-[6px] border border-rule font-medium hover:border-band transition-colors"
            >
              <UserPlus size={17} aria-hidden="true" /> Add a family member
            </Link>
          )}
        </aside>
      </div>
    </div>
  )
}

function tagClass(overdue: boolean) {
  return `px-2.5 py-1 rounded-[4px] text-[13px] font-semibold whitespace-nowrap num ${
    overdue ? 'bg-red-soft text-red-ink' : 'bg-due-soft text-due-ink'
  }`
}

function MemberChip({ color, className = '' }: { color?: string; className?: string }) {
  return <span aria-hidden="true" className={`inline-block shrink-0 w-2.5 h-2.5 rounded-[2px] ${className}`} style={{ background: color || 'var(--ink-3)' }} />
}

function DateLeaf({ day, month, red = false }: { day: string; month: string; red?: boolean }) {
  return (
    <div className={`font-display font-extrabold text-[40px] md:text-[46px] leading-[0.9] num ${red ? 'text-red' : ''}`}>
      {day}
      <span className="block text-[12px] font-semibold tracking-[0.08em] text-ink-3 mt-1" style={{ fontStretch: '100%' }}>
        {month}
      </span>
    </div>
  )
}

function MonthStrip({ today, events }: { today: Date; events: Record<number, { color: string; text: string }[]> }) {
  const scroller = useRef<HTMLDivElement>(null)
  const todayCell = useRef<HTMLLIElement>(null)
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => new Date(today.getFullYear(), today.getMonth(), i + 1))

  // On a phone the strip scrolls sideways; start it with today in view.
  useLayoutEffect(() => {
    const box = scroller.current
    const cell = todayCell.current
    if (box && cell && box.scrollWidth > box.clientWidth) {
      box.scrollLeft = cell.offsetLeft - box.clientWidth / 2 + cell.clientWidth / 2
    }
  }, [])

  return (
    <div ref={scroller} className="mt-5 -mx-4 px-4 md:mx-0 md:px-0 overflow-x-auto lg:overflow-visible [scrollbar-width:thin]">
      <ol
        className="grid grid-flow-col auto-cols-[46px] lg:auto-cols-fr border-t-2 border-ink border-b border-rule min-w-max lg:min-w-0"
        aria-label="This month"
      >
        {days.map((d) => {
          const n = d.getDate()
          const isToday = n === today.getDate()
          const isSunday = d.getDay() === 0
          const dayEvents = events[n] || []
          const label = `${d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}${
            dayEvents.length ? `: ${dayEvents.map((e) => e.text).join(', ')}` : ''
          }`
          return (
            <li
              key={n}
              ref={isToday ? todayCell : undefined}
              aria-label={label}
              className={`relative h-[70px] px-1.5 pt-1 border-r border-rule-soft last:border-r-0 ${isToday ? 'bg-band text-band-ink' : ''}`}
            >
              <span className={`font-display text-[20px] font-bold num ${isSunday && !isToday ? 'text-red' : ''}`}>{n}</span>
              {isSunday && (
                <span className={`block text-[10px] font-semibold tracking-[0.06em] ${isToday ? 'text-band-ink/80' : 'text-ink-3'}`}>SUN</span>
              )}
              {dayEvents.length > 0 && (
                <span className="absolute left-1.5 bottom-2 flex gap-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <span key={i} className="w-2 h-2 rounded-full ring-1 ring-paper" style={{ background: e.color }} />
                  ))}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

function LatestRecord({ record, member, color }: { record: MedicalRecord; member?: Member; color?: string }) {
  const written = record.record_date
  const leaf = dayLeaf(written || record.created_at)
  const meds = record.extracted_data?.medicines?.map((m) => m.name).filter(Boolean) || []
  const title = [record.doctor_name, record.hospital_name].filter(Boolean).join(', ')
  let detail: string
  if (!record.extracted_data) detail = 'Still being read'
  else if (record.extracted_data.error) detail = "Details couldn't be read from this file"
  else detail = meds.length ? meds.join(' · ') : 'No medicines listed'

  return (
    <Link
      href={`/profile/family/${record.family_member_id}/records/${record.id}`}
      className="grid grid-cols-[60px_1fr] md:grid-cols-[84px_1fr_auto] items-center gap-x-4 py-3.5 border-b border-rule-soft hover:bg-panel/60 transition-colors"
    >
      <DateLeaf day={leaf.day} month={leaf.month} />
      <div className="min-w-0">
        <p className="text-[17px] font-semibold truncate">
          <span className="capitalize">{record.record_type?.replace('_', ' ') || 'Record'}</span>
          {title && <span className="font-normal text-ink-2"> · {title}</span>}
        </p>
        <p className="text-sm text-ink-3 truncate">{detail}</p>
        {!written && <p className="text-sm text-ink-3">Uploaded {formatDay(record.created_at)}, prescription date not read</p>}
      </div>
      {member && (
        <span className="hidden md:flex items-center gap-2 text-sm text-ink-2">
          <MemberChip color={color} /> {member.name.split(' ')[0]}
        </span>
      )}
    </Link>
  )
}

function RowSkeleton({ count }: { count: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-4 py-4 border-b border-rule-soft">
          <div className="w-12 h-10 rounded-[4px] bg-rule-soft animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 rounded-[4px] bg-rule-soft animate-pulse" />
            <div className="h-3 w-1/3 rounded-[4px] bg-rule-soft animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  )
}
