'use client'

import { use, useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { saveError, supabase, userForSave } from '@/lib/supabase'
import { useFamily } from '@/lib/family-context'
import { dayLeaf, daysFromToday, dueLabel, formatDay, todayISO } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import MemberAvatar from '@/components/app/MemberAvatar'
import DateLeaf from '@/components/app/DateLeaf'
import { EmptyLine, ErrorLine, Field, Page, PageHeader, Panel, PanelHead, RowsSkeleton } from '@/components/app/kit'
import { cn } from '@/lib/utils'
import { LIMITS } from '@/lib/limits'

type Vax = { id: string; vaccine_name: string; date_given: string | null; next_due_date: string | null; notes: string | null }

export default function VaccinationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { members, colors } = useFamily()
  const member = members.find((m) => m.id === id)
  const first = member?.name.split(' ')[0] || 'Back'

  const [list, setList] = useState<Vax[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [adding, setAdding] = useState(false)
  const [toDelete, setToDelete] = useState<Vax | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('vaccinations')
      .select('id, vaccine_name, date_given, next_due_date, notes')
      .eq('family_member_id', id)
    if (error) return setStatus('error')
    setList(data || [])
    setStatus('ready')
  }, [id])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  const due = list
    .filter((v) => v.next_due_date)
    .map((v) => ({ ...v, days: daysFromToday(v.next_due_date!) }))
    .sort((a, b) => a.days - b.days)
  const given = list.filter((v) => v.date_given).sort((a, b) => b.date_given!.localeCompare(a.date_given!))
  // Saved before a date was required; listed so they can be deleted.
  const undated = list.filter((v) => !v.date_given && !v.next_due_date)
  const overdue = due.filter((v) => v.days < 0).length
  const soon = due.filter((v) => v.days >= 0 && v.days <= 30).length

  const remove = async () => {
    if (!toDelete) return
    const { error } = await supabase.from('vaccinations').delete().eq('id', toDelete.id)
    setToDelete(null)
    if (error) return toast.error(saveError("Couldn't delete it. Try again."))
    toast.success(`${toDelete.vaccine_name} deleted`)
    load()
  }

  const sub =
    status !== 'ready'
      ? 'Loading…'
      : overdue
        ? `${overdue} overdue${soon ? `, ${soon} due in the next 30 days` : ''}.`
        : soon
          ? `${soon} due in the next 30 days.`
          : list.length
            ? 'Nothing due in the next 30 days.'
            : `Log ${first}'s doses and when the next one is due.`

  return (
    <Page>
      <PageHeader
        back={{ href: `/profile/family/${id}`, label: member?.name || 'Back' }}
        lead={member && <MemberAvatar name={member.name} color={colors[id]} size={48} />}
        title={member ? `${first}'s vaccinations` : 'Vaccinations'}
        sub={sub}
        actions={
          <Button onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" /> Add a vaccination
          </Button>
        }
      />

      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load vaccinations. Check your connection and try again.</ErrorLine>}

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-12">
        <Panel labelledBy="due" className="lg:col-span-7">
          <PanelHead id="due" title="Next due" count={status === 'ready' ? due.length : undefined} hint="Overdue first, then by date" />
          {status === 'loading' && <RowsSkeleton count={3} height={76} />}
          {status === 'ready' && due.length === 0 && <EmptyLine>No upcoming doses. Add a vaccination with a next-due date and it lands on the calendar.</EmptyLine>}
          {due.length > 0 && (
            <ul className="mt-3 space-y-2">
              {due.map((v) => {
                const tone = v.days < 0 ? 'red' : v.days <= 30 ? 'due' : 'plain'
                return (
                  <li key={v.id} className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
                    <DateLeaf {...dayLeaf(v.next_due_date!)} tone={tone} size="lg" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium">{v.vaccine_name}</p>
                      <p className="truncate text-[13px] text-ink-3 num">
                        {v.date_given ? `Last given ${formatDay(v.date_given)}` : 'Not given yet'}
                        {v.notes && ` · ${v.notes}`}
                      </p>
                      <p className={cn('text-[13px] font-medium sm:hidden num', tone === 'red' ? 'text-red-ink' : tone === 'due' ? 'text-due-ink' : 'text-ink-3')}>
                        {dueLabel(v.days)}
                      </p>
                    </div>
                    <Badge variant={tone === 'red' ? 'overdue' : tone === 'due' ? 'due' : 'neutral'} className="hidden sm:inline-flex">
                      {dueLabel(v.days)}
                    </Badge>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${v.vaccine_name}`} onClick={() => setToDelete(v)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel labelledBy="given" className="lg:col-span-5">
          <PanelHead id="given" title="Given" count={status === 'ready' ? given.length : undefined} hint="Newest first" />
          {status === 'loading' && <RowsSkeleton count={3} />}
          {status === 'ready' && given.length === 0 && <EmptyLine>No doses logged yet.</EmptyLine>}
          {given.length > 0 && (
            <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
              {given.map((v, i) => (
                <li key={v.id} className={i > 0 ? 'flex items-center gap-3 border-t border-line px-3.5 py-3' : 'flex items-center gap-3 px-3.5 py-3'}>
                  <span className="w-[104px] shrink-0 whitespace-nowrap text-[14px] text-ink-2 num">{formatDay(v.date_given!)}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{v.vaccine_name}</span>
                  {!v.next_due_date && (
                    <Button variant="ghost" size="icon-sm" aria-label={`Delete ${v.vaccine_name}`} onClick={() => setToDelete(v)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {undated.length > 0 && (
          <Panel labelledBy="undated" className="lg:col-span-12">
            <PanelHead id="undated" title="Missing a date" count={undated.length} hint="Add them again with a date, or delete them" />
            <ul className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
              {undated.map((v, i) => (
                <li key={v.id} className={cn('flex items-center gap-3 px-3.5 py-3', i > 0 && 'border-t border-line')}>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{v.vaccine_name}</span>
                  {v.notes && <span className="hidden min-w-0 truncate text-[13px] text-ink-3 sm:block">{v.notes}</span>}
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${v.vaccine_name}`} onClick={() => setToDelete(v)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      <AddVaccination memberId={id} name={first} open={adding} onOpenChange={setAdding} onAdded={load} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {toDelete?.vaccine_name}?</AlertDialogTitle>
            <AlertDialogDescription>It comes off {first}&apos;s list and the calendar. This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Page>
  )
}

function AddVaccination({
  memberId,
  name,
  open,
  onOpenChange,
  onAdded,
}: {
  memberId: string
  name: string
  open: boolean
  onOpenChange: (o: boolean) => void
  onAdded: () => void
}) {
  const [vaccine, setVaccine] = useState('')
  const [given, setGiven] = useState('')
  const [next, setNext] = useState('')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!vaccine.trim()) {
      document.getElementById('v-name')?.focus()
      return setError('Add the vaccine name first.')
    }
    // Without either date the entry would appear in neither list.
    if (!given && !next) {
      document.getElementById('v-given')?.focus()
      return setError('Add the date it was given, the next due date, or both.')
    }
    if (given && given > todayISO()) {
      document.getElementById('v-given')?.focus()
      return setError('The date given can’t be in the future. Use Next due for a dose that’s coming up.')
    }
    if (next && given && next < given) return setError('The next dose can’t be before the last one.')
    setBusy(true)
    setError('')
    const user = await userForSave()
    if (user.error) {
      setBusy(false)
      return setError(user.error)
    }
    const { error } = await supabase.from('vaccinations').insert({
      user_id: user.id,
      family_member_id: memberId,
      vaccine_name: vaccine.trim(),
      date_given: given || null,
      next_due_date: next || null,
      notes: notes.trim() || null,
    })
    setBusy(false)
    if (error) return setError(saveError("Couldn't save. Try again."))
    toast.success(`${vaccine.trim()} added`)
    setVaccine('')
    setGiven('')
    setNext('')
    setNotes('')
    onOpenChange(false)
    onAdded()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Add a vaccination for {name}</DialogTitle>
          <DialogDescription>A next-due date puts a reminder on the calendar.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
          <Field id="v-name" label="Vaccine" className="sm:col-span-2">
            <Input id="v-name" name="vaccine" maxLength={LIMITS.vaccine} autoComplete="off" placeholder="e.g. Influenza, MMR second dose…" value={vaccine} onChange={(e) => setVaccine(e.target.value)} required />
          </Field>
          <Field id="v-given" label="Date given">
            <Input id="v-given" name="date-given" type="date" max={todayISO()} value={given} onChange={(e) => setGiven(e.target.value)} />
          </Field>
          <Field id="v-next" label="Next due">
            <Input id="v-next" name="next-due" type="date" value={next} onChange={(e) => setNext(e.target.value)} />
          </Field>
          <Field id="v-notes" label="Notes" hint="Optional" className="sm:col-span-2">
            <Textarea id="v-notes" name="notes" maxLength={LIMITS.vaccineNotes} autoComplete="off" rows={2} placeholder="Clinic, batch number…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink sm:col-span-2">
              {error}
            </p>
          )}
          <div className="-mx-6 -mb-6 mt-1 flex flex-col-reverse gap-2 rounded-b-2xl border-t border-line bg-canvas px-6 py-4 sm:col-span-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden="true" />}
              {busy ? 'Saving…' : 'Add vaccination'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
