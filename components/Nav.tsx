'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const tabs = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Doc', href: '/doc' },
  { label: 'Profile', href: '/profile' },
]

function initials(name: string) {
  return name?.trim()?.[0]?.toUpperCase() || '?'
}

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('family_members')
        .select('name')
        .eq('user_id', user.id)
        .eq('relation', 'self')
        .single()
      setName(data?.name || user.email || '')
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="border-b border-border">
      <div className="max-w-3xl mx-auto px-5 flex items-center justify-between py-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Logo size={28} />
            <p className="text-sm font-semibold text-foreground">MediVault.</p>
          </Link>
          <div className="flex items-center gap-5">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href || pathname?.startsWith(tab.href + '/')
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`text-sm font-medium pb-1 border-b-2 transition ${
                    isActive
                      ? 'text-foreground border-sage'
                      : 'text-text-secondary border-transparent hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-card border border-border flex items-center justify-center text-xs font-medium text-foreground">
            {initials(name)}
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-full border border-border text-text-secondary hover:text-foreground hover:border-sage transition"
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  )
}