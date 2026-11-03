'use client'

import { useEffect } from 'react'

// Signed-in pages are client components, so a title that needs data (a
// person's name) is set here once it has loaded. Each route's layout gives
// the static title used before that. Next writes its own title when the
// route's metadata arrives, which can land after this effect, so the title
// is put back whenever the <head> changes.
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return
    const full = `${title} · MediVault`
    const apply = () => {
      if (document.title !== full) document.title = full
    }
    apply()
    const observer = new MutationObserver(apply)
    observer.observe(document.head, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [title])
}
