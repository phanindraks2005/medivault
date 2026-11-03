'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Field } from '@/components/app/kit'
import { todayISO } from '@/lib/dates'
import { LIMITS } from '@/lib/limits'

const RELATIONS = ['Mother', 'Father', 'Spouse', 'Daughter', 'Son', 'Sister', 'Brother', 'Grandmother', 'Grandfather', 'Other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Female', 'Male', 'Other']

export type MemberValues = {
  name: string
  relation: string
  dob: string
  gender: string
  blood_group: string
  allergies: string
  known_conditions: string
  height_cm: string
  weight_kg: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

export const emptyMember: MemberValues = {
  name: '',
  relation: '',
  dob: '',
  gender: '',
  blood_group: '',
  allergies: '',
  known_conditions: '',
  height_cm: '',
  weight_kg: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

// What the database expects: empty strings become nulls, numbers become numbers.
export function toRow(v: MemberValues) {
  const t = (s: string) => s.trim() || null
  return {
    name: v.name.trim(),
    // The column is required; someone added without a relation is "Other".
    relation: v.relation ? v.relation.toLowerCase() : 'other',
    dob: v.dob || null,
    gender: t(v.gender),
    blood_group: t(v.blood_group),
    allergies: t(v.allergies),
    known_conditions: t(v.known_conditions),
    height_cm: v.height_cm ? parseFloat(v.height_cm) : null,
    weight_kg: v.weight_kg ? parseFloat(v.weight_kg) : null,
    emergency_contact_name: t(v.emergency_contact_name),
    emergency_contact_phone: t(v.emergency_contact_phone),
  }
}

export default function MemberForm({
  initial = emptyMember,
  isSelf,
  submitLabel,
  busyLabel,
  onSubmit,
  onCancel,
}: {
  initial?: MemberValues
  isSelf?: boolean
  submitLabel: string
  busyLabel: string
  onSubmit: (values: MemberValues) => Promise<string | null>
  onCancel: () => void
}) {
  const [v, setV] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof MemberValues) => (value: string) => setV((x) => ({ ...x, [k]: value }))
  const relationValue = v.relation ? v.relation.charAt(0).toUpperCase() + v.relation.slice(1) : null

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!v.name.trim()) {
          setError('Add a name first.')
          document.getElementById('m-name')?.focus()
          return
        }
        if (v.dob && v.dob > todayISO()) {
          setError('The date of birth can’t be in the future.')
          document.getElementById('m-dob')?.focus()
          return
        }
        setBusy(true)
        setError('')
        const problem = await onSubmit(v)
        if (problem) setError(problem)
        setBusy(false)
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Field id="m-name" label="Name" className="sm:col-span-2">
        <Input id="m-name" name="name" maxLength={LIMITS.name} autoComplete="off" value={v.name} onChange={(e) => set('name')(e.target.value)} required />
      </Field>
      {!isSelf && (
        <Field id="m-relation" label="Relation" hint="Optional">
          <Select value={relationValue} onValueChange={(x) => set('relation')(String(x ?? ''))}>
            <SelectTrigger id="m-relation" className="w-full">
              <SelectValue placeholder="Choose…" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
      <Field id="m-dob" label="Date of birth" className={isSelf ? 'sm:col-span-2' : undefined}>
        <Input id="m-dob" name="dob" type="date" max={todayISO()} value={v.dob} onChange={(e) => set('dob')(e.target.value)} />
      </Field>
      <Field id="m-gender" label="Gender">
        <Select value={v.gender || null} onValueChange={(x) => set('gender')(String(x ?? ''))}>
          <SelectTrigger id="m-gender" className="w-full">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {GENDERS.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="m-blood" label="Blood group">
        <Select value={v.blood_group || null} onValueChange={(x) => set('blood_group')(String(x ?? ''))}>
          <SelectTrigger id="m-blood" className="w-full">
            <SelectValue placeholder="Choose…" />
          </SelectTrigger>
          <SelectContent>
            {BLOOD_GROUPS.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field id="m-allergies" label="Allergies" hint="Separate with commas" className="sm:col-span-2">
        <Input
          id="m-allergies"
          name="allergies"
          maxLength={LIMITS.allergies}
          aria-describedby="m-allergies-hint"
          autoComplete="off"
          placeholder="e.g. Penicillin, peanuts…"
          value={v.allergies}
          onChange={(e) => set('allergies')(e.target.value)}
        />
      </Field>
      <Field id="m-conditions" label="Known conditions" className="sm:col-span-2">
        <Input
          id="m-conditions"
          name="conditions"
          maxLength={LIMITS.conditions}
          autoComplete="off"
          placeholder="e.g. Asthma…"
          value={v.known_conditions}
          onChange={(e) => set('known_conditions')(e.target.value)}
        />
      </Field>
      <Field id="m-height" label="Height (cm)">
        <Input id="m-height" name="height" type="number" inputMode="decimal" min={30} max={250} value={v.height_cm} onChange={(e) => set('height_cm')(e.target.value)} />
      </Field>
      <Field id="m-weight" label="Weight (kg)">
        <Input id="m-weight" name="weight" type="number" inputMode="decimal" step="0.1" min={1} max={350} value={v.weight_kg} onChange={(e) => set('weight_kg')(e.target.value)} />
      </Field>
      <Field id="m-ec-name" label="Emergency contact">
        <Input
          id="m-ec-name"
          name="emergency-contact"
          maxLength={LIMITS.name}
          autoComplete="off"
          placeholder="Name…"
          value={v.emergency_contact_name}
          onChange={(e) => set('emergency_contact_name')(e.target.value)}
        />
      </Field>
      <Field id="m-ec-phone" label="Their phone">
        <Input
          id="m-ec-phone"
          name="emergency-phone"
          maxLength={LIMITS.phone}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="98450 12345…"
          value={v.emergency_contact_phone}
          onChange={(e) => set('emergency_contact_phone')(e.target.value)}
        />
      </Field>

      {error && (
        <p role="alert" className="rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink sm:col-span-2">
          {error}
        </p>
      )}

      <div className="-mx-6 -mb-6 mt-1 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-canvas px-6 py-4 sm:col-span-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}
