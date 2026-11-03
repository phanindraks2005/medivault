import type { Metadata } from 'next'

// Keeps the site-wide template for the pages nested under a member.
export const metadata: Metadata = { title: { default: 'Family member', template: '%s · MediVault' } }

export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
