import type { Metadata } from 'next'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { ButtonLink } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Page not found',
}

// Any unknown address, including a family member or record link that no longer exists.
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-canvas px-4 py-6 sm:px-8">
      <Link href="/" aria-label="MediVault home" className="inline-flex self-start rounded-full">
        <Logo size={28} />
      </Link>
      <div className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center py-16">
        <p className="font-display text-[88px] font-bold leading-none text-ink-3 num" aria-hidden="true">
          404
        </p>
        <h1 className="mt-6 font-heading text-[32px] leading-tight tracking-[-0.03em]">This page isn&apos;t here</h1>
        <p className="mt-3 text-[16px] text-ink-2">
          The link may be old, or the record or family member it pointed to was deleted. Nothing in your records has changed.
        </p>
        <div className="mt-8 flex flex-wrap gap-2">
          <ButtonLink href="/dashboard">Go to today&apos;s calendar</ButtonLink>
          <ButtonLink variant="outline" href="/">
            MediVault home
          </ButtonLink>
        </div>
      </div>
    </main>
  )
}
