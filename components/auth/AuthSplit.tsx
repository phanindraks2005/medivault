import Link from 'next/link'
import Logo from '@/components/Logo'

// Form on the left, the product on the mesh stage on the right, as on the
// landing page. On phones the stage is dropped so the form comes first.
export default function AuthSplit({
  children,
  scene,
  caption,
}: {
  children: React.ReactNode
  scene: React.ReactNode
  caption: string
}) {
  return (
    <div className="grid min-h-dvh bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-16 lg:py-10">
        <Link href="/" aria-label="MediVault home" className="self-start rounded-full">
          <Logo size={32} />
        </Link>
        <div className="flex flex-1 items-center py-10">
          <div className="mx-auto w-full max-w-[400px]">{children}</div>
        </div>
        <p className="text-center text-[13px] text-ink-3 lg:text-left">
          Not a medical device. Always confirm medical decisions with a doctor or pharmacist.
        </p>
      </div>

      <aside className="hidden p-5 pl-0 lg:block">
        <div className="mesh sticky top-5 flex h-[calc(100dvh-40px)] min-h-[620px] flex-col rounded-2xl px-[8%] py-12">
          <div className="flex flex-1 items-center justify-center" aria-hidden="true">
            {scene}
          </div>
          <p className="max-w-[24ch] text-[28px] font-light leading-[1.2] tracking-[-0.02em] text-ink">{caption}</p>
        </div>
      </aside>
    </div>
  )
}
