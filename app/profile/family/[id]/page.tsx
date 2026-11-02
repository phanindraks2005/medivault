'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Toast from '@/components/Toast'

function initials(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?'
}

export default function FamilyMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [member, setMember] = useState<any>(null)
  const [records, setRecords] = useState<any[]>([])
  const [error, setError] = useState('')
  const [showToast, setShowToast] = useState(false)
  const [doctorName, setDoctorName] = useState('')
  const [hospitalName, setHospitalName] = useState('')
const [editMode, setEditMode] = useState(false)
const [editName, setEditName] = useState('')
const [editRelation, setEditRelation] = useState('')
const [editDob, setEditDob] = useState('')
const [editGender, setEditGender] = useState('')
const [editBloodGroup, setEditBloodGroup] = useState('')
const [editAllergies, setEditAllergies] = useState('')
const [editKnownConditions, setEditKnownConditions] = useState('')
const [editHeightCm, setEditHeightCm] = useState('')
const [editWeightKg, setEditWeightKg] = useState('')
const [editEmergencyContactName, setEditEmergencyContactName] = useState('')
const [editEmergencyContactPhone, setEditEmergencyContactPhone] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [recordType, setRecordType] = useState('prescription')
  const [uploading, setUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [summaryResult, setSummaryResult] = useState<any>(null)
const [summaryLoading, setSummaryLoading] = useState(false)

  const startEdit = () => {
  setEditName(member.name || '')
  setEditRelation(member.relation || '')
  setEditDob(member.dob || '')
  setEditGender(member.gender || '')
  setEditBloodGroup(member.blood_group || '')
  setEditAllergies(member.allergies || '')
  setEditKnownConditions(member.known_conditions || '')
  setEditHeightCm(member.height_cm?.toString() || '')
  setEditWeightKg(member.weight_kg?.toString() || '')
  setEditEmergencyContactName(member.emergency_contact_name || '')
  setEditEmergencyContactPhone(member.emergency_contact_phone || '')
  setEditMode(true)
}

const handleSaveEdit = async (e: React.FormEvent) => {
  e.preventDefault()
  const { error } = await supabase
    .from('family_members')
    .update({
      name: editName,
      relation: editRelation,
      dob: editDob || null,
      gender: editGender,
      blood_group: editBloodGroup,
      allergies: editAllergies || null,
      known_conditions: editKnownConditions || null,
      height_cm: editHeightCm ? parseFloat(editHeightCm) : null,
      weight_kg: editWeightKg ? parseFloat(editWeightKg) : null,
      emergency_contact_name: editEmergencyContactName || null,
      emergency_contact_phone: editEmergencyContactPhone || null,
    })
    .eq('id', id)

  if (error) {
    setError(error.message)
  } else {
    setEditMode(false)
    fetchMember()
  }
}

const handleGenerateSummary = async () => {
  setSummaryLoading(true)
  setSummaryResult(null)
  setError('')

  const recordsForSummary = records
    .filter((r) => r.extracted_data && !r.extracted_data.error)
    .map((r) => ({
      record_type: r.record_type,
      date: new Date(r.created_at).toLocaleDateString(),
      doctor: r.doctor_name,
      hospital: r.hospital_name,
      medicines: r.extracted_data?.medicines,
      notes: r.extracted_data?.notes,
    }))

  if (recordsForSummary.length === 0) {
    setError('No processed records yet to summarize')
    setSummaryLoading(false)
    return
  }

  try {
    const res = await fetch('/api/visit-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberName: member.name, records: recordsForSummary }),
    })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setSummaryResult(data)
  } catch {
    setError('Summary failed, try again')
  }
  setSummaryLoading(false)
}

const handleDeleteMember = async () => {
  const confirmed = window.confirm(`Delete ${member.name} and all their records? This can't be undone.`)
  if (!confirmed) return

  const { error } = await supabase.from('family_members').delete().eq('id', id)
  if (error) {
    setError(error.message)
  } else {
    window.location.href = '/profile'
  }
}

  const fetchMember = async () => {
    const { data, error } = await supabase.from('family_members').select('*').eq('id', id).single()
    if (error) setError(error.message)
    else setMember(data)
  }

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('family_member_id', id)
      .order('created_at', { ascending: false })
    if (!error) setRecords(data || [])
  }

  useEffect(() => {
    fetchMember()
    fetchRecords()
  }, [id])

  const handleUploadRecord = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Choose a file first')
      return
    }
    setUploading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Not logged in')
      setUploading(false)
      return
    }
    const filePath = `${user.id}/${Date.now()}_${file.name}`
    const { error: uploadError } = await supabase.storage.from('medical-records').upload(filePath, file)
    if (uploadError) {
      setError(uploadError.message)
      setUploading(false)
      return
    }
    const { data: insertedRecord, error: insertError } = await supabase
      .from('medical_records')
      .insert({
        user_id: user.id,
        family_member_id: id,
        record_type: recordType,
        file_url: filePath,
        doctor_name: doctorName || null,
        hospital_name: hospitalName || null,
      })
      .select()
      .single()
    if (insertError) {
      setError(insertError.message)
    } else {
      setFile(null)
      setDoctorName('')
      setHospitalName('')
      setShowUploadForm(false)
      fetchRecords()
      setShowToast(true)
      setTimeout(() => setShowToast(false), 2500)
      const { data: { session } } = await supabase.auth.getSession()
      fetch('/api/extract-record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ recordId: insertedRecord.id }),
      }).then(() => fetchRecords())
    }
    setUploading(false)
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link href="/profile" className="text-sm text-text-secondary hover:text-foreground transition mb-8 inline-block">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to family
        </Link>
        <Link href={`/profile/family/${id}/vaccinations`} className="ml-3 text-sm text-sage hover:opacity-80 transition mb-8 inline-block">
  <i className="ti ti-vaccine" style={{ marginRight: 4 }}></i>Vaccinations
</Link>

<Link href={`/profile/family/${id}/interactions`} className="ml-3 text-sm text-taupe hover:opacity-80 transition mb-8 inline-block">
  <i className="ti ti-flask" style={{ marginRight: 4 }}></i>Check interactions
</Link>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-50 text-red-800 text-sm">{error}</div>
        )}

        {/* Member details */}
<section className="mb-8">
  {!editMode ? (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-sage flex items-center justify-center text-white text-xl font-medium">
            {initials(member.name)}
          </div>
          <div>
            <p className="text-lg font-medium text-foreground">{member.name}</p>
            <p className="text-sm text-text-secondary capitalize">{member.relation}</p>
            <p className="text-xs text-text-secondary mt-1 capitalize">
              {member.gender || '—'} · {member.blood_group || '—'} {member.dob && `· DOB ${member.dob}`}
            </p>
          </div>
        </div>
      </div>
      <div className="flex gap-2 pt-3 border-t border-border">
  <button onClick={startEdit} className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-background transition">
    <i className="ti ti-edit" style={{ marginRight: 4 }}></i>Edit
  </button>
  {member.relation?.toLowerCase() !== 'self' && (
    <button onClick={handleDeleteMember} className="text-sm px-3 py-1.5 rounded-full border border-red-300 text-red-800 hover:bg-red-50 transition">
      <i className="ti ti-trash" style={{ marginRight: 4 }}></i>Delete
    </button>
  )}
</div>
    </div>
  ) : (
    <form onSubmit={handleSaveEdit} className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
      <input placeholder="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Relation" value={editRelation} onChange={(e) => setEditRelation(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input type="date" value={editDob} onChange={(e) => setEditDob(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Gender" value={editGender} onChange={(e) => setEditGender(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Blood group" value={editBloodGroup} onChange={(e) => setEditBloodGroup(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Allergies (comma separated)" value={editAllergies} onChange={(e) => setEditAllergies(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Known conditions (comma separated)" value={editKnownConditions} onChange={(e) => setEditKnownConditions(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <div className="grid grid-cols-2 gap-3">
        <input placeholder="Height (cm)" type="number" value={editHeightCm} onChange={(e) => setEditHeightCm(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
        <input placeholder="Weight (kg)" type="number" value={editWeightKg} onChange={(e) => setEditWeightKg(e.target.value)}
          className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      </div>
      <input placeholder="Emergency contact name" value={editEmergencyContactName} onChange={(e) => setEditEmergencyContactName(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <input placeholder="Emergency contact phone" value={editEmergencyContactPhone} onChange={(e) => setEditEmergencyContactPhone(e.target.value)}
        className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
      <div className="flex gap-2">
        <button type="submit" className="px-4 py-2 rounded-xl bg-sage text-white text-sm font-medium hover:opacity-90 transition">
          Save changes
        </button>
        <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-background transition">
          Cancel
        </button>
      </div>
    </form>
  )}
</section>

{/* AI Visit Summary */}
<section className="mb-8">
  <div className="flex items-center justify-between mb-3">
    <div className="flex items-center gap-2">
      <i className="ti ti-sparkles" style={{ color: 'var(--color-sage)', fontSize: 18 }}></i>
      <h2 className="text-lg font-medium text-foreground">Health summary</h2>
    </div>
    <button
      onClick={handleGenerateSummary}
      disabled={summaryLoading}
      className="text-sm px-3 py-1.5 rounded-full bg-sage text-[#0F1115] hover:opacity-90 transition disabled:opacity-50"
    >
      {summaryLoading ? 'Generating…' : summaryResult ? 'Regenerate' : 'Generate summary'}
    </button>
  </div>

  {summaryResult && (
    <div className="flex flex-col gap-3">
      <div className="bg-card rounded-2xl border border-border p-4">
        <p className="text-sm text-foreground">{summaryResult.overview}</p>
      </div>

      {summaryResult.timeline?.length > 0 && (
        <div className="flex flex-col gap-2">
          {summaryResult.timeline.map((t: any, i: number) => (
            <div key={i} className="flex gap-3">
              <div className="w-2 h-2 rounded-full bg-sage mt-1.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-text-secondary">{t.date}</p>
                <p className="text-sm text-foreground">{t.summary}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-taupe-light rounded-2xl p-4">
        <p className="text-xs text-text-secondary mb-1">Key takeaway</p>
        <p className="text-sm text-foreground">{summaryResult.key_takeaway}</p>
      </div>

      <p className="text-xs text-text-muted">{summaryResult.disclaimer}</p>
    </div>
  )}
</section>

        {/* Prescriptions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-foreground">Prescriptions & records</h2>
            <button
              onClick={() => setShowUploadForm(!showUploadForm)}
              className="text-sm px-3 py-1.5 rounded-full bg-sage text-white hover:opacity-90 transition"
            >
              {showUploadForm ? 'Cancel' : '+ Add prescription'}
            </button>
          </div>

          {showUploadForm && (
            <form onSubmit={handleUploadRecord} className="bg-card rounded-2xl border border-border p-4 mb-4 flex flex-col gap-3">
              <select value={recordType} onChange={(e) => setRecordType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage">
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab report</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Doctor name (optional)" value={doctorName} onChange={(e) => setDoctorName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Hospital / clinic name (optional)" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <label className="px-3 py-2 rounded-xl border border-border bg-background text-sm text-text-secondary cursor-pointer hover:border-sage transition flex items-center gap-2">
  <i className="ti ti-upload" style={{ fontSize: 16 }}></i>
  {file ? file.name : 'Choose a file to upload'}
  <input
    type="file"
    accept="image/*,application/pdf"
    onChange={(e) => setFile(e.target.files?.[0] || null)}
    className="hidden"
  />
</label>
              <button type="submit" disabled={uploading}
                className="px-4 py-2 rounded-xl bg-taupe text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          )}

          <div className="flex flex-col gap-2">
            {records.length === 0 && (
              <div className="bg-card rounded-2xl border border-border p-4 text-sm text-text-secondary">
                No prescriptions yet for {member.name}.
              </div>
            )}
            {records.map((r) => (
              <Link
                key={r.id}
                href={`/profile/family/${id}/records/${r.id}`}
                className="bg-card rounded-2xl border border-border p-4 hover:border-sage transition block"
              >
                <p className="text-sm font-medium text-foreground capitalize">{r.record_type?.replace('_', ' ')}</p>
                <p className="text-xs text-text-secondary">
                  {new Date(r.created_at).toLocaleDateString()} · {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
      <Toast message="Prescription uploaded" show={showToast} />
    </div>
  )
}