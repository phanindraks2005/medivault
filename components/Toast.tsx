'use client'

import { AnimatePresence, motion } from 'framer-motion'

type ToastProps = {
  message: string
  show: boolean
}

export default function Toast({ message, show }: ToastProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-sage text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 z-50"
        >
          <i className="ti ti-check" style={{ fontSize: 16 }}></i>
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}