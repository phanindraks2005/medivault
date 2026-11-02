'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Nav from '@/components/Nav'
import Link from 'next/link'
import FloatingMeds from '@/components/FloatingMeds'

export default function Dashboard() {
  const [userName, setUserName] = useState('')
  const [memberCount, setMemberCount] = useState(0)
  const [recordCount, setRecordCount] = useState(0)
  const [error, setError] = useState('')
  const [jargonText, setJargonText] = useState('')
  const [jargonResult, setJargonResult] = useState<any>(null)
  const [jargonLoading, setJargonLoading] = useState(false)
  const [medicineQuery, setMedicineQuery] = useState('')
  const [medicineResult, setMedicineResult] = useState<any>(null)
  const [lookupLoading, setLookupLoading] = useState(false)

  const [symptoms, setSymptoms] = useState('')
  const [triageResult, setTriageResult] = useState<any>(null)
  const [triageLoading, setTriageLoading] = useState(false)

  const handleJargonTranslate = async (e: React.FormEvent) => {
    e.preventDefault()
    setJargonLoading(true)
    setJargonResult(null)
    setError('')
    try {
      const res = await fetch('/api/jargon-translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: jargonText }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setJargonResult(data)
    } catch {
      setError('Translation failed')
    }
    setJargonLoading(false)
  }

  useEffect(() => {
    const loadOverview = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: members } = await supabase
        .from('family_members')
        .select('id, name, relation')
        .eq('user_id', user.id)

      setMemberCount(members?.length || 0)
      const self = members?.find((m) => m.relation?.toLowerCase() === 'self')
      setUserName(self?.name || '')

      const { count } = await supabase
        .from('medical_records')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)

      setRecordCount(count || 0)
    }
    loadOverview()
  }, [])

  const handleMedicineLookup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLookupLoading(true)
    setMedicineResult(null)
    setError('')
    try {
      const res = await fetch('/api/medicine-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicineName: medicineQuery }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setMedicineResult(data)
    } catch {
      setError('Lookup failed')
    }
    setLookupLoading(false)
  }

  const handleSymptomTriage = async (e: React.FormEvent) => {
    e.preventDefault()
    setTriageLoading(true)
    setTriageResult(null)
    setError('')
    try {
      const res = await fetch('/api/symptom-triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setTriageResult(data)
    } catch {
      setError('Triage failed')
    }
    setTriageLoading(false)
  }

  const urgencyStyles: Record<string, string> = {
    mild: 'bg-sage-light text-foreground border-sage',
    moderate: 'bg-taupe-light text-foreground border-taupe',
    urgent: 'bg-red-950 text-red-200 border-red-700',
  }

  return (
    <div className="min-h-screen bg-background">
      <FloatingMeds />
      <Nav />
      <div className="max-w-2xl mx-auto px-5 py-6">
        <div className="mb-8">
          <h1 className="text-2xl font-medium text-foreground">Hey {userName || 'there'} 👋</h1>
          <p className="text-text-secondary text-sm mt-1">Here's what's happening with your family's health</p>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-950 text-red-200 text-sm">{error}</div>
        )}

        {/* Health report overview */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <i className="ti ti-heartbeat" style={{ color: 'var(--color-sage)', fontSize: 18 }}></i>
            <h2 className="text-lg font-medium text-foreground">Health report</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-sage-light rounded-2xl p-4 border border-border">
              <i className="ti ti-users" style={{ color: 'var(--color-sage)', fontSize: 20 }}></i>
              <p className="text-2xl font-semibold text-foreground mt-2">{memberCount}</p>
              <p className="text-xs text-text-secondary mt-0.5">family {memberCount === 1 ? 'member' : 'members'} tracked</p>
            </div>
            <div className="bg-taupe-light rounded-2xl p-4 border border-border">
              <i className="ti ti-file-text" style={{ color: 'var(--color-taupe)', fontSize: 20 }}></i>
              <p className="text-2xl font-semibold text-foreground mt-2">{recordCount}</p>
              <p className="text-xs text-text-secondary mt-0.5">records saved</p>
            </div>
          </div>
        </section>

        {/* Medicine lookup */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <i className="ti ti-pill" style={{ color: 'var(--color-sage)', fontSize: 18 }}></i>
            <h2 className="text-lg font-medium text-foreground">Look up a medicine</h2>
          </div>
          <form onSubmit={handleMedicineLookup} className="flex gap-2">
            <input placeholder="e.g. Dolo 650" value={medicineQuery} onChange={(e) => setMedicineQuery(e.target.value)} required
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-sage" />
            <button type="submit" disabled={lookupLoading}
              className="px-4 py-2 rounded-xl bg-sage text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {lookupLoading ? 'Searching…' : 'Search'}
            </button>
          </form>
          {medicineResult && (
            <div className="mt-3 bg-card rounded-2xl border border-border p-4">
              <p className="text-sm font-medium text-foreground">{medicineResult.name}</p>
              {medicineResult.common_brands_india?.length > 0 && (
                <p className="text-xs text-text-secondary mt-1">Brands in India: {medicineResult.common_brands_india.join(', ')}</p>
              )}
              <p className="text-sm text-foreground mt-2">{medicineResult.uses}</p>
              <p className="text-xs text-text-secondary mt-1">Typical dosage: {medicineResult.typical_dosage}</p>
              <p className="text-xs text-text-secondary mt-1">Side effects: {medicineResult.side_effects?.join(', ')}</p>
              <p className="text-xs text-text-muted mt-2">{medicineResult.disclaimer}</p>
            </div>
          )}
        </section>

        {/* Symptom triage */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <i className="ti ti-stethoscope" style={{ color: 'var(--color-sage)', fontSize: 18 }}></i>
            <h2 className="text-lg font-medium text-foreground">How are you feeling?</h2>
          </div>
          <form onSubmit={handleSymptomTriage} className="flex flex-col gap-2">
            <textarea placeholder="Describe your symptoms..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} required rows={3}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-sage resize-none" />
            <button type="submit" disabled={triageLoading}
              className="self-start px-4 py-2 rounded-xl bg-taupe text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {triageLoading ? 'Checking…' : 'Get guidance'}
            </button>
          </form>
          {triageResult && (
            <div className={`mt-3 rounded-2xl border p-4 ${urgencyStyles[triageResult.urgency] || urgencyStyles.mild}`}>
              <p className="text-sm font-medium">{triageResult.urgency_label}</p>
              <p className="text-sm mt-2">{triageResult.general_guidance}</p>
              <p className="text-xs mt-2"><span className="font-medium">See a doctor if:</span> {triageResult.see_doctor_if}</p>
              <p className="text-xs opacity-70 mt-2">{triageResult.disclaimer}</p>
            </div>
          )}
        </section>

        {/* Jargon translator */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-3">
            <i className="ti ti-language" style={{ color: 'var(--color-sage)', fontSize: 18 }}></i>
            <h2 className="text-lg font-medium text-foreground">Translate a doctor's note</h2>
          </div>
          <form onSubmit={handleJargonTranslate} className="flex flex-col gap-2">
            <textarea placeholder="Paste any confusing medical text, lab result, or doctor's note here..." value={jargonText} onChange={(e) => setJargonText(e.target.value)} required rows={4}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:border-sage resize-none" />
            <button type="submit" disabled={jargonLoading}
              className="self-start px-4 py-2 rounded-xl bg-sage text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
              {jargonLoading ? 'Translating…' : 'Explain in plain English'}
            </button>
          </form>
          {jargonResult && (
            <div className="mt-3 bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
              <p className="text-sm text-foreground">{jargonResult.plain_explanation}</p>
              {jargonResult.key_terms?.length > 0 && (
                <div>
                  <p className="text-xs text-text-secondary mb-2">Key terms</p>
                  <div className="flex flex-col gap-1.5">
                    {jargonResult.key_terms.map((t: any, i: number) => (
                      <p key={i} className="text-xs text-text-secondary"><span className="text-foreground font-medium">{t.term}:</span> {t.meaning}</p>
                    ))}
                  </div>
                </div>
              )}
              {jargonResult.should_be_concerned && (
                <div className="bg-taupe-light rounded-xl p-3">
                  <p className="text-xs text-foreground">{jargonResult.should_be_concerned}</p>
                </div>
              )}
              <p className="text-xs text-text-muted">{jargonResult.disclaimer}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}