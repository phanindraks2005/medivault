'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function initials(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?'
}

export default function EmergencyCardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const [member, setMember] = useState<any>(null)
  const [medicines, setMedicines] = useState<string[]>([])

  useEffect(() => {
    const load = async () => {
      const { data: memberData } = await supabase.from('family_members').select('*').eq('id', id).single()
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

  if (!member) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-5 py-6">
          <p className="text-sm text-text-secondary">Loading…</p>
        </div>
      </div>
    )
  }

  const allergyList = member.allergies
    ? member.allergies.split(',').map((a: string) => a.trim()).filter(Boolean)
    : []
  const conditionList = member.known_conditions
    ? member.known_conditions.split(',').map((c: string) => c.trim()).filter(Boolean)
    : []

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-5 py-6">
        <Link href={`/profile/family/${id}`} className="text-sm text-text-secondary hover:text-foreground transition mb-6 inline-block print:hidden">
          <i className="ti ti-arrow-left" style={{ marginRight: 4 }}></i>Back
        </Link>

        <div className="bg-card rounded-2xl border-2 border-red-300 p-6">
          <div className="flex items-center gap-2 mb-4">
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#993C1D' }}></i>
            <p className="text-sm font-medium" style={{ color: '#993C1D' }}>Emergency information</p>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-sage flex items-center justify-center text-white text-2xl font-medium">
              {initials(member.name)}
            </div>
            <div>
              <p className="text-xl font-medium text-foreground">{member.name}</p>
              <p className="text-sm text-text-secondary capitalize">{member.relation} {member.dob && `· DOB ${member.dob}`}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-sage-light rounded-2xl p-4">
              <p className="text-xs text-text-secondary">Blood group</p>
              <p className="text-lg font-medium text-foreground mt-1">{member.blood_group || 'Not recorded'}</p>
            </div>
            <div className="bg-taupe-light rounded-2xl p-4">
              <p className="text-xs text-text-secondary">Gender</p>
              <p className="text-lg font-medium text-foreground mt-1 capitalize">{member.gender || 'Not recorded'}</p>
            </div>
          </div>

          {(member.height_cm || member.weight_kg) && (
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-text-secondary">Height</p>
                <p className="text-lg font-medium text-foreground mt-1">{member.height_cm ? `${member.height_cm} cm` : 'Not recorded'}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-xs text-text-secondary">Weight</p>
                <p className="text-lg font-medium text-foreground mt-1">{member.weight_kg ? `${member.weight_kg} kg` : 'Not recorded'}</p>
              </div>
            </div>
          )}

          <div className="bg-red-50 rounded-2xl p-4 mb-3">
            <p className="text-xs" style={{ color: '#993C1D' }}>Allergies</p>
            {allergyList.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {allergyList.map((a: string, i: number) => (
                  <span key={i} className="text-sm font-medium px-3 py-1 rounded-full bg-red-100" style={{ color: '#791F1F' }}>
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground mt-1">None recorded</p>
            )}
          </div>

          <div className="bg-taupe-light rounded-2xl p-4 mb-3">
            <p className="text-xs text-text-secondary">Known conditions</p>
            {conditionList.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-2">
                {conditionList.map((c: string, i: number) => (
                  <span key={i} className="text-sm font-medium px-3 py-1 rounded-full bg-card">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground mt-1">None recorded</p>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 mb-3">
            <p className="text-xs text-text-secondary">Current / recent medicines</p>
            {medicines.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1">
                {medicines.map((m, i) => (
                  <li key={i} className="text-sm text-foreground">{m}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-foreground mt-1">None recorded</p>
            )}
          </div>

          {(member.emergency_contact_name || member.emergency_contact_phone) && (
            <div className="bg-sage-light rounded-2xl p-4">
              <p className="text-xs text-text-secondary">Emergency contact</p>
              <p className="text-sm font-medium text-foreground mt-1">{member.emergency_contact_name || 'Not named'}</p>
              {member.emergency_contact_phone && (
                <a href={`tel:${member.emergency_contact_phone}`} className="text-sm mt-1 inline-block" style={{ color: '#0F6E56' }}>
                  <i className="ti ti-phone" style={{ marginRight: 4 }}></i>{member.emergency_contact_phone}
                </a>
              )}
            </div>
          )}

          <p className="text-xs text-text-muted mt-4 text-center">
            Generated by MediVault · Not a substitute for professional medical advice
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="w-full mt-4 px-4 py-2.5 rounded-xl bg-taupe text-white text-sm font-medium hover:opacity-90 transition print:hidden"
        >
          <i className="ti ti-printer" style={{ marginRight: 6 }}></i>Print / save as PDF
        </button>
      </div>
    </div>
  )
}