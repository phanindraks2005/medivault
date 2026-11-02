'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

type FamilyMember = {
  id: string
  name: string
  relation: string
  dob: string
  gender: string
  blood_group: string
}

function initials(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?'
}

export default function ProfilePage() {
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState<FamilyMember[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [allergies, setAllergies] = useState('')
  const [name, setName] = useState('')
  const [relation, setRelation] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emergencyContactName, setEmergencyContactName] = useState('')
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('')
  const [knownConditions, setKnownConditions] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [weightKg, setWeightKg] = useState('')

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email || '')

    const { data, error } = await supabase
      .from('family_members')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setMembers(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const self = members.find((m) => m.relation?.toLowerCase() === 'self')
  const others = members.filter((m) => m.relation?.toLowerCase() !== 'self')

  const handleAddMember = async (e: React.FormEvent) => {
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
      relation,
      dob: dob || null,
      gender,
      blood_group: bloodGroup,
      allergies: allergies || null,
      emergency_contact_name: emergencyContactName || null,
      emergency_contact_phone: emergencyContactPhone || null,
      known_conditions: knownConditions || null,
      height_cm: heightCm ? parseFloat(heightCm) : null,
      weight_kg: weightKg ? parseFloat(weightKg) : null,
    })
    if (error) {
      setError(error.message)
    } else {
      setName(''); setRelation(''); setDob(''); setGender(''); setBloodGroup(''); setAllergies('')
      setEmergencyContactName(''); setEmergencyContactPhone(''); setKnownConditions(''); setHeightCm(''); setWeightKg('')
      setShowAddForm(false)
      fetchData()
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="text-sm text-text-secondary hover:text-foreground transition">
            <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back
          </Link>
          <button onClick={handleLogout} className="text-sm text-text-secondary hover:text-foreground transition">
            Log out
          </button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-50 text-red-800 text-sm">{error}</div>
        )}

        {/* User's own profile */}
        <section className="mb-8">
          {self ? (
            <Link href={`/profile/family/${self.id}`} className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4 hover:border-sage transition block">
              <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-white text-xl font-medium">
                {initials(self.name)}
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">{self.name}</p>
                <p className="text-sm text-text-secondary">{email}</p>
                <p className="text-xs text-text-secondary mt-1 capitalize">
                  {self.gender || '—'} · {self.blood_group || '—'} {self.dob && `· DOB ${self.dob}`}
                </p>
              </div>
            </Link>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-white text-xl font-medium">
                {initials(email)}
              </div>
              <div>
                <p className="text-lg font-medium text-foreground">You</p>
                <p className="text-sm text-text-secondary">{email}</p>
              </div>
            </div>
          )}
        </section>

        {/* Family members */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-foreground">Your family</h2>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-sm px-3 py-1.5 rounded-full bg-sage text-white hover:opacity-90 transition"
            >
              {showAddForm ? 'Cancel' : '+ Add someone'}
            </button>
          </div>

          {showAddForm && (
            <form onSubmit={handleAddMember} className="bg-card rounded-2xl border border-border p-4 mb-4 flex flex-col gap-3">
              <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Relation (self, father, mother...)" value={relation} onChange={(e) => setRelation(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input type="date" value={dob} onChange={(e) => setDob(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Gender" value={gender} onChange={(e) => setGender(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Blood group" value={bloodGroup} onChange={(e) => setBloodGroup(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Allergies (optional, comma separated)" value={allergies} onChange={(e) => setAllergies(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Known conditions (optional, e.g. diabetes, asthma)" value={knownConditions} onChange={(e) => setKnownConditions(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <div className="grid grid-cols-2 gap-3">
                <input placeholder="Height (cm)" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
                <input placeholder="Weight (kg)" type="number" value={weightKg} onChange={(e) => setWeightKg(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              </div>
              <input placeholder="Emergency contact name (optional)" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Emergency contact phone (optional)" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <button type="submit" disabled={loading}
                className="mt-1 px-4 py-2 rounded-xl bg-sage text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                {loading ? 'Adding…' : 'Add family member'}
              </button>
            </form>
          )}

          <div className="grid grid-cols-2 gap-3">
            {others.map((m) => (
              <motion.div key={m.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  href={`/profile/family/${m.id}`}
                  className="bg-sage-light rounded-2xl p-4 hover:opacity-90 transition block"
                >
                  <div className="w-9 h-9 rounded-full bg-sage flex items-center justify-center text-white text-sm font-medium mb-2">
                    {initials(m.name)}
                  </div>
                  <p className="text-sm font-medium text-foreground">{m.name}</p>
                  <p className="text-xs text-text-secondary capitalize">{m.relation} · {m.blood_group || '—'}</p>
                </Link>
              </motion.div>
            ))}
            {others.length === 0 && (
              <div className="col-span-2 bg-card rounded-2xl border border-border p-4 text-sm text-text-secondary">
                No family members added yet.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
