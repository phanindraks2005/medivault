import { cn } from '@/lib/utils'

type Tone = 'teal' | 'white'

// A wall-calendar leaf: binder rings at the top, and the date block cut into a cross.
export function LogoMark({ size = 32, tone = 'teal', className }: { size?: number; tone?: Tone; className?: string }) {
  const leaf = tone === 'teal' ? '#0b6b60' : '#ffffff'
  const cut = tone === 'teal' ? '#ffffff' : '#0b6b60'
  const ring = tone === 'teal' ? '#08524a' : 'rgba(255,255,255,0.75)'
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="6" width="34" height="31" rx="9" fill={leaf} />
      <rect x="3" y="6" width="34" height="9" rx="4.5" fill={ring} opacity={tone === 'teal' ? 1 : 0.35} />
      <rect x="11" y="2.5" width="4" height="8" rx="2" fill={ring} />
      <rect x="25" y="2.5" width="4" height="8" rx="2" fill={ring} />
      <path d="M17.25 18.5h5.5v4.25H27v5.5h-4.25v4.25h-5.5v-4.25H13v-5.5h4.25V18.5Z" fill={cut} />
    </svg>
  )
}

export default function Logo({
  size = 32,
  tone = 'teal',
  className,
  showWordmark = true,
}: {
  size?: number
  tone?: Tone
  className?: string
  showWordmark?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} tone={tone} />
      {showWordmark && (
        <span
          className={cn('font-heading font-extrabold tracking-[-0.01em] leading-none', tone === 'white' ? 'text-white' : 'text-ink')}
          style={{ fontSize: size * 0.66 }}
        >
          MediVault
        </span>
      )}
    </span>
  )
}
