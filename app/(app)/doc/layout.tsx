import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Ask Doc' }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
