export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <rect width="120" height="120" rx="28" fill="#3ECF8E" />
      <path
        d="M20 65 L45 65 L55 40 L68 90 L80 55 L90 65 L100 65"
        stroke="#0F1115"
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  )
}