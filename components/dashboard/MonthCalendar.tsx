'use client'

import { useLayoutEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { Card } from '@/components/ui/card'
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
    <Card className="gap-0 overflow-hidden pt-0">
      {/* The sponsor band of a chemist's wall calendar, with its binder rings. */}
      <div
        className="relative flex flex-wrap items-end justify-between gap-3 px-(--card-spacing) pt-7 pb-5 text-white"
        style={{ background: 'linear-gradient(135deg, #0b6b60 0%, #0a5d54 60%, #08524a 100%)' }}
      >
        <span aria-hidden="true" className="absolute top-0 left-[22%] h-4 w-2.5 -translate-y-1/2 rounded-full bg-white/25" />
        <span aria-hidden="true" className="absolute top-0 right-[22%] h-4 w-2.5 -translate-y-1/2 rounded-full bg-white/25" />
        <div>
          <h2 className="font-display text-[30px] font-extrabold leading-none tracking-[0.01em] uppercase" style={{ fontStretch: '78%' }}>
            {monthLabel}
          </h2>
          <p className="mt-1.5 text-[14px] text-white/75">
            {count === 0 ? 'Nothing dated this month yet' : `${count} ${count === 1 ? 'date' : 'dates'} this month`}
          </p>
        </div>
        {members.length > 0 && (
          <ul className="hidden md:flex items-center gap-1.5" aria-label="Family colours">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 text-[13px] font-medium text-white">
                <span className="size-2 rounded-full ring-2 ring-white/40" style={{ background: colors[m.id] }} aria-hidden="true" />
                {m.name.split(' ')[0]}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Month grid on tablets and up */}
      <div className="hidden md:block px-(--card-spacing) pt-4">
        <div className="grid grid-cols-7 gap-1.5 pb-2">
          {WEEKDAYS.map((w, i) => (
            <div key={w} className={cn('px-2 text-[12px] font-semibold', i === 0 ? 'text-red' : 'text-ink-3')}>
              {w}
            </div>
          ))}
        </div>
        <motion.ol
          className="grid grid-cols-7 gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, ease }}
          aria-label={monthLabel}
        >
          {Array.from({ length: cells }, (_, i) => {
            const n = i - leading + 1
            if (n < 1 || n > daysInMonth) return <li key={i} aria-hidden="true" className="min-h-[84px] rounded-xl bg-muted/45" />
            const date = new Date(year, month, n)
            const isToday = n === today.getDate()
            const isPast = n < today.getDate()
            const isSunday = date.getDay() === 0
            const list = byDay[n] || []
            const label = `${date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}${isToday ? ', today' : ''}${
              list.length ? `: ${list.map((e) => `${e.label}, ${memberName(e.memberId)}`).join('; ')}` : ''
            }`
            const cell = (
              <li
                aria-label={label}
                className={cn(
                  'group relative min-h-[84px] rounded-xl p-2 transition-colors duration-150',
                  isToday ? 'bg-band text-white shadow-[0_8px_20px_-8px_rgb(11_107_96/0.6)]' : 'bg-surface ring-1 ring-line/70 hover:bg-muted/60',
                  isPast && !isToday && 'opacity-60'
                )}
              >
                <span
                  className={cn(
                    'font-display text-[20px] font-bold leading-none num',
                    isSunday && !isToday && 'text-red'
                  )}
                >
                  {n}
                </span>
                {isToday && <span className="ml-1.5 text-[11px] font-semibold text-white/80">Today</span>}
                <div className="mt-1.5 space-y-1">
                  {list.slice(0, 2).map((e, k) => (
                    <motion.span
                      key={k}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, ease, delay: 0.15 + k * 0.05 }}
                      className={cn('flex items-start gap-1 rounded-md px-1.5 py-[3px] text-[11.5px] font-medium leading-[1.25]', chipStyle[e.kind])}
                    >
                      <span className="mt-[4px] size-1.5 shrink-0 rounded-full" style={{ background: colors[e.memberId] }} />
                      <span lang="en" className="line-clamp-2 [hyphens:auto] [overflow-wrap:anywhere]">{e.label}</span>
                    </motion.span>
                  ))}
                  {list.length > 2 && <span className={cn('block px-1 text-[11px] font-medium', isToday ? 'text-white/80' : 'text-ink-3')}>+{list.length - 2} more</span>}
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
        <div className="h-(--card-spacing)" />
      </div>

      {/* Day strip on phones */}
      <DayStrip today={today} byDay={byDay} colors={colors} daysInMonth={daysInMonth} />
    </Card>
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
    <div ref={box} className="md:hidden overflow-x-auto px-(--card-spacing) pt-4 pb-(--card-spacing) [scrollbar-width:none]">
      <ol className="flex gap-1.5 w-max">
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
                isToday ? 'bg-band text-white shadow-[0_8px_20px_-8px_rgb(11_107_96/0.6)]' : 'bg-muted/60'
              )}
            >
              <span className={cn('text-[11px] font-semibold', isToday ? 'text-white/80' : date.getDay() === 0 ? 'text-red' : 'text-ink-3')}>
                {date.toLocaleDateString('en-IN', { weekday: 'short' })}
              </span>
              <span className="font-display text-[20px] font-bold leading-none num">{n}</span>
              <span className="flex h-2 gap-0.5">
                {list.slice(0, 3).map((e, k) => (
                  <span key={k} className="size-1.5 rounded-full ring-1 ring-white/60" style={{ background: colors[e.memberId] }} />
                ))}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

