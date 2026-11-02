'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AuthSplit from '@/components/auth/AuthSplit'
import { PrescriptionScene } from '@/components/landing/scenes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'

type Mode = 'login' | 'signup'

// Supabase's messages are written for developers; these are for the person signing in.
function friendly(message: string) {
  const m = message.toLowerCase()
  if (m.includes('invalid login')) return "That email and password don't match. Check them and try again."
  if (m.includes('already registered')) return 'An account with this email already exists. Log in instead.'
  if (m.includes('password should be')) return 'Use a password with at least 6 characters.'
  if (m.includes('invalid') && m.includes('email')) return 'That email address doesn’t look right.'
  if (m.includes('rate limit')) return 'Too many attempts. Wait a minute and try again.'
  return message
}

export default function AuthForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'signup' ? 'signup' : 'login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(friendly(error.message))
      else router.push('/onboarding')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(friendly(error.message))
      else router.push('/dashboard')
    }
    setLoading(false)
  }

  return (
    <AuthSplit scene={<PrescriptionScene />} caption="Every prescription, read for you and dated on one calendar.">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2, ease }}>
            <h1 className="font-heading text-[28px] leading-[1.1] tracking-[-0.03em] sm:text-[32px]">
              {mode === 'signup' ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="mt-2 text-[16px] text-ink-2">
              {mode === 'signup' ? 'Start with your own profile, then add your family.' : 'Log in to see your family’s calendar.'}
            </p>
          </motion.div>
        </AnimatePresence>

        <div role="tablist" aria-label="Log in or sign up" className="relative mt-8 grid grid-cols-2 rounded-full bg-muted p-1">
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              role="tab"
              type="button"
              aria-selected={mode === m}
              tabIndex={mode === m ? 0 : -1}
              onClick={() => switchMode(m)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault()
                  const next = mode === 'login' ? 'signup' : 'login'
                  switchMode(next)
                  const sib = (e.currentTarget.parentElement?.children[next === 'login' ? 0 : 1] as HTMLElement | undefined)
                  sib?.focus()
                }
              }}
              className={cn('relative h-10 rounded-full text-[15px] font-medium transition-colors duration-150', mode === m ? 'text-ink' : 'text-ink-2 hover:text-ink')}
            >
              {mode === m && (
                <motion.span layoutId="auth-tab" className="absolute inset-0 rounded-full bg-surface shadow-[var(--shadow-card)]" transition={{ duration: 0.25, ease }} />
              )}
              <span className="relative">{m === 'login' ? 'Log in' : 'Sign up'}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-5" noValidate={false}>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[14px] font-medium text-ink-2">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password" className="text-[14px] font-medium text-ink-2">Password</Label>
              {mode === 'signup' && (
                <span id="password-hint" className="text-[13px] text-ink-3">At least 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                aria-describedby={mode === 'signup' ? 'password-hint' : undefined}
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-ink-3 transition-colors hover:bg-muted hover:text-ink"
              >
                {showPassword ? <EyeOff className="size-[18px]" aria-hidden="true" /> : <Eye className="size-[18px]" aria-hidden="true" />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p
                role="alert"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <Button type="submit" size="lg" disabled={loading} className="w-full">
            {loading && <Loader2 className="animate-spin" aria-hidden="true" />}
            {loading ? (mode === 'signup' ? 'Creating account…' : 'Logging in…') : mode === 'signup' ? 'Create account' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-[15px] text-ink-2">
          Just looking?{' '}
          <Link href="/demo" className="font-medium text-band underline-offset-4 hover:underline">
            Try the demo with a sample family
          </Link>
        </p>
      </motion.div>
    </AuthSplit>
  )
}
