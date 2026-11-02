import type { Metadata } from 'next'
import { Suspense } from 'react'
import AuthForm from './AuthForm'

export const metadata: Metadata = {
  title: 'Log in or sign up',
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
