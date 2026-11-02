'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion } from 'motion/react'
import { CalendarDays, LogOut, MessageCircle, Plus, Users } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import { relationLabel } from '@/lib/family'
import { ease } from '@/lib/motion'
import Logo from '@/components/Logo'
import MemberAvatar from '@/components/app/MemberAvatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Today', href: '/dashboard', icon: CalendarDays },
  { label: 'Family', href: '/profile', icon: Users },
  { label: 'Ask Doc', href: '/doc', icon: MessageCircle },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const { status, members, colors, self, email, demo } = useFamily()

  useEffect(() => {
    if (status === 'signed-out') router.replace('/auth')
  }, [status, router])

  // The demo only has the dashboard; everything else asks the visitor to sign up.
  const hrefFor = (href: string) => (demo ? (href === '/dashboard' ? '/demo' : '/auth?mode=signup') : href)
  const isActive = (href: string) =>
    demo ? href === '/dashboard' : pathname === href || pathname.startsWith(href + '/')

  const logout = async () => {
    if (demo) return router.push('/')
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = self?.name || email || 'Your account'

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop sidebar */}
      <aside
        className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[272px] flex-col text-white"
        style={{ background: 'linear-gradient(180deg, #0b6b60 0%, #08524a 100%)' }}
      >
        <div className="px-6 pt-7 pb-6">
          <Link href={demo ? '/' : '/dashboard'} aria-label="MediVault home">
            <Logo tone="white" size={34} />
          </Link>
        </div>

        <nav aria-label="Main" className="px-3 space-y-1">
          {NAV.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex items-center gap-3 h-11 px-3 rounded-xl text-[15px] font-medium transition-colors duration-150',
                  active ? 'text-white' : 'text-white/75 hover:text-white hover:bg-white/[0.06]'
                )}
              >
                {active && (
                  <motion.span
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-white/[0.14] shadow-[inset_0_1px_0_rgb(255_255_255/0.12)]"
                    transition={{ duration: 0.28, ease }}
                  />
                )}
                <Icon className="relative size-[19px]" strokeWidth={1.9} aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8 px-6 flex items-center justify-between">
          <h2 className="text-[13px] font-medium text-white/60">Family members</h2>
          {!demo && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/profile?add=1"
                    aria-label="Add a family member"
                    className="grid size-7 place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  />
                }
              >
                <Plus className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="right">Add a family member</TooltipContent>
            </Tooltip>
          )}
        </div>
        <ul className="mt-2 px-3 space-y-0.5 overflow-y-auto">
          {status === 'loading' &&
            [0, 1, 2].map((i) => (
              <li key={i} className="flex items-center gap-3 h-11 px-3">
                <span className="size-7 rounded-full bg-white/10 animate-pulse" />
                <span className="h-3 w-28 rounded bg-white/10 animate-pulse" />
              </li>
            ))}
          {members.map((m) => {
            const href = `/profile/family/${m.id}`
            const active = !demo && pathname.startsWith(href)
            return (
              <li key={m.id}>
                <Link
                  href={demo ? '/auth?mode=signup' : href}
                  className={cn(
                    'flex items-center gap-3 h-11 px-3 rounded-xl transition-colors duration-150',
                    active ? 'bg-white/[0.14]' : 'hover:bg-white/[0.06]'
                  )}
                >
                  <MemberAvatar name={m.name} color={colors[m.id]} size={28} ring />
                  <span className="min-w-0 leading-tight">
                    <span className="block truncate text-[14px] font-medium">{m.name}</span>
                    <span className="block text-[12px] text-white/60">{relationLabel(m.relation)}</span>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto p-3">
          <div className="flex items-center gap-3 rounded-xl bg-black/15 p-3">
            <MemberAvatar name={displayName} color={self ? colors[self.id] : '#5b6b7f'} size={34} ring />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[14px] font-semibold">{displayName}</p>
              <p className="truncate text-[12px] text-white/60">{demo ? 'Sample family' : email}</p>
            </div>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    onClick={logout}
                    aria-label={demo ? 'Leave the demo' : 'Log out'}
                    className="grid size-9 place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                  />
                }
              >
                <LogOut className="size-[18px]" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="top">{demo ? 'Leave the demo' : 'Log out'}</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </aside>

      {/* Phone and tablet top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center justify-between border-b border-line/70 bg-surface/85 backdrop-blur-md">
        <Link href={demo ? '/' : '/dashboard'} aria-label="MediVault home">
          <Logo size={28} />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<button aria-label="Account" className="rounded-full focus-visible:outline-2 focus-visible:outline-ring" />}
          >
            <MemberAvatar name={displayName} color={self ? colors[self.id] : '#5b6b7f'} size={32} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="truncate">{demo ? 'Sample family' : email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout}>
              <LogOut className="size-4" aria-hidden="true" /> {demo ? 'Leave the demo' : 'Log out'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div className="lg:pl-[272px]">
        {demo && (
          <div className="bg-due-soft text-due-ink text-[14px]">
            <div className="max-w-[1240px] mx-auto px-4 md:px-8 py-2.5 flex flex-wrap items-center justify-between gap-2">
              <span>You&apos;re looking at a sample family. Nothing here is real data.</span>
              <Link href="/auth?mode=signup" className="font-semibold underline underline-offset-4">
                Sign up to add yours
              </Link>
            </div>
          </div>
        )}
        <main className="pb-24 lg:pb-0">{children}</main>
      </div>

      {/* Phone bottom navigation */}
      <nav
        aria-label="Main"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 grid grid-cols-3 border-t border-line/70 bg-surface/90 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
      >
        {NAV.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={hrefFor(item.href)}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex flex-col items-center gap-0.5 pt-2.5 pb-2 text-[12px] font-medium', active ? 'text-band' : 'text-ink-3')}
            >
              {active && (
                <motion.span layoutId="tab-active" className="absolute top-0 h-[3px] w-10 rounded-b-full bg-band" transition={{ duration: 0.28, ease }} />
              )}
              <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
