'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function VaccinationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [member, setMember] = useState<any>(null)
  const [vaccinations, setVaccinations] = useState<any[]>([])
  const [error, setError] = useState('')

  const [showForm, setShowForm] = useState(false)
  const [vaccineName, setVaccineName] = useState('')
  const [dateGiven, setDateGiven] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    const { data: memberData } = await supabase.from('family_members').select('name').eq('id', id).single()
    setMember(memberData)

    const { data, error } = await supabase
      .from('vaccinations')
      .select('*')
      .eq('family_member_id', id)
      .order('date_given', { ascending: false })
    if (error) setError(error.message)
    else setVaccinations(data || [])
  }

  useEffect(() => {
    fetchData()
  }, [id])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('vaccinations').insert({
      user_id: user.id,
      family_member_id: id,
      vaccine_name: vaccineName,
      date_given: dateGiven || null,
      next_due_date: nextDueDate || null,
      notes: notes || null,
    })
    if (error) {
      setError(error.message)
    } else {
      setVaccineName(''); setDateGiven(''); setNextDueDate(''); setNotes('')
      setShowForm(false)
      fetchData()
    }
    setSaving(false)
  }

  const handleDelete = async (vaccId: string) => {
    const confirmed = window.confirm('Delete this vaccination record?')
    if (!confirmed) return
    await supabase.from('vaccinations').delete().eq('id', vaccId)
    fetchData()
  }

  const today = new Date()
  const isDueSoon = (dateStr: string) => {
    if (!dateStr) return false
    const due = new Date(dateStr)
    const diffDays = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays >= 0 && diffDays <= 30
  }
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false
    return new Date(dateStr).getTime() < today.getTime()
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link href={`/profile/family/${id}`} className="text-sm text-text-secondary hover:text-foreground transition mb-6 inline-block">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to {member?.name || 'profile'}
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-sage flex items-center justify-center flex-shrink-0">
              <i className="ti ti-vaccine" style={{ fontSize: 20, color: '#0F1115' }}></i>
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground">Vaccinations</h1>
              <p className="text-xs text-text-secondary">{member?.name}'s vaccination record</p>
            </div>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-3 py-1.5 rounded-full bg-sage text-[#0F1115] hover:opacity-90 transition"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-2xl bg-red-950 text-red-200 text-sm">{error}</div>
        )}

        {showForm && (
          <form onSubmit={handleAdd} className="bg-card rounded-2xl border border-border p-4 mb-4 flex flex-col gap-3">
            <input placeholder="Vaccine name (e.g. Tetanus booster)" value={vaccineName} onChange={(e) => setVaccineName(e.target.value)} required
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Date given</label>
                <input type="date" value={dateGiven} onChange={(e) => setDateGiven(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Next due (optional)</label>
                <input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
              </div>
            </div>
            <input placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)}
              className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage" />
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-xl bg-sage text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50 self-start">
              {saving ? 'Saving…' : 'Save vaccination'}
            </button>
          </form>
        )}

        <div className="flex flex-col gap-2">
          {vaccinations.length === 0 && (
            <div className="bg-card rounded-2xl border border-border p-4 text-sm text-text-secondary">
              No vaccinations logged yet for {member?.name}.
            </div>
          )}
          {vaccinations.map((v) => (
            <div key={v.id} className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{v.vaccine_name}</p>
                  {v.date_given && <p className="text-xs text-text-secondary mt-1">Given: {new Date(v.date_given).toLocaleDateString()}</p>}
                  {v.next_due_date && (
                    <p className={`text-xs mt-0.5 ${isOverdue(v.next_due_date) ? 'text-red-300' : isDueSoon(v.next_due_date) ? 'text-taupe' : 'text-text-secondary'}`}>
                      Next due: {new Date(v.next_due_date).toLocaleDateString()}
                      {isOverdue(v.next_due_date) && ' · Overdue'}
                      {isDueSoon(v.next_due_date) && ' · Due soon'}
                    </p>
                  )}
                  {v.notes && <p className="text-xs text-text-secondary mt-1">{v.notes}</p>}
                </div>
                <button onClick={() => handleDelete(v.id)} className="text-text-secondary hover:text-red-300 transition">
                  <i className="ti ti-trash" style={{ fontSize: 15 }}></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}