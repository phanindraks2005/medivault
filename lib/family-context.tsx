'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { memberColors } from '@/lib/family'
import { useDemo } from '@/lib/demo/mode'

export type Member = {
  id: string
  name: string
  relation: string | null
  dob: string | null
  gender: string | null
  blood_group: string | null
  allergies: string | null
  known_conditions: string | null
  created_at: string
}

type FamilyState = {
  status: 'loading' | 'ready' | 'error' | 'signed-out'
  email: string
  members: Member[]
  colors: Record<string, string>
  self: Member | undefined
  demo: boolean
  reload: () => Promise<void>
}

const FamilyContext = createContext<FamilyState | null>(null)

export function FamilyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<FamilyState['status']>('loading')
  const [email, setEmail] = useState('')
  const [members, setMembers] = useState<Member[]>([])
  // In a demo tab the same queries are answered by the sample family.
  const demo = useDemo()

  const reload = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('signed-out')
      return
    }
    setEmail(user.email || '')
    const { data, error } = await supabase
      .from('family_members')
      .select('id, name, relation, dob, gender, blood_group, allergies, known_conditions, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
    if (error) {
      setStatus('error')
      return
    }
    setMembers(data || [])
    setStatus('ready')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload])

  const value = useMemo<FamilyState>(
    () => ({
      status,
      email,
      members,
      colors: memberColors(members),
      self: members.find((m) => m.relation?.toLowerCase() === 'self'),
      demo,
      reload,
    }),
    [status, email, members, demo, reload]
  )

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily() {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily must be used inside FamilyProvider')
  return ctx
}
