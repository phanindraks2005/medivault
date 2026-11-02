'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { DashboardScene, EmergencyCard, FamilyScene, PolicyScene, PrescriptionScene } from '@/components/landing/scenes'
import { ChecksScene, ComingUpScene, DocScene } from '@/components/landing/more-scenes'
import { ease } from '@/lib/motion'

type Scene = 'hero' | 'features' | 'doc' | 'vax' | 'checks' | 'how' | 'card' | 'security'

type StageState = { scene: Scene; member: string; setMember: (id: string) => void }

const StageContext = createContext<StageState>({ scene: 'hero', member: 'ramesh', setMember: () => {} })

export const useStage = () => useContext(StageContext)

// Sections mark themselves with data-stage; whichever one crosses the middle
// of the screen decides what the fixed stage shows.
export function StageProvider({ children }: { children: React.ReactNode }) {
  const [scene, setScene] = useState<Scene>('hero')
  const [member, setMember] = useState('ramesh')

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-stage]')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setScene(e.target.getAttribute('data-stage') as Scene)
      },
      { rootMargin: '-45% 0px -45% 0px' }
    )
    sections.forEach((s) => io.observe(s))
    return () => io.disconnect()
  }, [])

  return <StageContext.Provider value={{ scene, member, setMember }}>{children}</StageContext.Provider>
}

// The wall calendar that never leaves the wall: on desktop it stays in place
// for the whole page while the reading column scrolls past it.
export function Stage() {
  const { scene, member } = useStage()

  return (
    <div aria-hidden="true" className="mesh flex h-full items-center justify-center rounded-2xl px-[7%]">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={scene}
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ duration: 0.45, ease }}
          className="flex w-full justify-center"
        >
          {scene === 'hero' && <PrescriptionScene />}
          {scene === 'features' && <DashboardScene className="w-full" />}
          {scene === 'doc' && <DocScene />}
          {scene === 'vax' && <ComingUpScene />}
          {scene === 'checks' && <ChecksScene />}
          {scene === 'how' && <FamilyScene />}
          {scene === 'card' && <EmergencyCard memberId={member} />}
          {scene === 'security' && <PolicyScene />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
