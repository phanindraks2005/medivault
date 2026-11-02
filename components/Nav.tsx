'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { CalendarDays, LogOut, MessageCircle, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'

const tabs = [
  { label: 'Today', href: '/dashboard', icon: CalendarDays },
  { label: 'Family', href: '/profile', icon: Users },
  { label: 'Ask Doc', href: '/doc', icon: MessageCircle },
]

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const [familyName, setFamilyName] = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('family_members')
        .select('name')
        .eq('user_id', user.id)
        .eq('relation', 'self')
        .maybeSingle()
      setFamilyName(data?.name ? `${data.name.split(' ')[0]}'s family` : user.email || '')
    }
    load()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(href + '/') || (href === '/profile' && pathname?.startsWith('/profile'))

  return (
    <>
      <header className="bg-band text-band-ink">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-2.5 shrink-0">
            <Logo size={26} />
            <span className="font-display text-[22px] font-bold tracking-[0.01em]" style={{ fontStretch: '90%' }}>
              MediVault
            </span>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center gap-7 h-full">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive(tab.href) ? 'page' : undefined}
                className={`h-full flex items-center border-b-[3px] pt-[3px] font-medium transition-colors ${
                  isActive(tab.href)
                    ? 'border-due text-band-ink'
                    : 'border-transparent text-band-ink/80 hover:text-band-ink'
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-4 min-w-0">
            <span className="hidden sm:block text-sm text-band-ink/85 truncate">{familyName}</span>
            <button
              onClick={handleLogout}
              aria-label="Log out"
              className="flex items-center gap-2 h-9 px-3 rounded-[6px] text-sm font-medium text-band-ink/90 hover:bg-band-hover hover:text-band-ink transition-colors"
            >
              <LogOut size={17} strokeWidth={2} aria-hidden="true" />
              <span className="hidden md:inline">Log out</span>
            </button>
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-paper border-t border-rule grid grid-cols-3 pb-[env(safe-area-inset-bottom)]"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-0.5 pt-2 pb-2.5 text-xs font-medium ${
                active ? 'text-band' : 'text-ink-3'
              }`}
            >
              <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden="true" />
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
