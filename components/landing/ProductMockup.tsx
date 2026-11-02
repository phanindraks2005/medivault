'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { CalendarDays, MessageCircle, Users } from 'lucide-react'
import DashboardView from '@/components/dashboard/DashboardView'
import MemberAvatar from '@/components/app/MemberAvatar'
import Logo from '@/components/Logo'
import { BorderBeam } from '@/components/ui/border-beam'
import { memberColors, relationLabel } from '@/lib/family'
import { sampleMembers, sampleRecords, sampleVaccinations } from '@/lib/sample-family'
import { ease } from '@/lib/motion'

// The real dashboard, rendered with the sample family and scaled down to fit.
const FRAME_WIDTH = 1512
const FRAME_HEIGHT = 900

export default function ProductMockup() {
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.6)
  const colors = memberColors(sampleMembers)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / FRAME_WIDTH))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.9, ease, delay: 0.25 }}
      className="relative rounded-[20px] bg-white/10 p-1.5 shadow-[0_40px_80px_-24px_rgb(4_40_36/0.55)] ring-1 ring-white/20 backdrop-blur-sm md:p-2"
    >
      <div className="overflow-hidden rounded-[14px] bg-canvas ring-1 ring-black/5">
        {/* Browser bar */}
        <div className="flex h-9 items-center gap-2 border-b border-line bg-surface px-4">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-4 hidden h-5 flex-1 max-w-md items-center rounded-md bg-muted px-3 text-[11px] text-ink-3 sm:flex">
            medivault.app/dashboard
          </span>
        </div>
        <div ref={box} className="relative w-full overflow-hidden" style={{ height: FRAME_HEIGHT * scale }}>
          <div
            inert
            aria-hidden="true"
            className="absolute left-0 top-0 flex origin-top-left"
            style={{ width: FRAME_WIDTH, height: FRAME_HEIGHT, transform: `scale(${scale})` }}
          >
            <MockSidebar colors={colors} />
            <div className="h-full flex-1 overflow-hidden">
              <DashboardView status="ready" members={sampleMembers} colors={colors} vaccinations={sampleVaccinations} records={sampleRecords} demo />
            </div>
          </div>
        </div>
      </div>
      <BorderBeam size={260} duration={9} colorFrom="#f2a900" colorTo="#7fd6c9" borderWidth={2} />
    </motion.div>
  )
}

function MockSidebar({ colors }: { colors: Record<string, string> }) {
  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col text-white" style={{ background: 'linear-gradient(180deg, #0b6b60 0%, #08524a 100%)' }}>
      <div className="px-6 pt-7 pb-6">
        <Logo tone="white" size={34} />
      </div>
      <div className="space-y-1 px-3">
        {[
          { label: 'Today', icon: CalendarDays, active: true },
          { label: 'Family', icon: Users },
          { label: 'Ask Doc', icon: MessageCircle },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium ${item.active ? 'bg-white/[0.14] text-white' : 'text-white/75'}`}
          >
            <item.icon className="size-[19px]" strokeWidth={1.9} />
            {item.label}
          </div>
        ))}
      </div>
      <p className="mt-8 px-6 text-[13px] font-medium text-white/60">Family members</p>
      <div className="mt-2 space-y-0.5 px-3">
        {sampleMembers.map((m) => (
          <div key={m.id} className="flex h-11 items-center gap-3 rounded-xl px-3">
            <MemberAvatar name={m.name} color={colors[m.id]} size={28} ring />
            <span className="leading-tight">
              <span className="block text-[14px] font-medium">{m.name}</span>
              <span className="block text-[12px] text-white/60">{relationLabel(m.relation)}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
