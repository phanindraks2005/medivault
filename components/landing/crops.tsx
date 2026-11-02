import { Badge } from '@/components/ui/badge'
import DateLeaf from '@/components/app/DateLeaf'
import { sampleColors } from '@/lib/sample-family'
import { cn } from '@/lib/utils'

// Small, cropped pieces of the real interface for the feature rows.
function Crop({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      data-ui
      aria-hidden="true"
      className={cn(
        'flex aspect-[4/3] w-full shrink-0 flex-col justify-center gap-2 overflow-hidden rounded-xl bg-canvas p-4 sm:aspect-[3/4] sm:w-[220px]',
        className
      )}
    >
      {children}
    </div>
  )
}

const dot = (id: string) => <span className="size-2 shrink-0 rounded-full" style={{ background: sampleColors[id] }} />

export function ReadCrop() {
  return (
    <Crop>
      {[
        ['Amlodipine', '5 mg', 'Morning'],
        ['Metformin', '500 mg', 'Twice'],
        ['Atorvastatin', '10 mg', 'Night'],
      ].map(([n, d, w]) => (
        <div key={n} className="rounded-lg bg-surface px-3 py-2.5 shadow-[var(--shadow-card)]">
          <p className="text-[14px] font-semibold leading-tight">{n}</p>
          <p className="text-[13px] text-ink-3 num">
            {d} · {w}
          </p>
        </div>
      ))}
    </Crop>
  )
}

export function CalendarCrop() {
  const marks: Record<number, string> = { 3: 'sunita', 8: 'ramesh', 11: 'diya', 15: 'arjun', 19: 'ramesh', 24: 'sunita' }
  return (
    <Crop className="justify-start">
      <p className="font-display text-[20px] font-bold uppercase leading-none tracking-[0.01em]">This month</p>
      <ol className="mt-1 grid grid-cols-5 gap-1">
        {Array.from({ length: 25 }, (_, i) => i + 1).map((n) => (
          <li
            key={n}
            className={cn(
              'flex aspect-square flex-col items-center justify-center gap-0.5 rounded-md text-[12px] num',
              n === 12 ? 'bg-band font-semibold text-white' : 'bg-surface'
            )}
          >
            {n}
            {marks[n] && dot(marks[n])}
          </li>
        ))}
      </ol>
    </Crop>
  )
}

export function RedCrop() {
  return (
    <Crop className="items-start">
      <Badge variant="overdue">Overdue 12 days</Badge>
      <Badge variant="overdue">Allergic: Penicillin</Badge>
      <Badge variant="overdue">Allergic: Sulfa drugs</Badge>
      <Badge variant="due">In 6 days</Badge>
      <Badge variant="neutral">Read</Badge>
    </Crop>
  )
}

export function ChatCrop() {
  return (
    <Crop>
      <p className="max-w-[90%] self-end rounded-2xl rounded-br-md bg-band px-3 py-2 text-[13px] leading-snug text-white">What is Dad taking for blood pressure?</p>
      <p className="max-w-[94%] rounded-2xl rounded-bl-md bg-surface px-3 py-2 text-[13px] leading-snug shadow-[var(--shadow-card)]">
        Amlodipine 5 mg every morning, from Dr. Anita Rao last week.
      </p>
    </Crop>
  )
}

export function VaccineCrop() {
  return (
    <Crop>
      {[
        { d: '20', m: 'OCT', t: 'red' as const, name: 'Tetanus', who: 'ramesh' },
        { d: '08', m: 'NOV', t: 'due' as const, name: 'Influenza', who: 'ramesh' },
        { d: '15', m: 'NOV', t: 'due' as const, name: 'MMR, dose 2', who: 'diya' },
      ].map((v) => (
        <div key={v.name} className="flex items-center gap-2.5 rounded-lg bg-surface p-2 shadow-[var(--shadow-card)]">
          <DateLeaf day={v.d} month={v.m} tone={v.t} />
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-semibold">{v.name}</span>
            <span className="flex items-center gap-1 text-[12.5px] text-ink-3">
              {dot(v.who)} {v.who === 'diya' ? 'Diya' : 'Ramesh'}
            </span>
          </span>
        </div>
      ))}
    </Crop>
  )
}

export function InteractionCrop() {
  return (
    <Crop>
      <div className="rounded-lg bg-surface p-3 shadow-[var(--shadow-card)]">
        <p className="text-[13px] font-semibold leading-snug">Metformin + Atorvastatin</p>
        <Badge variant="ok" className="mt-1.5">No known problem</Badge>
      </div>
      <div className="rounded-lg bg-surface p-3 shadow-[var(--shadow-card)]">
        <p className="text-[13px] font-semibold leading-snug">Amlodipine + Clarithromycin</p>
        <Badge variant="due" className="mt-1.5">Ask your doctor</Badge>
      </div>
    </Crop>
  )
}
