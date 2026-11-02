import { cn } from '@/lib/utils'

export default function MemberAvatar({
  name,
  color = '#5b6b7f',
  size = 32,
  ring = false,
  className,
}: {
  name: string
  color?: string
  size?: number
  ring?: boolean
  className?: string
}) {
  const initial = name?.trim()?.[0]?.toUpperCase() || '?'
  return (
    <span
      aria-hidden="true"
      className={cn('inline-grid shrink-0 place-items-center rounded-full font-semibold text-white select-none', ring && 'ring-2 ring-white/25', className)}
      style={{ width: size, height: size, background: color, fontSize: size * 0.42 }}
    >
      {initial}
    </span>
  )
}
