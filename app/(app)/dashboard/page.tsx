'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import DashboardView from '@/components/dashboard/DashboardView'
import type { MedicalRecord, Vaccination } from '@/components/dashboard/types'

export default function DashboardPage() {
  const family = useFamily()
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [records, setRecords] = useState<MedicalRecord[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const load = useCallback(async () => {
    setStatus('loading')
    // Same as the family list: the stored session saves a round trip before the queries.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    const [v, r] = await Promise.all([
      supabase.from('vaccinations').select('id, family_member_id, vaccine_name, date_given, next_due_date').eq('user_id', user.id),
      supabase
        .from('medical_records')
        .select('id, family_member_id, record_type, record_date, created_at, doctor_name, hospital_name, extracted_data')
        .eq('user_id', user.id)
        .order('record_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false })
        .limit(50),
    ])
    if (v.error || r.error) {
      setStatus('error')
      return
    }
    setVaccinations(v.data || [])
    setRecords(r.data || [])
    setStatus('ready')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const combined = family.status === 'error' ? 'error' : family.status === 'ready' && status === 'ready' ? 'ready' : status === 'error' ? 'error' : 'loading'

  return (
    <DashboardView
      status={combined}
      members={family.members}
      colors={family.colors}
      vaccinations={vaccinations}
      records={records}
      onRetry={() => {
        family.reload()
        load()
      }}
    />
  )
}
