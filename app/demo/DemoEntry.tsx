'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { enterDemo } from '@/lib/demo/mode'

// Turns this tab into the demo and opens the sample family's calendar. Every
// screen then works as normal, answered from sample data in memory.
export default function DemoEntry() {
  const router = useRouter()
  useEffect(() => {
    enterDemo()
    router.replace('/dashboard')
  }, [router])

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4">
      <p className="flex items-center gap-2 text-[15px] text-ink-2" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Opening the Sharma family…
      </p>
    </main>
  )
}
