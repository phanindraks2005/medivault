'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Medicine = { name: string; dosage?: string; frequency?: string }

export default function RecordDetailPage({ params }: { params: Promise<{ id: string; recordId: string }> }) {
  const { id, recordId } = use(params)
  const router = useRouter()

  const [record, setRecord] = useState<any>(null)
  const [member, setMember] = useState<any>(null)
  const [error, setError] = useState('')

  const [editMode, setEditMode] = useState(false)
  const [editRecordType, setEditRecordType] = useState('prescription')
  const [editDoctorName, setEditDoctorName] = useState('')
  const [editHospitalName, setEditHospitalName] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editMedicines, setEditMedicines] = useState<Medicine[]>([])

  const load = async () => {
    const { data: recordData, error: recordError } = await supabase
      .from('medical_records')
      .select('*')
      .eq('id', recordId)
      .single()
    if (recordError) setError(recordError.message)
    else setRecord(recordData)

    const { data: memberData } = await supabase
      .from('family_members')
      .select('name')
      .eq('id', id)
      .single()
    setMember(memberData)
  }

  useEffect(() => {
    load()
  }, [id, recordId])

  const startEdit = () => {
    setEditRecordType(record.record_type || 'prescription')
    setEditDoctorName(record.doctor_name || '')
    setEditHospitalName(record.hospital_name || '')
    setEditNotes(record.extracted_data?.notes || '')
    setEditMedicines(record.extracted_data?.medicines?.length ? record.extracted_data.medicines : [{ name: '', dosage: '', frequency: '' }])
    setEditMode(true)
  }

  const updateMedicine = (index: number, field: keyof Medicine, value: string) => {
    setEditMedicines((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)))
  }

  const addMedicineRow = () => {
    setEditMedicines((prev) => [...prev, { name: '', dosage: '', frequency: '' }])
  }

  const removeMedicineRow = (index: number) => {
    setEditMedicines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanedMedicines = editMedicines.filter((m) => m.name.trim() !== '')
    const newExtractedData = {
      ...(record.extracted_data || {}),
      medicines: cleanedMedicines,
      notes: editNotes || null,
    }

    const { error } = await supabase
      .from('medical_records')
      .update({
        record_type: editRecordType,
        doctor_name: editDoctorName || null,
        hospital_name: editHospitalName || null,
        extracted_data: newExtractedData,
      })
      .eq('id', recordId)

    if (error) {
      setError(error.message)
    } else {
      setEditMode(false)
      load()
    }
  }

  const handleDelete = async () => {
    const confirmed = window.confirm("Delete this record? This can't be undone.")
    if (!confirmed) return

    const { error } = await supabase.from('medical_records').delete().eq('id', recordId)
    if (error) {
      setError(error.message)
    } else {
      router.push(`/profile/family/${id}`)
    }
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      </div>
    )
  }

  const extracted = record.extracted_data

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-5 py-6">
        <Link href={`/profile/family/${id}`} className="text-sm text-text-secondary hover:text-foreground transition mb-8 inline-block">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back to {member?.name || 'records'}
        </Link>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-2xl bg-red-50 text-red-800 text-sm">{error}</div>
        )}

        {!editMode ? (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-xl font-medium text-foreground capitalize">{record.record_type?.replace('_', ' ')}</h1>
                <p className="text-sm text-text-secondary mt-1">
                  {new Date(record.created_at).toLocaleDateString()} · {new Date(record.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={startEdit} className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-card transition">
                  <i className="ti ti-edit" style={{ marginRight: 4 }}></i>Edit
                </button>
                <button onClick={handleDelete} className="text-sm px-3 py-1.5 rounded-full border border-red-300 text-red-800 hover:bg-red-50 transition">
                  <i className="ti ti-trash" style={{ marginRight: 4 }}></i>Delete
                </button>
              </div>
            </div>

            {!extracted && (
              <div className="bg-card rounded-2xl border border-border p-4 text-sm text-text-secondary">
                Still processing this record — check back in a moment.
              </div>
            )}

            {extracted?.error && (
              <div className="bg-card rounded-2xl border border-border p-4 text-sm text-text-secondary">
                Couldn't extract details from this file automatically.
              </div>
            )}

            {extracted && !extracted.error && (
              <div className="flex flex-col gap-4">
                {(record.doctor_name || record.hospital_name) && (
                  <div className="bg-card rounded-2xl border border-border p-4">
                    {record.doctor_name && (
                      <>
                        <p className="text-xs text-text-secondary">Doctor</p>
                        <p className="text-sm font-medium text-foreground mt-1">{record.doctor_name}</p>
                      </>
                    )}
                    {record.hospital_name && (
                      <>
                        <p className="text-xs text-text-secondary mt-3">Hospital / clinic</p>
                        <p className="text-sm font-medium text-foreground mt-1">{record.hospital_name}</p>
                      </>
                    )}
                  </div>
                )}

                {extracted.medicines?.length > 0 && (
                  <div>
                    <h2 className="text-sm font-medium text-foreground mb-2">Medicines</h2>
                    <div className="flex flex-col gap-2">
                      {extracted.medicines.map((med: Medicine, i: number) => (
                        <div key={i} className="bg-sage-light rounded-2xl p-4">
                          <p className="text-sm font-medium text-foreground">{med.name}</p>
                          <p className="text-xs text-text-secondary mt-1">
                            {med.dosage || 'Dosage not specified'} {med.frequency && `· ${med.frequency}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {extracted.notes && (
                  <div className="bg-card rounded-2xl border border-border p-4">
                    <p className="text-xs text-text-secondary">Notes</p>
                    <p className="text-sm text-foreground mt-1">{extracted.notes}</p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <form onSubmit={handleSaveEdit} className="flex flex-col gap-4">
            <div className="bg-card rounded-2xl border border-border p-4 flex flex-col gap-3">
              <select value={editRecordType} onChange={(e) => setEditRecordType(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage">
                <option value="prescription">Prescription</option>
                <option value="lab_report">Lab report</option>
                <option value="other">Other</option>
              </select>
              <input placeholder="Doctor name" value={editDoctorName} onChange={(e) => setEditDoctorName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
              <input placeholder="Hospital / clinic name" value={editHospitalName} onChange={(e) => setEditHospitalName(e.target.value)}
                className="px-3 py-2 rounded-xl border border-border bg-background text-sm focus:outline-none focus:border-sage" />
            </div>

            <div>
              <h2 className="text-sm font-medium text-foreground mb-2">Medicines</h2>
              <div className="flex flex-col gap-2">
                {editMedicines.map((med, i) => (
                  <div key={i} className="bg-sage-light rounded-2xl p-3 flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input placeholder="Medicine name" value={med.name} onChange={(e) => updateMedicine(i, 'name', e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-sage" />
                      <button type="button" onClick={() => removeMedicineRow(i)} className="px-3 rounded-xl border border-red-300 text-red-800 text-sm hover:bg-red-50 transition">
                        <i className="ti ti-x"></i>
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Dosage" value={med.dosage || ''} onChange={(e) => updateMedicine(i, 'dosage', e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-sage" />
                      <input placeholder="Frequency / timing" value={med.frequency || ''} onChange={(e) => updateMedicine(i, 'frequency', e.target.value)}
                        className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-sage" />
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addMedicineRow} className="text-sm px-3 py-1.5 rounded-full border border-border hover:bg-card transition self-start">
                  + Add medicine
                </button>
              </div>
            </div>

            <textarea placeholder="Notes" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3}
              className="px-3 py-2 rounded-xl border border-border bg-card text-sm focus:outline-none focus:border-sage resize-none" />

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 rounded-xl bg-sage text-white text-sm font-medium hover:opacity-90 transition">
                Save changes
              </button>
              <button type="button" onClick={() => setEditMode(false)} className="px-4 py-2 rounded-xl border border-border text-sm hover:bg-card transition">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}