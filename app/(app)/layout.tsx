import { FamilyProvider } from '@/lib/family-context'
import AppShell from '@/components/app/AppShell'

export default function AppLayout({ children }: LayoutProps<'/'>) {
  return (
    <FamilyProvider>
      <AppShell>{children}</AppShell>
    </FamilyProvider>
  )
}
