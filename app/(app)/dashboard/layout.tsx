import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Today' }

// Rendered per request so the date heading in the HTML is today's, not the build day's.
export const dynamic = 'force-dynamic'

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
