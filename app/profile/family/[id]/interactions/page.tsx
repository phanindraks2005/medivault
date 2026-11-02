'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

const severityStyles: Record<string, string> = {
  minor: 'bg-sage-light border-sage text-foreground',
  moderate: 'bg-taupe-light border-taupe text-foreground',
  major: 'bg-red-950 border-red-700 text-red-200',
}

export default function InteractionCheckerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [member, setMember] = useState<any>(null)
  const [medicines, setMedicines] = useState<string[]>([])
  const [extraMedicine, setExtraMedicine] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: memberData } = await supabase.from('family_members').select('name').eq('id', id).single()
      setMember(memberData)

      const { data: records } = await supabase
        .from('medical_records')
        .select('extracted_data')
        .eq('family_member_id', id)
        .order('created_at', { ascending: false })
        .limit(10)

      const meds = new Set<string>()
      records?.forEach((r) => {
        r.extracted_data?.medicines?.forEach((m: any) => meds.add(m.name))
      })
      setMedicines(Array.from(meds))
    }
    load()
  }, [id])

  const handleCheck = async () => {
    const fullList = extraMedicine.trim() ? [...medicines, extraMedicine.trim()] : medicines
    if (fullList.length < 2) {
      setError('Need at least 2 medicines on record (or add one) to check')
      return
    }
    setChecking(true)
    setError('')
    setResult(null)

    try {
      const res = await fetch('/api/interaction-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ medicines: fullList }),
      })
      const data = await res.json()
      if (data.error) setError(data.error)
      else setResult(data)
    } catch {
      setError('Check failed, try again')
    }
    setChecking(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link href={`/profile/family/${id}`} className="text-sm text-text-secondary hover:text-foreground transition mb-6 inline-block">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to {member?.name || 'profile'}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-taupe flex items-center justify-center flex-shrink-0">
            <i className="ti ti-flask" style={{ fontSize: 20, color: '#0F1115' }}></i>
          </div>
          <div>
            <h1 className="text-lg font-medium text-foreground">Interaction checker</h1>
            <p className="text-xs text-text-secondary">Checking medicines on record for {member?.name}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-950 text-red-200 text-sm">{error}</div>
        )}

        <div className="bg-card rounded-2xl border border-border p-4 mb-4">
          <p className="text-xs text-text-secondary mb-2">Medicines on record</p>
          {medicines.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {medicines.map((m, i) => (
                <span key={i} className="text-sm px-3 py-1 rounded-full bg-sage-light text-foreground">{m}</span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-text-secondary">No medicines found on record yet.</p>
          )}
        </div>

        <div className="bg-card rounded-2xl border border-border p-4 mb-4 flex flex-col gap-3">
          <p className="text-xs text-text-secondary">Optionally add a medicine to check against the list above</p>
          <div className="flex gap-2">
            <input
              placeholder="e.g. Ibuprofen"
              value={extraMedicine}
              onChange={(e) => setExtraMedicine(e.target.value)}
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage"
            />
          </div>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="px-4 py-2 rounded-xl bg-taupe text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start"
          >
            {checking ? 'Checking…' : 'Check for interactions'}
          </button>
        </div>

        {result && (
          <div className="flex flex-col gap-3">
            <div className={`rounded-2xl border p-4 ${severityStyles[result.overall_risk] || severityStyles.minor}`}>
              <p className="text-sm font-medium capitalize">{result.overall_risk === 'none' ? 'No significant interactions found' : `${result.overall_risk} risk found`}</p>
              <p className="text-sm mt-1 opacity-90">{result.summary}</p>
            </div>

            {result.interactions?.length > 0 && (
              <div className="flex flex-col gap-2">
                {result.interactions.map((interaction: any, i: number) => (
                  <div key={i} className={`rounded-2xl border p-4 ${severityStyles[interaction.severity] || severityStyles.minor}`}>
                    <p className="text-sm font-medium">{interaction.medicines.join(' + ')}</p>
                    <p className="text-xs mt-1 capitalize opacity-80">{interaction.severity} severity</p>
                    <p className="text-sm mt-2 opacity-90">{interaction.description}</p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-text-muted text-center mt-1">{result.disclaimer}</p>
          </div>
        )}
      </div>
    </div>
  )
}