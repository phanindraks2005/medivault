import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { ButtonLink } from '@/components/ui/button'
import { Stage, StageProvider } from '@/components/landing/Stage'
import { FamilyScene, PolicyScene, PrescriptionScene } from '@/components/landing/scenes'
import { AddMemberDialog, LandingNav, MemberTabs, Reveal, Wordmark } from '@/components/landing/interactive'
import { CalendarCrop, ChatCrop, InteractionCrop, ReadCrop, RedCrop, VaccineCrop } from '@/components/landing/crops'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: { absolute: "MediVault · Your family's health, on one calendar" },
}

const GITHUB = 'https://github.com/phanindraks2005/medivault'

const FEATURES = [
  {
    title: 'Reads the prescription for you',
    stage: 'features',
    crop: <ReadCrop />,
    lines: [
      'Photo or PDF, up to 10 MB',
      'The doctor and the clinic',
      'The date the doctor wrote it, not the upload date',
      'Every medicine with its dose and timing',
      'Anything it misreads, you can correct',
    ],
  },
  {
    title: 'One calendar for everyone',
    stage: 'features',
    crop: <CalendarCrop />,
    lines: [
      'Each person keeps one colour on every screen',
      'Prescriptions sit on the day they were written',
      'Vaccinations sit on the day they fall due',
      'A glance tells you whose day it is',
    ],
  },
  {
    title: 'Red means act now',
    stage: 'features',
    crop: <RedCrop />,
    lines: ['Overdue doses', 'Allergies, on every screen they matter', 'Marigold for anything due in 30 days', 'Nothing else is ever red'],
  },
  {
    title: 'Doc answers from your records',
    stage: 'doc',
    crop: <ChatCrop />,
    lines: [
      'Ask in plain words: “What is Dad taking?”',
      'Answers come from the family’s own prescriptions',
      'It knows each person’s allergies',
      'For anything serious, it sends you to a doctor',
    ],
  },
  {
    title: 'Vaccinations with due dates',
    stage: 'vax',
    crop: <VaccineCrop />,
    lines: ['Log each dose and when the next is due', 'Children’s schedules and adult boosters', 'Due-soon and overdue land on the calendar'],
  },
  {
    title: 'Checks before anyone takes it',
    stage: 'checks',
    crop: <InteractionCrop />,
    lines: [
      'Current medicines checked against each other',
      'Or against a new one the chemist suggests',
      'A short visit summary for the next appointment',
      'Plain-English notes on the doctor’s jargon',
    ],
  },
]

const SLIP = [
  {
    when: 'Sunday evening',
    rows: [
      ['Add yourself: blood group, allergies', '2 min'],
      ['Add parents, partner and children', '5 min'],
    ],
  },
  {
    when: 'Monday, at the clinic',
    rows: [
      ['Photograph the prescription', '10 sec'],
      ['MediVault reads it and files it', '15 sec'],
    ],
  },
  {
    when: 'Every day after',
    rows: [
      ['See what is due on the calendar', 'at a glance'],
      ['Ask Doc about anyone’s medicines', 'any time'],
    ],
  },
]

const PRIVACY = [
  ['Row-level security', 'Every table returns only the rows the signed-in account owns. Another account gets nothing back.'],
  ['Private file storage', 'Uploads go to a private bucket, in a folder only your account can open. There are no public links.'],
  ['Checked on the server', 'Every AI request verifies your login first and only touches records your account owns.'],
  ['Only photos and PDFs', 'Files are limited to images and PDFs up to 10 MB, enforced by the storage bucket itself.'],
]

const H2 = 'font-heading text-[clamp(36px,3.6vw,54px)] leading-[1.04] tracking-[-0.035em]'

export default function Landing() {
  return (
    <StageProvider>
      <div className="bg-surface text-ink">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:shadow-[var(--shadow-lift)]"
        >
          Skip to content
        </a>

        <div className="relative lg:grid lg:grid-cols-[46fr_54fr]">
          {/* The fixed stage (desktop) */}
          <div className="relative z-0 hidden lg:block">
            <div className="sticky top-0 h-svh py-5 pl-5">
              <Stage />
            </div>
          </div>

          <main id="main" className="relative z-10 min-w-0">
            {/* Hero */}
            <section data-stage="hero" className="relative flex min-h-svh flex-col px-4 pt-4 sm:px-8 lg:pl-[clamp(40px,4.5vw,72px)] lg:pr-10 lg:pt-8">
              <div className="order-1"><LandingNav /></div>

              <div aria-hidden="true" className="mesh order-2 mt-4 flex h-[56svh] min-h-[380px] items-center justify-center rounded-2xl px-5 lg:hidden">
                <PrescriptionScene className="max-w-[400px] sm:max-w-[480px]" />
              </div>

              <div className="relative z-10 order-4 mt-6 max-w-[30rem] lg:order-3 lg:mx-auto lg:mt-[16svh]">
                <p className="text-[22px] leading-[1.3] tracking-[-0.015em] text-ink lg:text-[28px]">
                  Your family&apos;s prescriptions, read for you and dated on one calendar.
                </p>
                <p className="mt-4 text-[18px] leading-relaxed text-ink-2">
                  Photograph a prescription and MediVault reads the doctor, the date and every medicine. Each person gets their own colour; allergies stay in red.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <ButtonLink size="lg" href="/demo">
                    Try the demo <ArrowRight aria-hidden="true" />
                  </ButtonLink>
                  <ButtonLink size="lg" variant="outline" href="/auth?mode=signup">
                    Create an account
                  </ButtonLink>
                </div>
                <p className="mt-4 text-[14px] text-ink-3">The demo needs no account. It runs on a sample family.</p>
              </div>

              {/* The wordmark crosses onto the stage on desktop, so its box reaches
                  11vw to the left; clipping that box keeps the scaling wordmark from
                  ever widening the page. */}
              <div className="relative z-20 order-3 -mt-[4vw] overflow-x-clip lg:order-4 lg:-ml-[11vw] lg:mt-auto lg:pb-10">
                <Wordmark className="whitespace-nowrap text-[21vw] font-light leading-[0.8] tracking-[-0.04em] text-ink lg:text-[clamp(120px,12.6vw,230px)]" />
              </div>
            </section>

            {/* Features */}
            <section id="features" aria-labelledby="features-title" className="scroll-mt-6 px-4 pt-24 sm:px-8 lg:pl-[clamp(40px,4.5vw,72px)] lg:pr-10 lg:pt-40">
              <Reveal>
                <h2 data-stage="features" id="features-title" className={cn(H2, 'max-w-[14ch]')}>
                  What it keeps track of
                </h2>
                <p className="mt-5 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">
                  One account for everyone you look after. Every piece shown here is the real app, running on a sample family.
                </p>
              </Reveal>
              <div className="mt-16 space-y-20 lg:mt-24 lg:space-y-28">
                {FEATURES.map((f, i) => (
                  <Reveal key={f.title} stage={f.stage}>
                    <h3 className="text-[28px] font-normal leading-tight tracking-[-0.02em]">{f.title}</h3>
                    <div className={cn('mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8', i % 2 === 1 && 'sm:flex-row-reverse sm:justify-end')}>
                      {f.crop}
                      <ul className="space-y-3.5 text-[18px] leading-snug text-ink sm:flex-1">
                        {f.lines.map((l) => (
                          <li key={l} className="flex gap-3">
                            <span aria-hidden="true" className="mt-[9px] size-1.5 shrink-0 rounded-full bg-band" />
                            {l}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Reveal>
                ))}
              </div>
            </section>

            {/* How it works */}
            <section data-stage="how" id="how-it-works" aria-labelledby="how-title" className="mt-28 scroll-mt-6 bg-canvas px-4 py-24 sm:px-8 lg:mt-36 lg:pl-[clamp(40px,4.5vw,72px)] lg:pr-10 lg:py-32">
              <Reveal>
                <h2 id="how-title" className={H2}>
                  Set up in one evening
                </h2>
                <p className="mt-5 max-w-[42ch] text-[18px] leading-relaxed text-ink-2">
                  Most families start with the paper file in the kitchen drawer. A few minutes of photos and the whole history is dated.
                </p>
              </Reveal>
              <div className="mt-12">
                <Reveal as="figure" delay={0.08}>
                  <Image
                    src="/photos/thomson-taylor-s-pharmacy-interior.jpg"
                    alt="Shelves of bottles and glass counters inside a chemist's shop"
                    width={1654}
                    height={1298}
                    sizes="(min-width: 1024px) 50vw, 100vw"
                    className="w-full rounded-xl grayscale sm:w-[78%]"
                  />
                  <figcaption className="mt-3 text-[14px] text-ink-3 sm:max-w-[22ch]">A chemist&apos;s counter in Bombay, 1902. Prescriptions have been paper ever since.</figcaption>
                </Reveal>
                <Reveal delay={0.16} className="relative mt-8 sm:-mt-28 sm:ml-auto sm:mr-6 sm:max-w-[440px]">
                  <div
                    className="bg-surface px-6 pb-12 pt-7 text-[16px] num shadow-[var(--shadow-lift)]"
                    style={{ clipPath: 'polygon(0 0,100% 0,100% calc(100% - 12px),95% 100%,90% calc(100% - 12px),85% 100%,80% calc(100% - 12px),75% 100%,70% calc(100% - 12px),65% 100%,60% calc(100% - 12px),55% 100%,50% calc(100% - 12px),45% 100%,40% calc(100% - 12px),35% 100%,30% calc(100% - 12px),25% 100%,20% calc(100% - 12px),15% 100%,10% calc(100% - 12px),5% 100%,0 calc(100% - 12px))' }}
                  >
                    <p className="text-center text-[15px] font-semibold">MediVault · your first week</p>
                    {SLIP.map((g) => (
                      <div key={g.when} className="mt-7">
                        <p className="font-semibold">{g.when}</p>
                        <ul className="mt-2 space-y-2">
                          {g.rows.map(([what, time]) => (
                            <li key={what} className="flex items-baseline gap-2">
                              <span className="text-ink-2">{what}</span>
                              <span aria-hidden="true" className="min-w-6 flex-1 translate-y-[-3px] border-b-[3px] border-dotted border-line-strong" />
                              <span className="shrink-0">{time}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <p className="-mx-6 mt-8 flex h-11 items-center justify-between gap-4 bg-navy px-6 font-medium text-white">
                      <span>Whole family, one calendar</span>
                      <span>under 10 min</span>
                    </p>
                  </div>
                </Reveal>
              </div>
              <div className="mt-14 flex justify-center lg:hidden">
                <FamilyScene />
              </div>
            </section>

            {/* Emergency card */}
            <section data-stage="card" id="emergency-card" aria-labelledby="card-title" className="scroll-mt-6 px-4 py-28 sm:px-8 lg:flex lg:min-h-[88svh] lg:flex-col lg:justify-center lg:pl-[clamp(40px,4.5vw,72px)] lg:pr-10 lg:py-40">
              <Reveal>
                <h2 id="card-title" className={cn(H2, 'max-w-[13ch]')}>
                  The card for the worst day
                </h2>
                <p className="mt-5 max-w-[40ch] text-[18px] leading-relaxed text-ink-2">
                  Blood group, allergies, current medicines and who to call, large enough to read in a hurry. Show it on a phone or print it for a wallet.
                </p>
              </Reveal>
              <Reveal delay={0.08} className="mt-10">
                <p className="mb-3 text-[15px] text-ink-3">Choose someone from the sample family:</p>
                <MemberTabs />
              </Reveal>
              <Reveal delay={0.14} className="mt-12 flex flex-wrap gap-3">
                <ButtonLink size="lg" variant="navy" href="/demo">
                  See it in the demo <ArrowRight aria-hidden="true" />
                </ButtonLink>
                <ButtonLink size="lg" variant="outline" href="/auth?mode=signup">
                  Make one for your family
                </ButtonLink>
              </Reveal>
            </section>

            {/* Security */}
            <section data-stage="security" id="security" aria-labelledby="security-title" className="scroll-mt-6 bg-navy px-4 py-24 text-white sm:px-8 lg:pl-[clamp(40px,4.5vw,72px)] lg:pr-10 lg:py-36">
              <Reveal>
                <h2 id="security-title" className={cn(H2, 'max-w-[14ch]')}>
                  Private by default
                </h2>
                <p className="mt-5 max-w-[46ch] text-[18px] leading-relaxed text-white/80">
                  Health records deserve more than a password. These protections live in the database and on the server, not in the app&apos;s screens.
                </p>
              </Reveal>
              <dl className="mt-14 grid gap-x-10 gap-y-10 sm:grid-cols-2">
                {PRIVACY.map(([t, b], i) => (
                  <Reveal key={t} delay={i * 0.07}>
                    <dt className="text-[22px] font-medium">{t}</dt>
                    <dd className="mt-2 text-[16px] leading-relaxed text-white/75">{b}</dd>
                  </Reveal>
                ))}
              </dl>
              <div className="mt-14 lg:hidden">
                <PolicyScene />
              </div>
              <Reveal className="mt-16 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-baseline sm:gap-x-8">
                <p className="text-[18px] text-white/70">Built on</p>
                {['Supabase', 'Postgres', 'Google Gemini', 'Next.js'].map((n) => (
                  <p key={n} className="text-[22px] font-medium tracking-[-0.01em]">
                    {n}
                  </p>
                ))}
              </Reveal>
            </section>
          </main>
        </div>

        {/* Closing: the first step, already open */}
        <section aria-labelledby="closing-title" className="mesh">
          <div className="mx-auto grid max-w-[1440px] items-end gap-12 lg:min-h-[90svh] px-4 py-20 sm:px-8 lg:grid-cols-2 lg:items-center lg:px-10 lg:py-24">
            <Reveal className="lg:self-end">
              <h2 id="closing-title" className="max-w-[14ch] font-heading text-[clamp(44px,7vw,112px)] leading-[0.92] tracking-[-0.04em]">
                Start with one prescription
              </h2>
              <p className="mt-6 max-w-[38ch] text-[18px] leading-relaxed text-ink">
                Try the demo first, with a sample family and nothing to set up. When you&apos;re ready, add your own and photograph the first prescription.
              </p>
            </Reveal>
            <div className="flex justify-center lg:justify-end">
              <AddMemberDialog />
            </div>
          </div>
        </section>

        {/* Footer: the name across the last photograph */}
        <footer className="relative isolate flex lg:min-h-[86svh] flex-col overflow-hidden text-white">
          <Image
            src="/photos/india-varanasi-pharmacy-0835.jpg"
            alt=""
            fill
            sizes="100vw"
            className="-z-10 object-cover brightness-[0.42]"
          />
          <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-4 pt-10 sm:px-8 lg:px-10">
            <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
              <nav aria-label="Footer">
                <ul className="space-y-2 text-[18px]">
                  <li><Link href="/demo" className="hover:underline underline-offset-4">Try the demo</Link></li>
                  <li><Link href="/auth?mode=signup" className="hover:underline underline-offset-4">Create an account</Link></li>
                  <li><Link href="/auth" className="hover:underline underline-offset-4">Log in</Link></li>
                  <li><a href={GITHUB} target="_blank" rel="noreferrer" className="hover:underline underline-offset-4">Source on GitHub</a></li>
                </ul>
              </nav>
              <p className="max-w-[36ch] text-[18px] leading-relaxed text-white/85 sm:text-right">
                A personal project by K S Phanindra. Not a medical device: AI output can be wrong, so confirm medical decisions with a doctor or pharmacist.
              </p>
            </div>
            <p aria-hidden="true" className="mt-auto pt-24 text-[22vw] font-light leading-[0.78] tracking-[-0.04em] lg:text-[20.5vw]">
              MediVault
            </p>
            <p className="max-w-[60ch] pb-6 pt-6 text-[14px] leading-relaxed text-white/70">
              © {new Date().getFullYear()} K S Phanindra. Photographs: “India - Varanasi pharmacy” by Jorge Royan, CC BY-SA 3.0; “Thomson &amp; Taylor&apos;s
              pharmacy, interior”, Wellcome Collection, CC BY 4.0; both via Wikimedia Commons.
            </p>
          </div>
        </footer>
      </div>
    </StageProvider>
  )
}
