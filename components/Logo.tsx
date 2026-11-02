// A calendar leaf with a cross on it.
export default function Logo({ size = 28, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="6" width="24" height="22" rx="3" stroke={color} strokeWidth="2.5" />
      <path d="M4 12h24" stroke={color} strokeWidth="2.5" />
      <path d="M11 3v6M21 3v6" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 15.5v8M12 19.5h8" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}
