'use client'

import { Suspense, use, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, CreditCard, FlaskConical, Loader2, Pencil, Phone, Plus, RotateCw, Sparkles, Syringe, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { OFFLINE_MESSAGE, isOffline, saveError, supabase } from '@/lib/supabase'
import { aiMessage, askAi } from '@/lib/ai-client'
import { useFamily } from '@/lib/family-context'
import { ageFrom, allergyList, relationLabel } from '@/lib/family'
import { dayLeaf, daysFromToday, dueLabel, formatDay } from '@/lib/dates'
import { Button, ButtonLink } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import MemberAvatar from '@/components/app/MemberAvatar'
import DateLeaf from '@/components/app/DateLeaf'
import MemberForm, { toRow, type MemberValues } from '@/components/app/MemberForm'
import UploadRecordDialog from '@/components/app/UploadRecordDialog'
import { EmptyLine, ErrorLine, Page, PageHeader, Panel, PanelHead, RowsSkeleton, rowCard } from '@/components/app/kit'
import type { MedicalRecord, Vaccination } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'

type FullMember = {
  id: string
  name: string
  relation: string | null
  dob: string | null
  gender: string | null
  blood_group: string | null
  allergies: string | null
  known_conditions: string | null
  height_cm: number | null
  weight_kg: number | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

type Summary = { overview: string; timeline?: { date: string; summary: string }[]; key_takeaway?: string | null; disclaimer?: string | null }

export default function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <Suspense>
      <Member id={id} />
    </Suspense>
  )
}

function recordTitle(r: MedicalRecord) {
  return r.record_type === 'lab_report' ? 'Lab report' : r.record_type === 'other' ? 'Record' : 'Prescription'
}

// Newest first by the date the doctor wrote it; undated uploads fall back to the upload date.
const byDoctorDate = (a: MedicalRecord, b: MedicalRecord) => (b.record_date || b.created_at).localeCompare(a.record_date || a.created_at)

function Member({ id }: { id: string }) {
  const router = useRouter()
  const params = useSearchParams()
  const family = useFamily()
  const color = family.colors[id] || '#5b6b7f'

  const [member, setMember] = useState<FullMember | null>(null)
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading')
  const [editing, setEditing] = useState(false)
  const [uploading, setUploading] = useState(params.get('upload') === '1')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [summaryState, setSummaryState] = useState<'idle' | 'busy' | 'error'>('idle')
  const [summaryError, setSummaryError] = useState('')

  const loadRecords = useCallback(async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('id, family_member_id, record_type, record_date, created_at, doctor_name, hospital_name, extracted_data, file_url')
      .eq('family_member_id', id)
    if (!error) setRecords(((data || []) as MedicalRecord[]).sort(byDoctorDate))
    return !error
  }, [id])

  const load = useCallback(async () => {
    setStatus('loading')
    const [m, v, ok] = await Promise.all([
      supabase.from('family_members').select('*').eq('id', id).maybeSingle(),
      supabase.from('vaccinations').select('id, family_member_id, vaccine_name, date_given, next_due_date').eq('family_member_id', id),
      loadRecords(),
    ])
    if (m.error || v.error || !ok) return setStatus('error')
    if (!m.data) return setStatus('missing')
    setMember(m.data)
    setVaccinations(v.data || [])
    setStatus('ready')
  }, [id, loadRecords])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // While anything is still being read, check again every few seconds.
  const pending = records.some((r) => !r.extracted_data)
  useEffect(() => {
    if (!pending) return
    const t = setInterval(loadRecords, 4000)
    return () => clearInterval(t)
  }, [pending, loadRecords])

  const setUploadOpen = (open: boolean) => {
    setUploading(open)
    if (!open && params.get('upload')) router.replace(`/profile/family/${id}`)
  }

  const isSelf = member?.relation?.toLowerCase() === 'self'
  const first = member?.name.split(' ')[0] || ''
  const allergies = allergyList(member?.allergies)
  const conditions = allergyList(member?.known_conditions)

  // Current medicines: each name once, from the most recent record that lists it.
  const medicines: { name: string; dosage?: string | null; frequency?: string | null; date: string; recordId: string }[] = []
  const seen = new Set<string>()
  for (const r of records) {
    for (const m of r.extracted_data?.medicines || []) {
      const key = m?.name?.toLowerCase()
      if (!key || seen.has(key)) continue
      seen.add(key)
      medicines.push({ ...m, date: r.record_date || r.created_at, recordId: r.id })
    }
  }

  const upcoming = vaccinations
    .filter((v) => v.next_due_date)
    .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
    .sort((a, b) => a.days - b.days)

  const generateSummary = async () => {
    const usable = records
      .filter((r) => r.extracted_data && !r.extracted_data.error)
      .map((r) => ({
        record_type: r.record_type,
        date: formatDay(r.record_date || r.created_at),
        doctor: r.doctor_name,
        hospital: r.hospital_name,
        medicines: r.extracted_data?.medicines,
        notes: r.extracted_data?.notes,
      }))
    if (!usable.length) {
      setSummaryState('error')
      return setSummaryError('There are no read records to summarise yet.')
    }
    setSummaryState('busy')
    setSummaryError('')
    try {
      setSummary(await askAi<Summary>('visit-summary', { memberName: member?.name, records: usable }))
      setSummaryState('idle')
    } catch (e) {
      setSummaryState('error')
      setSummaryError(aiMessage(e))
    }
  }

  const remove = async () => {
    if (isOffline()) return toast.error(OFFLINE_MESSAGE)
    setDeleting(true)
    // Remove their files too, so nothing is left behind in storage.
    const files = (records as (MedicalRecord & { file_url?: string | null })[]).map((r) => r.file_url).filter(Boolean) as string[]
    if (files.length) await supabase.storage.from('medical-records').remove(files)
    const { error } = await supabase.from('family_members').delete().eq('id', id)
    setDeleting(false)
    if (error) return toast.error(saveError(`Couldn't delete ${first}. Try again.`))
    await family.reload()
    toast.success(`${member?.name} deleted`)
    router.push('/profile')
  }

  if (status === 'missing') {
    return (
      <Page>
        <PageHeader title="Not found" back={{ href: '/profile', label: 'Family' }} sub="This family member doesn't exist or was deleted." />
      </Page>
    )
  }

  const meta = member
    ? [
        relationLabel(member.relation),
        ageFrom(member.dob) !== null ? `${ageFrom(member.dob)} yrs` : null,
        member.gender,
        member.height_cm ? `${member.height_cm} cm` : null,
        member.weight_kg ? `${member.weight_kg} kg` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : ''

  const initial: MemberValues | undefined = member
    ? {
        name: member.name || '',
        relation: member.relation || '',
        dob: member.dob || '',
        gender: member.gender || '',
        blood_group: member.blood_group || '',
        allergies: member.allergies || '',
        known_conditions: member.known_conditions || '',
        height_cm: member.height_cm?.toString() || '',
        weight_kg: member.weight_kg?.toString() || '',
        emergency_contact_name: member.emergency_contact_name || '',
        emergency_contact_phone: member.emergency_contact_phone || '',
      }
    : undefined

  return (
    <Page>
      <PageHeader
        back={{ href: '/profile', label: 'Family' }}
        lead={member ? <MemberAvatar name={member.name} color={color} size={56} /> : <Skeleton className="size-14 rounded-full" />}
        title={member ? member.name : <Skeleton className="h-8 w-56" />}
        sub={member ? meta || relationLabel(member.relation) : 'Loading…'}
        actions={
          member && (
            <>
              <ButtonLink variant="outline" href={`/profile/family/${id}/emergency`}>
                <CreditCard aria-hidden="true" /> Emergency card
              </ButtonLink>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
              <Button onClick={() => setUploadOpen(true)}>
                <Plus aria-hidden="true" /> Add a record
              </Button>
            </>
          )
        }
      />

      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load {first || 'this person'}&apos;s records. Check your connection.</ErrorLine>}

      {/* The facts someone would ask for first */}
      <section aria-label="Health basics" className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Fact label="Blood group">
          {member ? (
            <p className={cn('font-display text-[40px] font-bold leading-none num', !member.blood_group && 'text-line-strong')}>{member.blood_group || '—'}</p>
          ) : (
            <Skeleton className="h-9 w-14" />
          )}
        </Fact>
        <Fact label="Allergies">
          {member ? (
            allergies.length ? (
              <div className="flex flex-wrap gap-1.5">
                {allergies.map((a) => (
                  <Badge key={a} variant="overdue">
                    {a}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-[15px] text-ink-2">None known</p>
            )
          ) : (
            <Skeleton className="h-6 w-24" />
          )}
        </Fact>
        <Fact label="Known conditions">
          {member ? (
            conditions.length ? <p className="text-[15px]">{conditions.join(', ')}</p> : <p className="text-[15px] text-ink-2">None noted</p>
          ) : (
            <Skeleton className="h-5 w-28" />
          )}
        </Fact>
        <Fact label="Emergency contact">
          {member ? (
            member.emergency_contact_name || member.emergency_contact_phone ? (
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{member.emergency_contact_name || 'Contact'}</p>
                {member.emergency_contact_phone && (
                  <a
                    href={`tel:${member.emergency_contact_phone.replace(/\s+/g, '')}`}
                    className="inline-flex items-center gap-1.5 text-[15px] text-band underline-offset-4 hover:underline num"
                  >
                    <Phone className="size-3.5" aria-hidden="true" /> {member.emergency_contact_phone}
                  </a>
                )}
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-left text-[15px] text-band underline-offset-4 hover:underline">
                Add one
              </button>
            )
          ) : (
            <Skeleton className="h-5 w-28" />
          )}
        </Fact>
      </section>

      <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <Panel labelledBy="meds" className="lg:col-span-6">
          <PanelHead id="meds" title="Current medicines" count={status === 'ready' ? medicines.length : undefined} hint="From the latest record that lists each one" />
          {status === 'loading' && <RowsSkeleton count={3} height={56} />}
          {status === 'ready' && medicines.length === 0 && <EmptyLine>Medicines appear here once a prescription has been read.</EmptyLine>}
          {status === 'ready' && medicines.length > 0 && (
            <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
              {medicines.slice(0, 6).map((m, i) => (
                <li key={m.name} className={cn('flex items-center gap-3 px-3.5 py-3', i > 0 && 'border-t border-line')}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-medium">
                      {m.name} {m.dosage && <span className="font-normal text-ink-2 num">{m.dosage}</span>}
                    </p>
                    {m.frequency && <p className="truncate text-[13px] text-ink-3">{m.frequency}</p>}
                  </div>
                  <span className="shrink-0 text-[13px] text-ink-3 num">{formatDay(m.date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel labelledBy="vax" className="flex flex-col lg:col-span-6">
          <PanelHead
            id="vax"
            title="Vaccinations"
            count={status === 'ready' ? vaccinations.length : undefined}
            hint="Next due first"
            action={
              <ButtonLink variant="ghost" size="sm" href={`/profile/family/${id}/vaccinations`}>
                Manage <ChevronRight aria-hidden="true" />
              </ButtonLink>
            }
          />
          {status === 'loading' && <RowsSkeleton count={3} />}
          {status === 'ready' && upcoming.length === 0 && <EmptyLine>No vaccinations with a due date yet.</EmptyLine>}
          {status === 'ready' && upcoming.length > 0 && (
            <ul className="mt-3 space-y-2">
              {upcoming.slice(0, 3).map((v) => {
                const tone = v.days < 0 ? 'red' : v.days <= 30 ? 'due' : 'plain'
                return (
                  <li key={v.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-2.5">
                    <DateLeaf {...dayLeaf(v.next_due_date!)} tone={tone} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium">{v.vaccine_name}</p>
                      <p className={cn('text-[13px] font-medium sm:hidden num', tone === 'red' ? 'text-red-ink' : tone === 'due' ? 'text-due-ink' : 'text-ink-3')}>
                        {dueLabel(v.days)}
                      </p>
                    </div>
                    <Badge variant={tone === 'red' ? 'overdue' : tone === 'due' ? 'due' : 'neutral'} className="hidden sm:inline-flex">
                      {dueLabel(v.days)}
                    </Badge>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel labelledBy="records" className="lg:col-span-9">
          <PanelHead id="records" title="Records" count={status === 'ready' ? records.length : undefined} hint="By the date the doctor wrote them" />
          {status === 'loading' && <RowsSkeleton count={4} />}
          {status === 'ready' && records.length === 0 && (
            <EmptyLine
              action={
                <Button size="sm" onClick={() => setUploadOpen(true)}>
                  <Plus aria-hidden="true" /> Add a record
                </Button>
              }
            >
              No records for {first} yet. Upload a photo or PDF of a prescription or lab report.
            </EmptyLine>
          )}
          {status === 'ready' && records.length > 0 && (
            <ul className="mt-3 space-y-2">
              {records.map((r) => {
                const meds = r.extracted_data?.medicines?.map((m) => m.name).filter(Boolean) || []
                const st = !r.extracted_data
                  ? { label: 'Reading…', variant: 'due' as const }
                  : r.extracted_data.error
                    ? { label: 'Needs a retry', variant: 'overdue' as const }
                    : { label: 'Read', variant: 'ok' as const }
                return (
                  <li key={r.id}>
                    <Link href={`/profile/family/${id}/records/${r.id}`} className={cn(rowCard, 'flex min-h-[72px] items-center gap-3 px-3 py-2.5')}>
                      <DateLeaf {...dayLeaf(r.record_date || r.created_at)} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[14px] font-medium">
                          {recordTitle(r)}
                          {(r.doctor_name || r.hospital_name) && (
                            <span className="font-normal text-ink-2"> · {[r.doctor_name, r.hospital_name].filter(Boolean).join(', ')}</span>
                          )}
                        </p>
                        <p className="truncate text-[13px] text-ink-3">
                          {meds.length ? meds.join(', ') : r.extracted_data?.error ? "The file couldn't be read" : r.extracted_data ? 'No medicines listed' : 'Reading the file…'}
                          {!r.record_date && ` · uploaded ${formatDay(r.created_at)}`}
                        </p>
                      </div>
                      <Badge variant={st.variant}>
                        {st.label === 'Reading…' && <Loader2 className="animate-spin" aria-hidden="true" />}
                        {st.label}
                      </Badge>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel labelledBy="tools" className="lg:col-span-3">
          <PanelHead id="tools" title={`For ${first || 'them'}`} />
          <ul className="mt-3 space-y-2">
            {[
              { href: `/profile/family/${id}/emergency`, label: 'Emergency card', hint: 'Show or print', icon: CreditCard },
              { href: `/profile/family/${id}/vaccinations`, label: 'Vaccinations', hint: 'Doses and due dates', icon: Syringe },
              { href: `/profile/family/${id}/interactions`, label: 'Interaction check', hint: 'Before a new medicine', icon: FlaskConical },
            ].map((t) => (
              <li key={t.href}>
                <Link href={t.href} className={cn(rowCard, 'group flex items-center gap-3 px-3 py-3')}>
                  <t.icon className="size-[18px] shrink-0 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium">{t.label}</span>
                    <span className="block text-[13px] text-ink-3">{t.hint}</span>
                  </span>
                  <ChevronRight className="size-4 text-ink-3 transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel labelledBy="summary" className="lg:col-span-12">
          <PanelHead
            id="summary"
            title="Visit summary"
            hint="A short history to read out at the next appointment"
            action={
              <Button variant="outline" size="sm" onClick={generateSummary} disabled={summaryState === 'busy' || status !== 'ready'}>
                {summaryState === 'busy' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
                {summaryState === 'busy' ? 'Writing…' : summary ? 'Write again' : 'Write a summary'}
              </Button>
            }
          />
          <div aria-live="polite">
            {summaryState === 'busy' && <p className="mt-3 text-[14px] text-ink-3">This can take up to half a minute when the service is busy.</p>}
            {summaryState === 'error' && (
              <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <p className="min-w-0 flex-1 text-[15px] text-ink-2">{summaryError}</p>
                <Button size="sm" variant="outline" onClick={generateSummary}>
                  <RotateCw aria-hidden="true" /> Try again
                </Button>
              </div>
            )}
            {summary && summaryState !== 'busy' && (
              <div className="mt-3 grid gap-4 rounded-lg border border-line bg-surface p-5 lg:grid-cols-[1.2fr_1fr]">
                <div>
                  <p className="text-[16px] leading-relaxed">{summary.overview}</p>
                  {summary.key_takeaway && (
                    <p className="mt-4 rounded-lg bg-due-soft px-4 py-3 text-[15px] text-due-ink">
                      <span className="font-semibold">Worth mentioning: </span>
                      {summary.key_takeaway}
                    </p>
                  )}
                  {summary.disclaimer && <p className="mt-3 text-[13px] text-ink-3">{summary.disclaimer}</p>}
                </div>
                {!!summary.timeline?.length && (
                  <ol className="space-y-3">
                    {summary.timeline.map((t, i) => (
                      <li key={i} className="grid grid-cols-[96px_1fr] gap-3 text-[14px]">
                        <span className="text-ink-3 num">{t.date}</span>
                        <span>{t.summary}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </div>
        </Panel>
      </div>

      {member && !isSelf && (
        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-5 py-4">
          <p className="text-[14px] text-ink-2">Deleting {first} removes their records, vaccinations and uploaded files.</p>
          <Button variant="destructive" size="sm" onClick={() => setConfirmDelete(true)}>
            <Trash2 aria-hidden="true" /> Delete {first}
          </Button>
        </div>
      )}

      {member && (
        <>
          <Dialog open={editing} onOpenChange={setEditing}>
            <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>Edit {first}</DialogTitle>
                <DialogDescription>Changes show on the emergency card straight away.</DialogDescription>
              </DialogHeader>
              <MemberForm
                initial={initial}
                isSelf={isSelf}
                submitLabel="Save changes"
                busyLabel="Saving…"
                onCancel={() => setEditing(false)}
                onSubmit={async (values) => {
                  const row = toRow(values)
                  const { error } = await supabase
                    .from('family_members')
                    .update(isSelf ? { ...row, relation: 'self' } : row)
                    .eq('id', id)
                  if (error) return saveError("Couldn't save. Try again.")
                  setEditing(false)
                  toast.success('Saved')
                  load()
                  family.reload()
                  return null
                }}
              />
            </DialogContent>
          </Dialog>

          <UploadRecordDialog memberId={id} memberName={member.name} open={uploading} onOpenChange={setUploadOpen} onUploaded={loadRecords} />

          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Their {records.length} {records.length === 1 ? 'record' : 'records'}, vaccinations and uploaded files are deleted too. This can&apos;t be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Keep {first}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={remove} disabled={deleting}>
                  {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
                  {deleting ? 'Deleting…' : `Delete ${first}`}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </Page>
  )
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[112px] min-w-0 flex-col gap-2 rounded-xl bg-canvas p-4">
      <p className="text-[14px] text-ink-2">{label}</p>
      <div className="mt-auto min-w-0">{children}</div>
    </div>
  )
}

