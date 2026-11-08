import type { Metadata } from 'next'
import DemoEntry from './DemoEntry'
import { shareMetadata } from '@/lib/share'

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Try every part of MediVault with a sample family: calendar, records, Doc, vaccinations, emergency cards and the AI tools.',
  ...shareMetadata('/demo'),
}

export default function DemoPage() {
  return <DemoEntry />
}
