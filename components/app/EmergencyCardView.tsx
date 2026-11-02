import { Phone } from 'lucide-react'
import MemberAvatar from '@/components/app/MemberAvatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type EmergencyCardData = {
  name: string
  color: string
  age?: number | null
  gender?: string | null
  bloodGroup?: string | null
  allergies: string[]
  medicines: string[]
  contact?: string | null
}

// The emergency card as a compact, phone-sized preview: navy header with a
// stripe in the member's colour, blood group in large numerals, allergies in red.
export default function EmergencyCardView({ data, className }: { data: EmergencyCardData; className?: string }) {
  const meta = [data.age != null ? `${data.age} yrs` : null, data.gender].filter(Boolean).join(' · ')
  return (
    <div className={cn('w-full max-w-[340px] overflow-hidden rounded-2xl bg-surface shadow-[var(--shadow-float)]', className)}>
      <div className="bg-navy px-5 pb-5 pt-5 text-white" style={{ boxShadow: `inset 0 4px 0 ${data.color}` }}>
        <p className="text-[13px] font-medium text-white/70">Emergency information</p>
        <div className="mt-3 flex items-center gap-3">
          <MemberAvatar name={data.name || '?'} color={data.color} size={44} ring />
          <div className="min-w-0">
            <p className="truncate text-[20px] font-semibold leading-tight">{data.name || 'Your name'}</p>
            {meta && <p className="text-[13px] text-white/70 num">{meta}</p>}
          </div>
        </div>
      </div>
      <dl className="divide-y divide-line px-5">
        <div className="flex items-end justify-between py-4">
          <dt className="text-[13px] text-ink-3">Blood group</dt>
          <dd className={cn('font-display text-[44px] font-bold leading-[0.85] num', !data.bloodGroup && 'text-line-strong')}>{data.bloodGroup || '—'}</dd>
        </div>
        <div className="py-4">
          <dt className="text-[13px] text-ink-3">Allergies</dt>
          <dd className="mt-1.5 flex flex-wrap gap-1.5">
            {data.allergies.length ? (
              data.allergies.map((a) => (
                <Badge key={a} variant="overdue">
                  {a}
                </Badge>
              ))
            ) : (
              <span className="text-[15px]">None known</span>
            )}
          </dd>
        </div>
        <div className="py-4">
          <dt className="text-[13px] text-ink-3">Current medicines</dt>
          <dd className="mt-1 text-[15px] leading-relaxed">{data.medicines.length ? data.medicines.join(' · ') : 'None on record'}</dd>
        </div>
        <div className="flex items-center gap-3 py-4">
          <Phone className="size-[18px] shrink-0 text-band" aria-hidden="true" />
          <div className="min-w-0">
            <dt className="text-[13px] text-ink-3">Call</dt>
            <dd className="truncate text-[15px] font-semibold num">{data.contact || 'Not added yet'}</dd>
          </div>
        </div>
      </dl>
    </div>
  )
}
