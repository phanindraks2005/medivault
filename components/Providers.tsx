'use client'

import { useEffect } from 'react'
import { MotionConfig } from 'motion/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  // Tells the CSS fail-safe in globals.css that Motion is running now.
  useEffect(() => {
    document.documentElement.classList.add('js-ready')
  }, [])

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={250}>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </MotionConfig>
  )
}
