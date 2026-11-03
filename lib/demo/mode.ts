'use client'

import { useSyncExternalStore } from 'react'
import { resetDemo } from '@/lib/demo/db'

// The public demo runs the real app screens against a sample family kept in
// memory. Whether this tab is in the demo is a sessionStorage flag: /demo sets
// it, leaving the demo, the landing page and /auth clear it. Being per tab, it
// never leaks into another tab where someone is signed in.
const KEY = 'medivault-demo'
const listeners = new Set<() => void>()

export function isDemo() {
  if (typeof window === 'undefined') return false
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

function set(on: boolean) {
  try {
    if (on) sessionStorage.setItem(KEY, '1')
    else sessionStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the demo just won't stick across reloads.
  }
  listeners.forEach((l) => l())
}

// Each visit to /demo starts from the untouched sample family.
export const enterDemo = () => {
  resetDemo()
  set(true)
}
export const leaveDemo = () => {
  if (!isDemo()) return
  resetDemo()
  set(false)
}

// For rendering: false on the server and during hydration, then the real value.
export function useDemo() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    isDemo,
    () => false
  )
}
