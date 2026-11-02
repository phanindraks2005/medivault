'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import FloatingMeds from '@/components/FloatingMeds'
import Logo from '@/components/Logo'

export default function AuthPage() {
  const [isSignup, setIsSignup] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignup) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else router.push('/onboarding')
      }else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else router.push('/dashboard')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-5">
      <FloatingMeds />

      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <Logo size={48} />
          <h1 className="text-xl font-semibold text-foreground mt-4">MediVault</h1>
          <p className="text-sm text-text-secondary mt-1">Your family's health, all in one place</p>
        </div>

        <div className="bg-card border border-border rounded-3xl p-6 shadow-2xl">
          <h2 className="text-lg font-medium text-foreground mb-5">{isSignup ? 'Create your account' : 'Welcome back'}</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage transition"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1.5 block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground focus:outline-none focus:border-sage transition"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded-xl bg-red-950 text-red-200 text-xs">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-2.5 rounded-xl bg-sage text-[#0F1115] text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Loading…' : isSignup ? 'Sign up' : 'Log in'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-5">
            {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-sage font-medium hover:opacity-80 transition"
            >
              {isSignup ? 'Log in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}