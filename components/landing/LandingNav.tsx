'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Logo from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#security', label: 'Privacy' },
]

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)))
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300',
        scrolled ? 'bg-surface/80 shadow-[0_1px_0_rgb(16_24_40/0.06)] backdrop-blur-xl' : 'bg-transparent'
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="MediVault home">
          <Logo size={30} />
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-[15px] font-medium text-ink-2 transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <Button nativeButton={false} render={<Link href="/dashboard" />}>
              Open dashboard <ArrowRight aria-hidden="true" />
            </Button>
          ) : (
            <>
              <Button variant="ghost" className="hidden sm:inline-flex" nativeButton={false} render={<Link href="/auth" />}>
                Log in
              </Button>
              <Button nativeButton={false} render={<Link href="/demo" />}>
                Try the demo
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
