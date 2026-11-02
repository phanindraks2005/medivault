import type { Metadata } from 'next'
import DemoDashboard from './DemoDashboard'

export const metadata: Metadata = {
  title: 'Demo',
  description: 'Try MediVault with a sample family: calendar, records, vaccinations and allergies.',
}

export default function DemoPage() {
  return <DemoDashboard />
}
