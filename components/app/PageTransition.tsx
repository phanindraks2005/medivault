'use client'

import { useEffect } from 'react'
import { motion } from 'motion/react'
import { ease } from '@/lib/motion'

// The first page a visitor lands on is in the server HTML and should paint at
// once; starting it at opacity 0 made every signed-in page wait for the
// JavaScript (slow LCP). Later in-app navigations still fade in.
let firstPage = true

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const animate = !firstPage
  useEffect(() => {
    firstPage = false
  }, [])

  return (
    <motion.div initial={animate ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease }}>
      {children}
    </motion.div>
  )
}
