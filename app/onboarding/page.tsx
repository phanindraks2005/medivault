'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import FloatingMeds from '@/components/FloatingMeds'

export default function OnboardingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [allergies, setAllergies] = useState('')
  const [knownConditions, setKnownConditions] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('family_members').insert({
      user_id: user.id,
      name,
      relation: 'self',
      dob: dob || null,
      gender,
      blood_group: bloodGroup,
      allergies: allergies || null,
      known_conditions: knownConditions || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5 py-10">
      <FloatingMeds />

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-6">
          <Logo size={44} />
          <h1 className="text-xl font-semibold text-foreground mt-4">Let's set up your profile</h1>
          <p className="text-sm text-text-secondary mt-1 text-center">Just the basics for now — you can always add more later</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-card border border-border rounded-3xl p-6 shadow-2xl flex flex-col gap-3">
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Your name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Date of birth</label>
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Gender</label>
              <input value={gender} onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Blood group</label>
            <input value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)} placeholder="e.g. O+"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Allergies (optional)</label>
            <input value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="comma separated"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Known conditions (optional)</label>
            <input value={knownConditions} onChange={(e) => setKnownConditions(e.target.value)} placeholder="e.g. asthma, diabetes"
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Height (cm)</label>
              <input type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Weight (kg)</label>
              <input type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            </div>
          </div>

          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Emergency contact name (optional)</label>
            <input value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>
          <div>
            <label className="text-xs text-text-secondary mb-1.5 block">Emergency contact phone (optional)</label>
            <input value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-red-950 text-red-200 text-xs">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full py-2.5 rounded-xl bg-sage text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Continue'}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            className="text-sm text-text-secondary hover:text-foreground transition"
          >
            Skip for now
          </button>
        </form>
      </div>
    </div>
  )
}