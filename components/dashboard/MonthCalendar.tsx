'use client'

import { useLayoutEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Member } from '@/lib/family-context'
import { parseDay } from '@/lib/dates'
import { ease } from '@/lib/motion'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from './types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const chipStyle: Record<CalendarEvent['kind'], string> = {
  overdue: 'bg-red-soft text-red-ink',
  due: 'bg-due-soft text-due-ink',
  record: 'bg-band-soft text-band-deep',
}

export default function MonthCalendar({
  today,
  events,
  members,
  colors,
}: {
  today: Date
  events: CalendarEvent[]
  members: Member[]
  colors: Record<string, string>
}) {
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leading = new Date(year, month, 1).getDay()
  const cells = Math.ceil((leading + daysInMonth) / 7) * 7
  const monthLabel = today.toLocaleString('en-IN', { month: 'long', year: 'numeric' })
  const memberName = (id: string) => members.find((m) => m.id === id)?.name.split(' ')[0] || ''

  const byDay: Record<number, CalendarEvent[]> = {}
  for (const e of events) {
    const d = parseDay(e.date)
    if (d.getFullYear() === year && d.getMonth() === month) (byDay[d.getDate()] ||= []).push(e)
  }
  const count = Object.values(byDay).reduce((n, l) => n + l.length, 0)

  return (
    <section aria-labelledby="month-title" className="rounded-xl bg-canvas p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="month-title" className="font-display text-[28px] font-bold uppercase leading-none tracking-[0.01em]" style={{ fontStretch: '78%' }}>
            {monthLabel}
          </h2>
          <p className="mt-1.5 text-[13px] text-ink-3">
            {count === 0 ? 'Nothing dated this month yet' : `${count} ${count === 1 ? 'date' : 'dates'} this month`}
          </p>
        </div>
        {members.length > 0 && (
          <ul className="hidden items-center gap-3 md:flex" aria-label="Family colours">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-1.5 text-[13px] text-ink-2">
                <span className="size-2 rounded-full" style={{ background: colors[m.id] }} aria-hidden="true" />
                {m.name.split(' ')[0]}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Month grid on tablets and up: the one white card on the screen */}
      <div className="mt-4 hidden overflow-hidden rounded-lg bg-surface border border-line md:block">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2.5 py-2 text-[12px] font-medium text-ink-3">
              {w}
            </div>
          ))}
        </div>
        <motion.ol
          className="grid grid-cols-7 gap-px bg-line pt-px"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease }}
          aria-label={monthLabel}
        >
          {Array.from({ length: cells }, (_, i) => {
            const n = i - leading + 1
            if (n < 1 || n > daysInMonth) return <li key={i} aria-hidden="true" className="min-h-[88px] bg-canvas/60" />
            const date = new Date(year, month, n)
            const isToday = n === today.getDate()
            const isPast = n < today.getDate()
            const list = byDay[n] || []
            const label = `${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}${
              list.length ? `: ${list.map((e) => `${e.label}, ${memberName(e.memberId)}`).join('; ')}` : ''
            }`
            const cell = (
              <li aria-label={label} className="group relative min-h-[88px] bg-surface p-1.5 transition-colors duration-150 hover:bg-canvas/70">
                <span
                  className={cn(
                    'font-display inline-grid h-7 min-w-7 place-items-center rounded-full px-1 text-[18px] font-semibold leading-none num',
                    isToday ? 'bg-band text-white' : isPast ? 'text-ink-3' : 'text-ink'
                  )}
                >
                  {n}
                </span>
                <div className="mt-1 space-y-1">
                  {list.slice(0, 2).map((e, k) => (
                    <span
                      key={k}
                      className={cn('flex items-center gap-1 rounded-[5px] px-1.5 py-[3px] text-[12px] font-medium leading-[1.25]', chipStyle[e.kind])}
                    >
                      <span className="size-1.5 shrink-0 rounded-full" style={{ background: colors[e.memberId] }} />
                      <span className="min-w-0 truncate">
                        {e.label}
                      </span>
                    </span>
                  ))}
                  {list.length > 2 && <span className="block px-1 text-[11px] font-medium text-ink-3">+{list.length - 2} more</span>}
                </div>
              </li>
            )
            if (!list.length) return <Wrapper key={i}>{cell}</Wrapper>
            return (
              <Tooltip key={i}>
                <TooltipTrigger render={cell} />
                <TooltipContent side="top" className="max-w-64">
                  <ul className="space-y-0.5">
                    {list.map((e, k) => (
                      <li key={k}>
                        {e.label} · {memberName(e.memberId)}
                      </li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </motion.ol>
      </div>

      {/* Day strip on phones */}
      <DayStrip today={today} byDay={byDay} colors={colors} daysInMonth={daysInMonth} />
    </section>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function DayStrip({
  today,
  byDay,
  colors,
  daysInMonth,
}: {
  today: Date
  byDay: Record<number, CalendarEvent[]>
  colors: Record<string, string>
  daysInMonth: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const todayCell = useRef<HTMLLIElement>(null)

  // Start the strip with today in the middle of the screen.
  useLayoutEffect(() => {
    if (box.current && todayCell.current) {
      box.current.scrollLeft = todayCell.current.offsetLeft - box.current.clientWidth / 2 + todayCell.current.clientWidth / 2
    }
  }, [])

  return (
    <div ref={box} className="mt-4 overflow-x-auto [scrollbar-width:none] md:hidden">
      <ol className="flex w-max gap-1.5 pb-1">
        {Array.from({ length: daysInMonth }, (_, i) => {
          const n = i + 1
          const date = new Date(today.getFullYear(), today.getMonth(), n)
          const isToday = n === today.getDate()
          const list = byDay[n] || []
          return (
            <li
              key={n}
              ref={isToday ? todayCell : undefined}
              aria-label={`${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${list.length ? `, ${list.length} dated` : ''}`}
              className={cn(
                'flex w-12 flex-col items-center gap-1 rounded-xl py-2.5',
                isToday ? 'bg-band text-white' : 'bg-surface border border-line'
              )}
            >
              <span className={cn('text-[11px] font-medium', isToday ? 'text-white/85' : 'text-ink-3')}>
                {date.toLocaleDateString('en-IN', { weekday: 'short' })}
              </span>
              <span className="font-display text-[20px] font-bold leading-none num">{n}</span>
              <span className="flex h-2 gap-0.5">
                {list.slice(0, 3).map((e, k) => (
                  <span key={k} className="size-1.5 rounded-full" style={{ background: isToday ? '#fff' : colors[e.memberId] }} />
                ))}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

