'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink, FileText, Loader2, Pencil, Plus, RotateCw, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, authHeaders } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import { dayLeaf, formatDay } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
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
import DateLeaf from '@/components/app/DateLeaf'
import { EmptyLine, ErrorLine, Field, Page, PageHeader, Panel, PanelHead } from '@/components/app/kit'
import type { Medicine } from '@/components/dashboard/types'
import { cn } from '@/lib/utils'

type RecordRow = {
  id: string
  record_type: string | null
  record_date: string | null
  created_at: string
  doctor_name: string | null
  hospital_name: string | null
  file_url: string | null
  extracted_data: { error?: string; medicines?: Medicine[]; notes?: string | null; record_date?: string | null } | null
}

// Extraction normally finishes within a minute. Past this, a record still
// without details almost certainly had its request lost, so offer a retry.
const STUCK_AFTER_MS = 2 * 60 * 1000

const TYPES = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'other', label: 'Other' },
]
const typeLabel = (t: string | null) => TYPES.find((x) => x.value === t)?.label || 'Prescription'

export default function RecordPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = use(params)
  const router = useRouter()
  const { members } = useFamily()
  const member = members.find((m) => m.id === id)
  const first = member?.name.split(' ')[0] || 'Records'

  const [record, setRecord] = useState<RecordRow | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error' | 'missing'>('loading')
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [fileFailed, setFileFailed] = useState(false)
  const [now, setNow] = useState(0)
  const [retrying, setRetrying] = useState(false)
  const [retryError, setRetryError] = useState('')
  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('id, record_type, record_date, created_at, doctor_name, hospital_name, file_url, extracted_data')
      .eq('id', recordId)
      .maybeSingle()
    setNow(Date.now())
    if (error) return setStatus('error')
    if (!data) return setStatus('missing')
    setRecord(data)
    setStatus('ready')
  }, [recordId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // The bucket is private: a short-lived signed link shows the original file.
  useEffect(() => {
    if (!record?.file_url) return
    supabase.storage
      .from('medical-records')
      .createSignedUrl(record.file_url, 60 * 30)
      .then(({ data }) => setFileUrl(data?.signedUrl || null))
  }, [record?.file_url])

  const reading = status === 'ready' && !record?.extracted_data
  useEffect(() => {
    if (!reading) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [reading, load])

  const retry = async () => {
    setRetrying(true)
    setRetryError('')
    try {
      const res = await fetch('/api/extract-record', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ recordId }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.error) setRetryError(data.error || 'The reading service is busy. Try again in a minute.')
    } catch {
      setRetryError('Something went wrong. Check your connection and try again.')
    }
    await load()
    setRetrying(false)
  }

  const remove = async () => {
    setDeleting(true)
    if (record?.file_url) await supabase.storage.from('medical-records').remove([record.file_url])
    const { error } = await supabase.from('medical_records').delete().eq('id', recordId)
    setDeleting(false)
    if (error) return toast.error("Couldn't delete the record. Try again.")
    toast.success('Record deleted')
    router.push(`/profile/family/${id}`)
  }

  if (status === 'missing') {
    return (
      <Page>
        <PageHeader back={{ href: `/profile/family/${id}`, label: first }} title="Record not found" sub="It may have been deleted." />
      </Page>
    )
  }

  const x = record?.extracted_data
  const stuck = reading && record && now - new Date(record.created_at).getTime() > STUCK_AFTER_MS
  const date = record ? record.record_date || record.created_at : null
  const isPdf = record?.file_url?.toLowerCase().endsWith('.pdf')

  return (
    <Page>
      <PageHeader
        back={{ href: `/profile/family/${id}`, label: first }}
        lead={date ? <DateLeaf {...dayLeaf(date)} size="lg" /> : <Skeleton className="h-[62px] w-[60px] rounded-[10px]" />}
        title={record ? typeLabel(record.record_type) : <Skeleton className="h-8 w-40" />}
        sub={
          record ? (
            <>
              {[record.doctor_name, record.hospital_name].filter(Boolean).join(', ') || 'Doctor not known'}
              {member && <> · for {member.name.split(' ')[0]}</>}
              <span className="block text-[14px] text-ink-3 num">
                {record.record_date ? `Written ${formatDay(record.record_date)}` : 'Date not read'} · uploaded {formatDay(record.created_at)}
              </span>
            </>
          ) : (
            'Loading…'
          )
        }
        actions={
          record &&
          !editing && (
            <>
              <Button variant="outline" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" /> Edit
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(true)} className="text-red-ink hover:bg-red-soft hover:text-red-ink">
                <Trash2 aria-hidden="true" /> Delete
              </Button>
            </>
          )
        }
      />

      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load this record. Check your connection and try again.</ErrorLine>}

      {record && editing ? (
        <EditRecord
          record={record}
          onCancel={() => setEditing(false)}
          onSaved={() => {
            setEditing(false)
            toast.success('Saved')
            load()
          }}
        />
      ) : (
        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-7">
            {(reading || x?.error) && (
              <div role="status" className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-5 py-4">
                {reading && !stuck && <Loader2 className="size-5 animate-spin text-band" aria-hidden="true" />}
                <p className="min-w-0 flex-1 text-[15px]">
                  {reading && !stuck && 'Reading the file. This usually takes under a minute…'}
                  {stuck && "Details from this file haven't come through yet."}
                  {x?.error === 'not a medical document' && "This doesn't look like a prescription or report, so nothing was read from it."}
                  {x?.error && x.error !== 'not a medical document' && "Couldn't read the details from this file."}
                </p>
                {(stuck || x?.error) && (
                  <Button size="sm" variant="outline" onClick={retry} disabled={retrying}>
                    {retrying ? <Loader2 className="animate-spin" aria-hidden="true" /> : <RotateCw aria-hidden="true" />}
                    {retrying ? 'Reading…' : 'Try again'}
                  </Button>
                )}
                {retryError && (
                  <p role="alert" className="w-full text-[14px] text-red-ink">
                    {retryError}
                  </p>
                )}
              </div>
            )}

            <Panel labelledBy="medicines">
              <PanelHead id="medicines" title="Medicines" count={x && !x.error ? x.medicines?.length || 0 : undefined} hint="As read from the file. Edit anything that's wrong." />
              {status === 'loading' && <Skeleton className="mt-3 h-40 rounded-lg" />}
              {status === 'ready' && x && !x.error && !x.medicines?.length && <EmptyLine>No medicines were listed on this record.</EmptyLine>}
              {!!x?.medicines?.length && !x.error && (
                <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-surface">
                  <table className="w-full text-left text-[15px]">
                    <thead>
                      <tr className="border-b border-line text-[13px] text-ink-3">
                        <th scope="col" className="px-4 py-2.5 font-medium">Medicine</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">Dose</th>
                        <th scope="col" className="px-4 py-2.5 font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {x.medicines.map((m, i) => (
                        <tr key={i} className={cn(i > 0 && 'border-t border-line')}>
                          <td className="px-4 py-3 font-medium">{m.name}</td>
                          <td className="whitespace-nowrap px-4 py-3 text-ink-2 num">{m.dosage || <span className="text-ink-3">—</span>}</td>
                          <td className="px-4 py-3 text-ink-2">{m.frequency || <span className="text-ink-3">—</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            {x?.notes && (
              <Panel labelledBy="notes">
                <PanelHead id="notes" title="Doctor's notes" />
                <p className="mt-3 rounded-lg border border-line bg-surface p-4 text-[15px] leading-relaxed">{x.notes}</p>
              </Panel>
            )}
          </div>

          <Panel labelledBy="file" className="lg:col-span-5">
            <PanelHead
              id="file"
              title="Original file"
              action={
                fileUrl && (
                  <Button variant="ghost" size="sm" nativeButton={false} render={<a href={fileUrl} target="_blank" rel="noreferrer" />}>
                    Open <ExternalLink aria-hidden="true" />
                  </Button>
                )
              }
            />
            <div className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
              {!record?.file_url ? (
                <p className="p-4 text-[14px] text-ink-3">No file attached.</p>
              ) : !fileUrl ? (
                <Skeleton className="aspect-[3/4] w-full rounded-none" />
              ) : isPdf || fileFailed ? (
                <a href={fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 text-[15px] font-medium text-band hover:underline">
                  <FileText className="size-5" aria-hidden="true" /> {fileFailed ? "Couldn't show a preview. Open the file" : 'Open the PDF'}
                </a>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- signed URL from a private bucket, not optimisable
                <img src={fileUrl} alt={`The uploaded ${typeLabel(record.record_type).toLowerCase()}`} className="max-h-[640px] w-full object-contain" onError={() => setFileFailed(true)} />
              )}
            </div>
          </Panel>
        </div>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this record?</AlertDialogTitle>
            <AlertDialogDescription>The uploaded file and everything read from it are deleted. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove} disabled={deleting}>
              {deleting && <Loader2 className="animate-spin" aria-hidden="true" />}
              {deleting ? 'Deleting…' : 'Delete record'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

function EditRecord({ record, onCancel, onSaved }: { record: RecordRow; onCancel: () => void; onSaved: () => void }) {
  const [type, setType] = useState(record.record_type || 'prescription')
  const [doctor, setDoctor] = useState(record.doctor_name || '')
  const [clinic, setClinic] = useState(record.hospital_name || '')
  const [date, setDate] = useState(record.record_date?.slice(0, 10) || '')
  const [notes, setNotes] = useState(record.extracted_data?.notes || '')
  const [meds, setMeds] = useState<Medicine[]>(record.extracted_data?.medicines?.length ? record.extracted_data.medicines : [{ name: '', dosage: '', frequency: '' }])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const setMed = (i: number, k: keyof Medicine, v: string) => setMeds((list) => list.map((m, j) => (j === i ? { ...m, [k]: v } : m)))

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    const base = record.extracted_data && !record.extracted_data.error ? record.extracted_data : {}
    const { error } = await supabase
      .from('medical_records')
      .update({
        record_type: type,
        doctor_name: doctor.trim() || null,
        hospital_name: clinic.trim() || null,
        record_date: date || null,
        extracted_data: { ...base, medicines: meds.filter((m) => m.name?.trim()), notes: notes.trim() || null },
      })
      .eq('id', record.id)
    setBusy(false)
    if (error) return setError("Couldn't save. Check your connection and try again.")
    onSaved()
  }

  return (
    <form onSubmit={save} className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
      <Panel labelledBy="edit-details" className="lg:col-span-5">
        <PanelHead id="edit-details" title="Details" />
        <div className="mt-4 grid gap-4">
          <div>
            <p id="edit-type" className="mb-2 text-[14px] font-medium text-ink-2">
              Type
            </p>
            <div role="radiogroup" aria-labelledby="edit-type" className="grid grid-cols-3 gap-1 rounded-full bg-[#e6ebf1] p-1">
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={type === t.value}
                  onClick={() => setType(t.value)}
                  className={cn(
                    'h-9 rounded-full text-[14px] transition-[background-color,color,box-shadow] duration-150',
                    type === t.value ? 'bg-surface font-medium text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:text-ink'
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <Field id="r-date" label="Date the doctor wrote it">
            <Input id="r-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field id="r-doctor" label="Doctor">
            <Input id="r-doctor" autoComplete="off" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
          </Field>
          <Field id="r-clinic" label="Clinic or hospital">
            <Input id="r-clinic" autoComplete="off" value={clinic} onChange={(e) => setClinic(e.target.value)} />
          </Field>
          <Field id="r-notes" label="Notes">
            <Textarea id="r-notes" rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
      </Panel>

      <Panel labelledBy="edit-meds" className="lg:col-span-7">
        <PanelHead id="edit-meds" title="Medicines" count={meds.filter((m) => m.name?.trim()).length} />
        <ul className="mt-3 space-y-2">
          {meds.map((m, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-lg border border-line bg-surface p-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
              <Input aria-label={`Medicine ${i + 1} name`} placeholder="Name…" value={m.name || ''} onChange={(e) => setMed(i, 'name', e.target.value)} className="col-span-1" />
              <Input aria-label={`Medicine ${i + 1} dose`} placeholder="Dose…" value={m.dosage || ''} onChange={(e) => setMed(i, 'dosage', e.target.value)} className="order-3 sm:order-none" />
              <Input aria-label={`Medicine ${i + 1} timing`} placeholder="When…" value={m.frequency || ''} onChange={(e) => setMed(i, 'frequency', e.target.value)} className="order-4 sm:order-none" />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${m.name || `medicine ${i + 1}`}`}
                onClick={() => setMeds((list) => list.filter((_, j) => j !== i))}
                className="order-2 sm:order-none"
              >
                <X aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setMeds((list) => [...list, { name: '', dosage: '', frequency: '' }])}>
          <Plus aria-hidden="true" /> Add a medicine
        </Button>
      </Panel>

      {error && (
        <p role="alert" className="rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink lg:col-span-12">
          {error}
        </p>
      )}
      <div className="flex justify-end gap-2 lg:col-span-12">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {busy ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </form>
  )
}
