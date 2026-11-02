'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { memberColors } from '@/lib/family'

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

export function FamilyProvider({
  children,
  sample,
}: {
  children: React.ReactNode
  // Sample members for the public demo; skips Supabase entirely.
  sample?: { email: string; members: Member[] }
}) {
  const [status, setStatus] = useState<FamilyState['status']>(sample ? 'ready' : 'loading')
  const [email, setEmail] = useState(sample?.email || '')
  const [members, setMembers] = useState<Member[]>(sample?.members || [])

  const reload = useCallback(async () => {
    if (sample) return
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
  }, [sample])

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
      demo: Boolean(sample),
      reload,
    }),
    [status, email, members, sample, reload]
  )

  return <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
}

export function useFamily() {
  const ctx = useContext(FamilyContext)
  if (!ctx) throw new Error('useFamily must be used inside FamilyProvider')
  return ctx
}
