'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Check, Loader2, Plus, RotateCw, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { aiMessage, askAi } from '@/lib/ai-client'
import { useFamily } from '@/lib/family-context'
import { currentMedicines } from '@/lib/medicines'
import { todayISO } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import MemberAvatar from '@/components/app/MemberAvatar'
import { EmptyLine, ErrorLine, Page, PageHeader, Panel, PanelHead } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { usePageTitle } from '@/lib/use-page-title'
import { LIMITS } from '@/lib/limits'

type Severity = 'none' | 'minor' | 'moderate' | 'major'
type Result = {
  overall_risk: Severity
  summary: string
  interactions: { medicines: string[]; severity: Exclude<Severity, 'none'>; description: string }[]
  disclaimer?: string
}

// Red is kept for the one finding that needs acting on: a major interaction.
const severity: Record<Severity, { label: string; variant: 'ok' | 'neutral' | 'due' | 'overdue' }> = {
  none: { label: 'No known problems', variant: 'ok' },
  minor: { label: 'Minor', variant: 'neutral' },
  moderate: { label: 'Ask your doctor', variant: 'due' },
  major: { label: 'Major: check before taking', variant: 'overdue' },
}

export default function InteractionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { members, colors } = useFamily()
  const member = members.find((m) => m.id === id)
  const first = member?.name.split(' ')[0] || 'Back'
  usePageTitle(member ? `Interaction check · ${member.name}` : null)

  const [onRecord, setOnRecord] = useState<string[]>([])
  const [included, setIncluded] = useState<Set<string>>(new Set())
  const [added, setAdded] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('medical_records').select('id, record_date, created_at, extracted_data').eq('family_member_id', id)
    if (error) return setStatus('error')
    // Finished courses are left out; a new one can still be typed in below.
    const list = currentMedicines(data || [], todayISO()).map((m) => m.name)
    setOnRecord(list)
    setIncluded(new Set(list))
    setStatus('ready')
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const toCheck = [...onRecord.filter((m) => included.has(m)), ...added]

  const addDraft = () => {
    const name = draft.trim()
    if (!name || toCheck.some((m) => m.toLowerCase() === name.toLowerCase())) return setDraft('')
    setAdded((a) => [...a, name])
    setDraft('')
    setResult(null)
  }

  const check = async () => {
    if (toCheck.length < 2) return setError('Choose at least two medicines to check against each other.')
    if (toCheck.length > LIMITS.medicines) return setError(`Check up to ${LIMITS.medicines} medicines at a time. Tap some to leave them out.`)
    setChecking(true)
    setError('')
    setResult(null)
    try {
      setResult(await askAi<Result>('interaction-check', { medicines: toCheck }))
    } catch (e) {
      setError(aiMessage(e))
    }
    setChecking(false)
  }

  const chip = 'inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-[14px] transition-colors duration-150'

  return (
    <Page>
      <PageHeader
        back={{ href: `/profile/family/${id}`, label: member?.name || 'Back' }}
        lead={member ? <MemberAvatar name={member.name} color={colors[id]} size={48} /> : <Skeleton className="size-12 rounded-full" />}
        title="Interaction check"
        sub={`Checks ${member ? `${first}'s` : 'their'} medicines against each other, and against a new one before anyone takes it.`}
      />

      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load the medicines on record.</ErrorLine>}

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <Panel labelledBy="pick" className="lg:col-span-6">
          <PanelHead id="pick" title="Medicines to check" count={toCheck.length} hint="Tap one to leave it out" />

          <p className="mt-4 text-[13px] text-ink-3">On record</p>
          {status === 'loading' && <Skeleton className="mt-2 h-9 w-2/3 rounded-full" />}
          {status === 'ready' && onRecord.length === 0 && <EmptyLine>No medicines have been read from {first}&apos;s records yet. Add them below.</EmptyLine>}
          {onRecord.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {onRecord.map((m) => {
                const on = included.has(m)
                return (
                  <li key={m}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setIncluded((s) => {
                          const n = new Set(s)
                          if (n.has(m)) n.delete(m)
                          else n.add(m)
                          return n
                        })
                        setResult(null)
                      }}
                      className={cn(chip, on ? 'border-band/40 bg-band-soft text-band-deep' : 'border-line bg-surface text-ink-3 line-through')}
                    >
                      {on && <Check className="size-3.5" aria-hidden="true" />}
                      {m}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {added.length > 0 && (
            <>
              <p className="mt-5 text-[13px] text-ink-3">Added for this check</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {added.map((m) => (
                  <li key={m} className={cn(chip, 'border-line bg-surface pr-1.5 text-ink')}>
                    {m}
                    <button
                      type="button"
                      aria-label={`Remove ${m}`}
                      onClick={() => {
                        setAdded((a) => a.filter((x) => x !== m))
                        setResult(null)
                      }}
                      className="grid size-6 place-items-center rounded-full text-ink-3 hover:bg-canvas hover:text-ink"
                    >
                      <X className="size-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault()
              addDraft()
            }}
            className="mt-5 flex gap-2"
          >
            <label htmlFor="new-med" className="sr-only">
              A new medicine to check
            </label>
            <Input id="new-med" maxLength={LIMITS.medicineName} name="new-medicine" autoComplete="off" spellCheck={false} placeholder="A new medicine, e.g. Azithromycin…" value={draft} onChange={(e) => setDraft(e.target.value)} />
            <Button type="submit" variant="outline">
              <Plus aria-hidden="true" /> Add
            </Button>
          </form>

          <Button className="mt-5 w-full sm:w-auto" onClick={check} disabled={checking || toCheck.length < 2}>
            {checking && <Loader2 className="animate-spin" aria-hidden="true" />}
            {checking ? 'Checking…' : `Check ${toCheck.length} medicines`}
          </Button>
          {checking && <p className="mt-2 text-[13px] text-ink-3">This can take up to half a minute when the service is busy.</p>}
        </Panel>

        <Panel labelledBy="result" className="lg:col-span-6">
          <PanelHead id="result" title="Result" action={result && <Badge variant={severity[result.overall_risk]?.variant || 'neutral'}>{severity[result.overall_risk]?.label}</Badge>} />
          <div aria-live="polite">
            {error && (
              <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3">
                <p className="min-w-0 flex-1 text-[15px]">{error}</p>
                {toCheck.length >= 2 && toCheck.length <= LIMITS.medicines && (
                  <Button size="sm" variant="outline" onClick={check} disabled={checking}>
                    <RotateCw aria-hidden="true" /> Try again
                  </Button>
                )}
              </div>
            )}
            {!result && !error && <EmptyLine>Choose the medicines and run the check. Results appear here.</EmptyLine>}
            {result && (
              <div className="mt-3 space-y-2">
                <p className="rounded-lg border border-line bg-surface p-4 text-[16px] leading-relaxed">{result.summary}</p>
                {result.interactions?.map((it, i) => (
                  <div key={i} className="rounded-lg border border-line bg-surface p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[15px] font-semibold">{it.medicines.join(' + ')}</p>
                      <Badge variant={severity[it.severity]?.variant || 'neutral'}>{severity[it.severity]?.label || it.severity}</Badge>
                    </div>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-2">{it.description}</p>
                  </div>
                ))}
                {result.disclaimer && <p className="pt-1 text-[13px] text-ink-3">{result.disclaimer}</p>}
              </div>
            )}
          </div>
        </Panel>
      </div>
    </Page>
  )
}
