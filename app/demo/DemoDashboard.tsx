'use client'

import { FamilyProvider, useFamily } from '@/lib/family-context'
import { sampleFamily, sampleRecords, sampleVaccinations } from '@/lib/sample-family'
import AppShell from '@/components/app/AppShell'
import PageTransition from '@/components/app/PageTransition'
import DashboardView from '@/components/dashboard/DashboardView'

function View() {
  const { members, colors } = useFamily()
  return (
    <DashboardView status="ready" members={members} colors={colors} vaccinations={sampleVaccinations} records={sampleRecords} demo />
  )
}

export default function DemoDashboard() {
  return (
    <FamilyProvider sample={sampleFamily}>
      <AppShell>
        <PageTransition>
          <View />
        </PageTransition>
      </AppShell>
    </FamilyProvider>
  )
}
