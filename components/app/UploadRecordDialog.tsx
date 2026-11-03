'use client'

import { useId, useState } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { aiMessage, askAi } from '@/lib/ai-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, Segmented } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { LIMITS } from '@/lib/limits'

// The bucket accepts exactly these; anything else would fail after upload.
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf'
const MAX_BYTES = 10 * 1024 * 1024
const TYPES = [
  { value: 'prescription', label: 'Prescription' },
  { value: 'lab_report', label: 'Lab report' },
  { value: 'other', label: 'Other' },
]

export default function UploadRecordDialog({
  memberId,
  memberName,
  open,
  onOpenChange,
  onUploaded,
}: {
  memberId: string
  memberName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: () => void
}) {
  const id = useId()
  const [type, setType] = useState('prescription')
  const [doctor, setDoctor] = useState('')
  const [clinic, setClinic] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const pick = (f: File | null | undefined) => {
    setError('')
    if (!f) return
    if (!ACCEPT.split(',').includes(f.type)) return setError('Use a photo (JPEG, PNG, WebP or HEIC) or a PDF.')
    if (f.size > MAX_BYTES) return setError('That file is over 10 MB. Try a smaller photo or a compressed PDF.')
    setFile(f)
  }

  const reset = () => {
    setType('prescription')
    setDoctor('')
    setClinic('')
    setFile(null)
    setError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return setError('Choose a photo or PDF first.')
    setBusy(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setBusy(false)
      return setError('Your session has ended. Log in again.')
    }
    const path = `${user.id}/${Date.now()}_${file.name.replace(/[^\w.-]+/g, '_')}`
    const up = await supabase.storage.from('medical-records').upload(path, file, { contentType: file.type })
    if (up.error) {
      setBusy(false)
      return setError("Couldn't upload the file. Check your connection and try again.")
    }
    const { data: row, error: insertError } = await supabase
      .from('medical_records')
      .insert({
        user_id: user.id,
        family_member_id: memberId,
        record_type: type,
        file_url: path,
        doctor_name: doctor.trim() || null,
        hospital_name: clinic.trim() || null,
      })
      .select('id')
      .single()
    if (insertError || !row) {
      await supabase.storage.from('medical-records').remove([path])
      setBusy(false)
      return setError("Couldn't save the record. Try again.")
    }
    // Reading runs in the background; the list shows "Reading…" until it lands.
    askAi('extract-record', { recordId: row.id })
      .catch((e) => toast.error(`Couldn't read that file. ${aiMessage(e)}`, { description: 'Open the record to try again.' }))
      .finally(onUploaded)
    toast.success('Uploaded. Reading it now…')
    setBusy(false)
    reset()
    onOpenChange(false)
    onUploaded()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !busy) reset()
        if (!busy) onOpenChange(o)
      }}
    >
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Add a record for {memberName.split(' ')[0]}</DialogTitle>
          <DialogDescription>MediVault reads the doctor, the date and every medicine from it.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div>
            <p className="mb-2 text-[14px] font-medium text-ink-2">Type</p>
            <Segmented label="Type of record" options={TYPES} value={type} onChange={setType} />
          </div>

          <label
            htmlFor={`${id}-file`}
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragging(false)
              pick(e.dataTransfer.files?.[0])
            }}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-7 text-center transition-colors duration-150 focus-within:border-band focus-within:ring-3 focus-within:ring-band/20',
              dragging ? 'border-band bg-band-soft' : 'border-line-strong bg-canvas hover:border-ink-3'
            )}
          >
            <FileUp className="size-6 text-ink-3" aria-hidden="true" />
            {file ? (
              <span className="max-w-full truncate text-[15px] font-medium">{file.name}</span>
            ) : (
              <span className="text-[15px] font-medium">Choose a photo or PDF, or drop it here</span>
            )}
            <span id={`${id}-file-hint`} className="text-[13px] text-ink-3">
              JPEG, PNG, WebP, HEIC or PDF, up to 10 MB
            </span>
            <input
              id={`${id}-file`}
              type="file"
              accept={ACCEPT}
              aria-describedby={`${id}-file-hint`}
              onChange={(e) => pick(e.target.files?.[0])}
              className="sr-only"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field id={`${id}-doctor`} label="Doctor" hint="Optional">
              <Input id={`${id}-doctor`} name="doctor" maxLength={LIMITS.doctor} autoComplete="off" placeholder="Read from the file…" value={doctor} onChange={(e) => setDoctor(e.target.value)} />
            </Field>
            <Field id={`${id}-clinic`} label="Clinic" hint="Optional">
              <Input id={`${id}-clinic`} name="clinic" maxLength={LIMITS.clinic} autoComplete="off" placeholder="Read from the file…" value={clinic} onChange={(e) => setClinic(e.target.value)} />
            </Field>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink">
              {error}
            </p>
          )}

          <div className="-mx-6 -mb-6 mt-1 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-canvas px-6 py-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? 'Uploading…' : 'Upload and read'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
