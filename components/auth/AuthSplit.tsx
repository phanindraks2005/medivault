import Link from 'next/link'
import Image from 'next/image'
import { Check } from 'lucide-react'
import Logo from '@/components/Logo'
import { DotPattern } from '@/components/ui/dot-pattern'

export default function AuthSplit({
  children,
  image = '/illustrations/calendar-scene.svg',
  heading,
  points,
}: {
  children: React.ReactNode
  image?: string
  heading: string
  points: string[]
}) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <Link href="/" aria-label="MediVault home" className="self-start">
          <Logo size={32} />
        </Link>
        <div className="flex flex-1 items-center py-8 lg:py-10">
          <div className="mx-auto w-full max-w-[420px]">
            <div
              aria-hidden="true"
              className="mb-8 overflow-hidden rounded-3xl p-4 lg:hidden"
              style={{ background: 'linear-gradient(160deg, #0b6b60 0%, #08524a 100%)' }}
            >
              <div className="rounded-2xl bg-white/[0.94] px-4 py-3">
                <Image src={image} alt="" width={560} height={480} priority className="mx-auto h-36 w-auto" />
              </div>
            </div>
            {children}
          </div>
        </div>
        <p className="text-center text-[13px] text-ink-3 lg:text-left">
          Not a medical device. Always confirm medical decisions with a doctor or pharmacist.
        </p>
      </div>

      <aside
        className="relative hidden overflow-hidden text-white lg:flex lg:flex-col lg:justify-center lg:px-16"
        style={{ background: 'linear-gradient(160deg, #0b6b60 0%, #08524a 60%, #063e38 100%)' }}
      >
        <DotPattern width={22} height={22} cr={1.2} className="text-white/[0.08] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]" />
        <div className="relative mx-auto w-full max-w-[520px]">
          <div className="rounded-[28px] bg-white/[0.94] p-6 shadow-[var(--shadow-float)]">
            <Image src={image} alt="" width={560} height={480} priority className="h-auto w-full" />
          </div>
          <h2 className="mt-10 max-w-[22ch] font-heading text-[30px] font-extrabold leading-[1.1] tracking-[-0.02em]">{heading}</h2>
          <ul className="mt-5 space-y-2.5">
            {points.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[16px] text-white/85">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-due text-due-ink">
                  <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
