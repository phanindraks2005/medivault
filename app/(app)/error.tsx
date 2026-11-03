'use client'

import { useEffect } from 'react'
import { RotateCw } from 'lucide-react'
import { Button, ButtonLink } from '@/components/ui/button'
import { Page, PageHeader } from '@/components/app/kit'

// Anything a screen didn't expect lands here instead of a blank page.
export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Page>
      <PageHeader
        title="Something went wrong"
        sub="This screen hit a problem it couldn't recover from. Your records are safe. Try again, or go back to today's calendar."
        actions={
          <>
            <ButtonLink variant="outline" href="/dashboard">
              Back to today
            </ButtonLink>
            <Button onClick={() => retry()}>
              <RotateCw aria-hidden="true" /> Try again
            </Button>
          </>
        }
      />
    </Page>
  )
}
