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

// The household's name for the shell, from the account holder's surname.
function familyName(name?: string) {
  const parts = (name || '').trim().split(/\s+/)
  return parts.length > 1 ? `${parts[parts.length - 1]} family` : 'Your family'
}

// A tinted frame (sidebar on the page ground) around a white sheet, as in
// Stripe's dashboard: colour stays on the data, not on the chrome.
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || ''
  const router = useRouter()
  const { status, members, colors, self, email, demo } = useFamily()

  useEffect(() => {
    if (status === 'signed-out') router.replace('/auth')
  }, [status, router])

  // The demo only has the dashboard; everything else asks the visitor to sign up.
  const hrefFor = (href: string) => (demo ? (href === '/dashboard' ? '/demo' : '/auth?mode=signup') : href)
  const isActive = (href: string) => (demo ? href === '/dashboard' : pathname === href || pathname.startsWith(href + '/'))

  const logout = async () => {
    if (demo) return router.push('/')
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const displayName = self?.name || email || 'Your account'
  const household = demo ? 'Sharma family · sample' : familyName(self?.name)

  return (
    <div className="min-h-dvh bg-canvas">
      {/* Desktop sidebar, on the same ground as the frame */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[240px] flex-col px-3 pb-3 pt-5 lg:flex">
        <div className="px-3">
          <Link href={demo ? '/' : '/dashboard'} aria-label="MediVault home" className="inline-flex rounded-full">
            <Logo size={28} />
          </Link>
          <p className="mt-2 truncate text-[13px] text-ink-3">{household}</p>
        </div>

        <nav aria-label="Main" className="mt-6 space-y-0.5">
          {NAV.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={hrefFor(item.href)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-9 items-center gap-2.5 rounded-lg px-3 text-[14px] transition-colors duration-150',
                  active ? 'font-medium text-ink' : 'text-ink-2 hover:bg-slate-200/50 hover:text-ink'
                )}
              >
                {active && <motion.span layoutId="sidebar-active" className="absolute inset-0 rounded-lg bg-[#e6ebf1]" transition={{ duration: 0.25, ease }} />}
                <Icon className={cn('relative size-[17px]', active ? 'text-ink' : 'text-ink-3')} strokeWidth={1.75} aria-hidden="true" />
                <span className="relative">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-7 flex items-center justify-between px-3">
          <h2 className="text-[13px] text-ink-3">Members</h2>
          {!demo && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Link
                    href="/profile?add=1"
                    aria-label="Add a family member"
                    className="grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-[#e6ebf1] hover:text-ink"
                  />
                }
              >
                <Plus className="size-4" aria-hidden="true" />
              </TooltipTrigger>
              <TooltipContent side="right">Add a family member</TooltipContent>
            </Tooltip>
          )}
        </div>
        <ul className="mt-1 space-y-0.5 overflow-y-auto">
          {status === 'loading' &&
            [0, 1, 2].map((i) => (
              <li key={i} className="flex h-10 items-center gap-2.5 px-3">
                <span className="size-6 rounded-full bg-line" />
                <span className="h-3 w-24 rounded bg-line" />
              </li>
            ))}
          {members.map((m) => {
            const href = `/profile/family/${m.id}`
            const active = !demo && pathname.startsWith(href)
            return (
              <li key={m.id}>
                <Link
                  href={demo ? '/auth?mode=signup' : href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex h-10 items-center gap-2.5 rounded-lg px-3 transition-colors duration-150',
                    active ? 'bg-[#e6ebf1]' : 'hover:bg-slate-200/50'
                  )}
                >
                  <MemberAvatar name={m.name} color={colors[m.id]} size={24} />
                  <span className="min-w-0 flex-1 truncate text-[14px] text-ink">{m.name.split(' ')[0]}</span>
                  <span className="text-[12px] text-ink-3">{relationLabel(m.relation)}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-auto flex items-center gap-2.5 rounded-lg px-3 py-2">
          <MemberAvatar name={displayName} color={self ? colors[self.id] : '#5b6b7f'} size={30} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-medium">{displayName}</p>
            <p className="truncate text-[12px] text-ink-3">{demo ? 'Sample family' : email}</p>
          </div>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={logout}
                  aria-label={demo ? 'Leave the demo' : 'Log out'}
                  className="grid size-8 place-items-center rounded-md text-ink-3 transition-colors hover:bg-[#e6ebf1] hover:text-ink"
                />
              }
            >
              <LogOut className="size-4" aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent side="top">{demo ? 'Leave the demo' : 'Log out'}</TooltipContent>
          </Tooltip>
        </div>
      </aside>

      {/* Phone and tablet top bar */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between bg-canvas px-4 shadow-[0_1px_0_var(--line)] lg:hidden">
        <Link href={demo ? '/' : '/dashboard'} aria-label="MediVault home" className="rounded-full">
          <Logo size={26} />
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger render={<button aria-label="Account" className="grid size-11 place-items-center rounded-full" />}>
            <MemberAvatar name={displayName} color={self ? colors[self.id] : '#5b6b7f'} size={30} />
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

      {/* The white sheet */}
      <div className="lg:py-2 lg:pl-[240px] lg:pr-2">
        <div className="min-h-[calc(100dvh-48px)] bg-surface lg:min-h-[calc(100dvh-16px)] lg:rounded-2xl lg:border lg:border-line">
          {demo && (
            <div className="px-4 pt-4 sm:px-6">
              <p className="mx-auto flex max-w-[1100px] flex-wrap items-center justify-between gap-2 rounded-lg bg-due-soft px-4 py-2.5 text-[14px] text-due-ink">
                <span>You&apos;re looking at a sample family. Nothing here is real data.</span>
                <Link href="/auth?mode=signup" className="font-medium underline underline-offset-4">
                  Sign up to add yours
                </Link>
              </p>
            </div>
          )}
          <main className="pb-24 lg:pb-0">{children}</main>
        </div>
      </div>

      {/* Phone bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 bg-surface pb-[env(safe-area-inset-bottom)] shadow-[0_-1px_0_var(--line)] lg:hidden"
      >
        {NAV.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={hrefFor(item.href)}
              aria-current={active ? 'page' : undefined}
              className={cn('relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-[12px] font-medium', active ? 'text-ink' : 'text-ink-3')}
            >
              {active && <motion.span layoutId="tab-active" className="absolute top-0 h-[2px] w-10 rounded-b-full bg-band" transition={{ duration: 0.25, ease }} />}
              <Icon className="size-[22px]" strokeWidth={active ? 2 : 1.75} aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
