import { cn } from '@/lib/utils'

// A tear-off calendar leaf: month tab on top, the day in large numerals.
export default function DateLeaf({ day, month, tone = 'plain', size = 'md' }: { day: string; month: string; tone?: 'plain' | 'due' | 'red'; size?: 'md' | 'lg' }) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center overflow-hidden rounded-[10px] border bg-surface',
        size === 'lg' ? 'w-[60px]' : 'w-[50px]',
        tone === 'red' ? 'border-red/30' : tone === 'due' ? 'border-due/50' : 'border-line'
      )}
    >
      <span
        className={cn(
          'w-full py-0.5 text-center text-[10.5px] font-bold tracking-[0.06em]',
          tone === 'red' ? 'bg-red text-white' : tone === 'due' ? 'bg-due text-due-ink' : 'bg-band text-white'
        )}
      >
        {month}
      </span>
      <span className={cn('font-display py-1 font-bold leading-none num', size === 'lg' ? 'text-[28px]' : 'text-[23px]', tone === 'red' && 'text-red')}>
        {day}
      </span>
    </div>
  )
}
