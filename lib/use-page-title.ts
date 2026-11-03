'use client'

import { useEffect } from 'react'

// Signed-in pages are client components, so a title that needs data (a
// person's name) is set here once it has loaded. Each route's layout gives
// the static title used before that.
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · MediVault`
  }, [title])
}
