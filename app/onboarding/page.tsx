'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { saveError, supabase, userForSave } from '@/lib/supabase'
import AuthSplit from '@/components/auth/AuthSplit'
import EmergencyCardView from '@/components/app/EmergencyCardView'
import { ageFrom, allergyList } from '@/lib/family'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ease } from '@/lib/motion'
import { todayISO } from '@/lib/dates'
import { useHydrated } from '@/lib/use-hydrated'
import { LIMITS } from '@/lib/limits'

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Female', 'Male', 'Other']

async function hasSelf() {
  const { data } = await supabase.from('family_members').select('id').eq('relation', 'self').limit(1)
  return !!data?.length
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    name: '',
    dob: '',
    gender: '',
    bloodGroup: '',
    allergies: '',
    knownConditions: '',
    heightCm: '',
    weightKg: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // "Today" depends on the visitor's clock, so the max date waits for the browser.
  const hydrated = useHydrated()

  // Onboarding creates the account holder's own profile, once. Logged out goes
  // to /auth; someone who already has a profile goes straight to the calendar.
  const [checked, setChecked] = useState(false)
  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return router.replace('/auth')
      if (await hasSelf()) return router.replace('/dashboard')
      setChecked(true)
    }
    check()
  }, [router])

  const set = (key: keyof typeof form) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const save = async () => {
    setLoading(true)
    setError('')
    const user = await userForSave()
    if (user.error) {
      setError(user.error)
      setLoading(false)
      return
    }
    // Saved in another tab, or a double submit: never add a second "You".
    if (await hasSelf()) return router.replace('/dashboard')
    const { error } = await supabase.from('family_members').insert({
      user_id: user.id,
      name: form.name.trim(),
      relation: 'self',
      dob: form.dob || null,
      gender: form.gender || null,
      blood_group: form.bloodGroup || null,
      allergies: form.allergies || null,
      known_conditions: form.knownConditions || null,
      height_cm: form.heightCm ? parseFloat(form.heightCm) : null,
      weight_kg: form.weightKg ? parseFloat(form.weightKg) : null,
      emergency_contact_name: form.emergencyContactName || null,
      emergency_contact_phone: form.emergencyContactPhone || null,
    })
    if (error) {
      setError(saveError("Couldn't save your profile. Try again."))
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <AuthSplit
      caption="Your emergency card, filling in as you type."
      scene={
        <EmergencyCardView
          data={{
            name: form.name.trim(),
            color: '#3b6fd8',
            age: ageFrom(form.dob),
            gender: form.gender || null,
            bloodGroup: form.bloodGroup || null,
            allergies: allergyList(form.allergies),
            medicines: [],
            contact: [form.emergencyContactName.trim(), form.emergencyContactPhone.trim()].filter(Boolean).join(' · ') || null,
          }}
        />
      }
    >
      <div className={checked ? undefined : 'invisible'} aria-busy={!checked}>
        <div className="flex items-center gap-3" aria-label={`Step ${step + 1} of 2`}>
          {[0, 1].map((i) => (
            <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <motion.span
                className="block h-full rounded-full bg-band"
                initial={false}
                animate={{ width: step >= i ? '100%' : '0%' }}
                transition={{ duration: 0.35, ease }}
              />
            </span>
          ))}
          <span className="text-[13px] font-medium text-ink-3 num">{step + 1} of 2</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.form
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25, ease }}
            onSubmit={(e) => {
              e.preventDefault()
              if (step === 0) {
                if (form.dob && form.dob > todayISO()) {
                  setError('The date of birth can’t be in the future.')
                  return document.getElementById('dob')?.focus()
                }
                setError('')
                setStep(1)
              }
              else save()
            }}
            className="mt-8"
          >
            {step === 0 ? (
              <>
                <h1 className="font-heading text-[28px] leading-[1.1] tracking-[-0.03em] sm:text-[32px]">About you</h1>
                <p className="mt-2 text-ink-2">This becomes your own profile. You&apos;ll add family members next.</p>
                <div className="mt-7 space-y-5">
                  <Field id="name" label="Your name">
                    <Input id="name" name="name" maxLength={LIMITS.name} autoComplete="name" value={form.name} onChange={(e) => set('name')(e.target.value)} required />
                  </Field>
                  <Field id="dob" label="Date of birth">
                    <Input id="dob" name="dob" type="date" max={hydrated ? todayISO() : undefined} autoComplete="bday" value={form.dob} onChange={(e) => set('dob')(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="gender" label="Gender">
                      <Select value={form.gender || null} onValueChange={(v) => set('gender')(String(v ?? ''))}>
                        <SelectTrigger id="gender" className="w-full">
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
                    <Field id="blood" label="Blood group">
                      <Select value={form.bloodGroup || null} onValueChange={(v) => set('bloodGroup')(String(v ?? ''))}>
                        <SelectTrigger id="blood" className="w-full">
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
                  </div>
                </div>
              </>
            ) : (
              <>
                <h1 className="font-heading text-[28px] leading-[1.1] tracking-[-0.03em] sm:text-[32px]">Health basics</h1>
                <p className="mt-2 text-ink-2">All optional. These show up on your emergency card.</p>
                <div className="mt-7 space-y-5">
                  <Field id="allergies" label="Allergies" hint="Separate with commas">
                    <Input id="allergies" name="allergies" maxLength={LIMITS.allergies} aria-describedby="allergies-hint" autoComplete="off" placeholder="e.g. Penicillin, peanuts…" value={form.allergies} onChange={(e) => set('allergies')(e.target.value)} />
                  </Field>
                  <Field id="conditions" label="Known conditions">
                    <Input id="conditions" name="conditions" maxLength={LIMITS.conditions} autoComplete="off" placeholder="e.g. Asthma…" value={form.knownConditions} onChange={(e) => set('knownConditions')(e.target.value)} />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field id="height" label="Height (cm)">
                      <Input id="height" name="height" type="number" inputMode="decimal" min={30} max={250} value={form.heightCm} onChange={(e) => set('heightCm')(e.target.value)} />
                    </Field>
                    <Field id="weight" label="Weight (kg)">
                      <Input id="weight" name="weight" type="number" inputMode="decimal" step="0.1" min={1} max={350} value={form.weightKg} onChange={(e) => set('weightKg')(e.target.value)} />
                    </Field>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field id="ec-name" label="Emergency contact">
                      <Input id="ec-name" name="emergency-contact" maxLength={LIMITS.name} autoComplete="off" placeholder="Name…" value={form.emergencyContactName} onChange={(e) => set('emergencyContactName')(e.target.value)} />
                    </Field>
                    <Field id="ec-phone" label="Their phone">
                      <Input id="ec-phone" name="emergency-phone" maxLength={LIMITS.phone} type="tel" inputMode="tel" autoComplete="off" placeholder="98450 12345…" value={form.emergencyContactPhone} onChange={(e) => set('emergencyContactPhone')(e.target.value)} />
                    </Field>
                  </div>
                </div>
              </>
            )}

            {error && (
              <p role="alert" className="mt-5 rounded-lg bg-red-soft px-4 py-3 text-red-ink">
                {error}
              </p>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {step === 1 && (
                <Button type="button" variant="outline" size="lg" onClick={() => setStep(0)}>
                  <ArrowLeft aria-hidden="true" /> Back
                </Button>
              )}
              <Button type="submit" size="lg" disabled={loading} className="flex-1 sm:flex-none">
                {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
                {step === 0 ? (
                  <>
                    Continue <ArrowRight aria-hidden="true" />
                  </>
                ) : loading ? (
                  'Saving…'
                ) : (
                  'Save and open my calendar'
                )}
              </Button>
              <Button type="button" variant="ghost" size="lg" onClick={() => router.push('/dashboard')} className="text-ink-3">
                Skip for now
              </Button>
            </div>
          </motion.form>
        </AnimatePresence>
      </div>
    </AuthSplit>
  )
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id} className="text-[14px] font-medium text-ink-2">
          {label}
        </Label>
        {hint && <span id={`${id}-hint`} className="text-[13px] text-ink-3">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
