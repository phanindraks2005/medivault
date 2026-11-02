import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

// Shared pieces for app screens. See DESIGN.md "App screens": a centred
// 1100px column, tonal panels on the white sheet, white 1px-bordered rows.

export const rowCard =
  'rounded-lg border border-line bg-surface transition-[box-shadow,border-color] duration-150 hover:shadow-[var(--shadow-lift)]'

export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mx-auto max-w-[1100px] px-4 pb-12 pt-6 sm:px-6 lg:px-0 lg:pt-14', className)}>{children}</div>
}

export function PageHeader({
  title,
  sub,
  back,
  actions,
  lead,
}: {
  title: React.ReactNode
  sub?: React.ReactNode
  back?: { href: string; label: string }
  actions?: React.ReactNode
  lead?: React.ReactNode
}) {
  return (
    <header>
      {back && (
        <Link
          href={back.href}
          className="-ml-1 mb-4 inline-flex h-8 items-center gap-1 rounded-md px-1 text-[14px] text-ink-2 transition-colors hover:text-ink"
        >
          <ChevronLeft className="size-4" aria-hidden="true" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex min-w-0 items-center gap-4">
          {lead}
          <div className="min-w-0">
            <h1 className="font-heading text-[26px] leading-tight tracking-[-0.03em] sm:text-[32px]">{title}</h1>
            {sub && <div className="mt-1.5 max-w-[64ch] text-[16px] text-ink-2">{sub}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  )
}

export function Panel({ children, className, labelledBy }: { children: React.ReactNode; className?: string; labelledBy?: string }) {
  return (
    <section aria-labelledby={labelledBy} className={cn('min-w-0 rounded-xl bg-canvas p-5', className)}>
      {children}
    </section>
  )
}

export function PanelHead({ id, title, count, hint, action }: { id: string; title: string; count?: number; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 text-[15px] font-semibold">
          {title}
          {count !== undefined && (
            <span className="rounded-full border border-line bg-surface px-2 py-0.5 text-[12px] font-medium text-ink-2 num">{count}</span>
          )}
        </h2>
        {hint && <p className="mt-0.5 text-[13px] text-ink-3">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyLine({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mt-3 rounded-lg border border-line bg-surface p-4">
      <p className="text-[14px] text-ink-2">{children}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function RowsSkeleton({ count, height = 63 }: { count: number; height?: number }) {
  return (
    <div className="mt-3 space-y-2" aria-busy="true" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-lg border border-line bg-surface px-3" style={{ height }}>
          <Skeleton className="h-[46px] w-[50px] rounded-[10px]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorLine({ children, onRetry }: { children: React.ReactNode; onRetry?: () => void }) {
  return (
    <div role="alert" className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-5 py-4">
      <span className="size-2 rounded-full bg-red" aria-hidden="true" />
      <p className="flex-1 text-ink">{children}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-[14px] font-medium text-band underline-offset-4 hover:underline">
          Try again
        </button>
      )}
    </div>
  )
}

// A pill-shaped radio group: one tab stop, arrow keys move the choice.
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  label: string
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  const move = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const i = (options.findIndex((o) => o.value === value) + step + options.length) % options.length
    onChange(options[i].value)
    const buttons = e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')
    buttons?.[i]?.focus()
  }
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('grid gap-1 rounded-full bg-[#e6ebf1] p-1', className)}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={move}
            className={cn(
              'h-9 rounded-full text-[14px] transition-[background-color,color,box-shadow] duration-150',
              on ? 'bg-surface font-medium text-ink shadow-[var(--shadow-card)]' : 'text-ink-2 hover:text-ink'
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export function Field({ id, label, hint, children, className }: { id: string; label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-[14px] font-medium text-ink-2">
          {label}
        </Label>
        {hint && (
          <span id={`${id}-hint`} className="text-[13px] text-ink-3">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
