import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight,
  BellRing,
  Droplet,
  Database,
  FileLock2,
  FileText,
  KeyRound,
  MessageCircle,
  Palette,
  Phone,
  Pill,
  ScanText,
  ShieldCheck,
  Siren,
  Syringe,
  TriangleAlert,
  Upload,
  UserPlus,
} from 'lucide-react'
import LandingNav from '@/components/landing/LandingNav'
import HeroCards from '@/components/landing/HeroCards'
import ProductMockup from '@/components/landing/ProductMockup'
import { DocChatPreview, EmergencyCardPreview } from '@/components/landing/Showcase'
import { BlurFade } from '@/components/ui/blur-fade'
import { DotPattern } from '@/components/ui/dot-pattern'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Logo from '@/components/Logo'
import MemberAvatar from '@/components/app/MemberAvatar'

export const metadata: Metadata = {
  title: { absolute: "MediVault · Your family's health, on one calendar" },
}

const GITHUB = 'https://github.com/phanindraks2005/medivault'

export default function Landing() {
  return (
    <div className="bg-canvas text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <LandingNav />

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden pt-28 md:pt-36">
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 px-5 md:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
            <div>
              <BlurFade delay={0.05}>
                <h1 className="font-heading text-[44px] font-extrabold leading-[1.02] tracking-[-0.025em] sm:text-[58px] lg:text-[68px]">
                  Your family&apos;s health, on one calendar
                </h1>
              </BlurFade>
              <BlurFade delay={0.15}>
                <p className="mt-6 max-w-[34rem] text-[18px] leading-relaxed text-ink-2 md:text-[20px]">
                  Photograph a prescription and MediVault reads the doctor, the date and every medicine. Each person gets their own
                  colour, allergies stay in red, and you always know what&apos;s due next.
                </p>
              </BlurFade>
              <BlurFade delay={0.25}>
                <div className="mt-9 flex flex-wrap gap-3">
                  <Button size="lg" nativeButton={false} render={<Link href="/demo" />}>
                    Try the demo <ArrowRight aria-hidden="true" />
                  </Button>
                  <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/auth?mode=signup" />}>
                    Sign up
                  </Button>
                </div>
                <p className="mt-5 text-[14px] text-ink-3">Free to use · No card needed · The demo needs no account</p>
              </BlurFade>
            </div>
            <HeroCards />
          </div>

          <div className="relative mt-20 md:mt-24">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 top-[18%]"
              style={{ background: 'linear-gradient(180deg, #0b6b60 0%, #08524a 100%)' }}
            />
            <DotPattern
              width={22}
              height={22}
              cr={1.2}
              className="absolute inset-x-0 bottom-0 top-[18%] h-[82%] text-white/[0.09] [mask-image:linear-gradient(to_bottom,white,transparent)]"
            />
            <div className="relative mx-auto max-w-[1200px] px-5 pb-20 md:px-8 md:pb-28">
              <ProductMockup />
              <p className="mt-6 text-center text-[14px] text-white/75">The real dashboard, running with a sample family</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" aria-labelledby="features-title" className="scroll-mt-20 py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <BlurFade inView>
              <h2 id="features-title" className="max-w-[24ch] font-heading text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[48px]">
                Everything a family organiser keeps track of
              </h2>
              <p className="mt-4 max-w-[46ch] text-[18px] text-ink-2">
                One account for everyone you look after: parents, partner, children. No more digging through paper files at the pharmacy counter.
              </p>
            </BlurFade>

            <div className="mt-14 grid gap-4 md:grid-cols-6">
              <Feature className="md:col-span-4" icon={ScanText} title="Reads prescriptions for you" delay={0}>
                Upload a photo or PDF. Gemini pulls out the doctor, the date the prescription was written, and each medicine with its dose and timing. You can
                correct anything it gets wrong.
                <div className="mt-6 grid gap-2 sm:grid-cols-3">
                  {[
                    ['Amlodipine', '5 mg · morning'],
                    ['Metformin', '500 mg · twice'],
                    ['Atorvastatin', '10 mg · night'],
                  ].map(([n, d]) => (
                    <div key={n} className="rounded-xl bg-canvas px-4 py-3">
                      <p className="font-semibold">{n}</p>
                      <p className="text-[13.5px] text-ink-3 num">{d}</p>
                    </div>
                  ))}
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={Palette} title="One colour per person" delay={0.05}>
                Every member keeps their colour on every screen, so a glance at the calendar tells you whose day it is.
                <div className="mt-6 flex -space-x-2">
                  {[
                    ['Arjun', '#3b6fd8'],
                    ['Ramesh', '#8c4fbf'],
                    ['Sunita', '#2e8540'],
                    ['Diya', '#0e7c9a'],
                  ].map(([n, c]) => (
                    <MemberAvatar key={n} name={n} color={c} size={40} className="ring-[3px] ring-white" />
                  ))}
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={TriangleAlert} title="Red means act now" delay={0.1}>
                Red is kept for two things: overdue dates and allergies. Nothing else on the screen competes with them.
                <div className="mt-6 flex flex-wrap gap-1.5">
                  <Badge variant="overdue">Overdue 12 days</Badge>
                  <Badge variant="overdue">Allergic: Penicillin</Badge>
                  <Badge variant="due">In 6 days</Badge>
                </div>
              </Feature>
              <Feature className="md:col-span-2" icon={MessageCircle} title="Doc answers from your records" delay={0.15}>
                Ask “what is Mum taking for her thyroid?” and get an answer from her actual prescriptions, not a generic search.
              </Feature>
              <Feature className="md:col-span-2" icon={Syringe} title="Vaccinations with due dates" delay={0.2}>
                Log each dose with its next due date. Due-soon items turn marigold, overdue ones turn red, and both land on the calendar.
              </Feature>
              <Feature className="md:col-span-3" icon={BellRing} title="Interaction checker" delay={0.05}>
                Check a member&apos;s current medicines against each other, or against a new one the chemist suggests, before anyone takes it.
              </Feature>
              <Feature className="md:col-span-3" icon={FileText} title="Visit summaries" delay={0.1}>
                Turn months of records into a short summary to read out at the next appointment.
              </Feature>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-20 bg-surface py-24 md:py-32">
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 md:px-8 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <BlurFade inView>
              <div className="lg:sticky lg:top-28">
                <h2 id="how-title" className="font-heading text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[48px]">
                  Set up in an evening
                </h2>
                <p className="mt-4 max-w-[38ch] text-[18px] leading-relaxed text-ink-2">
                  Most families start with the paper file in the kitchen drawer. Ten minutes of photos and the whole history is dated and searchable.
                </p>
                <Image src="/illustrations/family.svg" alt="" width={420} height={323} className="mt-10 hidden w-full max-w-[400px] lg:block" />
              </div>
            </BlurFade>
            <ol className="relative space-y-4 before:absolute before:bottom-10 before:left-[39px] before:top-10 before:w-0.5 before:bg-band/15">
              {[
                {
                  icon: UserPlus,
                  title: 'Add your family',
                  body: 'Start with yourself, then add parents, partner and children with their blood group, allergies and conditions.',
                },
                {
                  icon: Upload,
                  title: 'Upload a prescription',
                  body: 'Take a photo or upload a PDF. MediVault reads it in a few seconds and files it under the right person and date.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Stay ahead of it',
                  body: 'See what’s due and overdue on the calendar, ask Doc questions, and open the emergency card when it matters.',
                },
              ].map((s, i) => (
                <BlurFade key={s.title} inView delay={i * 0.08}>
                  <li className="relative flex gap-6 rounded-3xl bg-canvas p-6 md:p-7">
                    <span className="relative z-10 grid size-[54px] shrink-0 place-items-center rounded-2xl bg-band font-display text-[30px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgb(11_107_96/0.7)] num">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="flex items-center gap-2 font-heading text-[22px] font-bold">
                        <s.icon className="size-5 text-band" aria-hidden="true" /> {s.title}
                      </h3>
                      <p className="mt-2 text-[16px] leading-relaxed text-ink-2">{s.body}</p>
                    </div>
                  </li>
                </BlurFade>
              ))}
            </ol>
          </div>
        </section>

        {/* Showcase */}
        <section aria-labelledby="showcase-title" className="py-24 md:py-32">
          <div className="mx-auto max-w-[1200px] px-5 md:px-8">
            <div className="grid items-center gap-14 lg:grid-cols-2">
              <BlurFade inView>
                <div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-red-soft text-red">
                    <Siren className="size-6" aria-hidden="true" />
                  </span>
                  <h2 id="showcase-title" className="mt-6 font-heading text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[44px]">
                    The card you show in an emergency
                  </h2>
                  <p className="mt-4 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">
                    Blood group, allergies, current medicines and who to call, set large enough to read in a hurry. Show it on your phone or print it for
                    a parent&apos;s wallet.
                  </p>
                  <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {[
                      ['Blood group, in large type', Droplet],
                      ['Allergies, in red', TriangleAlert],
                      ['Medicines from the latest records', Pill],
                      ['Who to call, one tap away', Phone],
                    ].map(([label, Icon]) => {
                      const I = Icon as typeof Pill
                      return (
                        <li key={label as string} className="flex items-center gap-3 rounded-2xl bg-surface p-4 shadow-card">
                          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-soft text-red">
                            <I className="size-[18px]" aria-hidden="true" />
                          </span>
                          <span className="text-[15px] font-medium">{label as string}</span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </BlurFade>
              <BlurFade inView delay={0.1}>
                <EmergencyCardPreview />
              </BlurFade>
            </div>

            <div className="mt-28 grid items-center gap-14 lg:grid-cols-2">
              <BlurFade inView className="lg:order-2">
                <div>
                  <span className="grid size-12 place-items-center rounded-2xl bg-band-soft text-band">
                    <MessageCircle className="size-6" aria-hidden="true" />
                  </span>
                  <h2 className="mt-6 font-heading text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[44px]">
                    Ask Doc, get your family&apos;s answer
                  </h2>
                  <p className="mt-4 max-w-[44ch] text-[18px] leading-relaxed text-ink-2">
                    Doc reads the records you&apos;ve saved before it answers, so it knows Dad&apos;s allergy and Mum&apos;s thyroid dose. For anything serious
                    it tells you to see a doctor.
                  </p>
                </div>
              </BlurFade>
              <BlurFade inView delay={0.1} className="lg:order-1">
                <DocChatPreview />
              </BlurFade>
            </div>
          </div>
        </section>

        {/* Security */}
        <section
          id="security"
          aria-labelledby="security-title"
          className="relative scroll-mt-20 overflow-hidden py-24 text-white md:py-32"
          style={{ background: 'linear-gradient(160deg, #0b6b60 0%, #08524a 55%, #063e38 100%)' }}
        >
          <DotPattern width={22} height={22} cr={1.2} className="text-white/[0.07] [mask-image:radial-gradient(ellipse_at_top_right,white,transparent_70%)]" />
          <div className="relative mx-auto max-w-[1200px] px-5 md:px-8">
            <BlurFade inView>
              <h2 id="security-title" className="max-w-[20ch] font-heading text-[36px] font-extrabold leading-[1.05] tracking-[-0.02em] md:text-[48px]">
                Medical records are private by default
              </h2>
              <p className="mt-4 max-w-[52ch] text-[18px] leading-relaxed text-white/80">
                Health data deserves more than a password. These protections are built into the database and the server, not bolted on.
              </p>
            </BlurFade>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Database,
                  title: 'Row level security',
                  body: 'Every table only returns rows where the owner is the signed-in user. Other accounts get nothing back.',
                },
                {
                  icon: FileLock2,
                  title: 'Private file storage',
                  body: 'Uploads go to a private bucket, in a folder only your account can read or write. There are no public links.',
                },
                {
                  icon: KeyRound,
                  title: 'Checked on the server',
                  body: 'Every AI request verifies your login token first, and only ever touches records your account owns.',
                },
                {
                  icon: ShieldCheck,
                  title: 'Only images and PDFs',
                  body: 'Uploads are limited to photos and PDFs up to 10 MB, enforced by the storage bucket itself.',
                },
              ].map((item, i) => (
                <BlurFade key={item.title} inView delay={i * 0.06}>
                  <div className="h-full rounded-2xl bg-white/[0.07] p-6 ring-1 ring-white/12 backdrop-blur-sm">
                    <item.icon className="size-6 text-due" aria-hidden="true" />
                    <h3 className="mt-4 font-heading text-[19px] font-bold">{item.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-white/75">{item.body}</p>
                  </div>
                </BlurFade>
              ))}
            </div>
            <p className="mt-10 text-[14px] text-white/65">Built with Next.js 16, Supabase (Postgres, Auth, Storage) and Google Gemini.</p>
          </div>
        </section>

        {/* Closing call to action */}
        <section className="py-24 md:py-32">
          <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 md:px-8 lg:grid-cols-[1fr_auto]">
            <BlurFade inView>
              <h2 className="max-w-[16ch] font-heading text-[40px] font-extrabold leading-[1.02] tracking-[-0.025em] md:text-[56px]">
                See your family&apos;s month in one place
              </h2>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" nativeButton={false} render={<Link href="/demo" />}>
                  Try the demo <ArrowRight aria-hidden="true" />
                </Button>
                <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/auth?mode=signup" />}>
                  Sign up
                </Button>
              </div>
            </BlurFade>
            <BlurFade inView delay={0.1}>
              <Image src="/illustrations/calendar-scene.svg" alt="" width={460} height={394} className="mx-auto w-full max-w-[460px]" />
            </BlurFade>
          </div>
        </section>
      </main>

      <footer className="border-t border-line bg-surface">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 md:flex-row md:items-start md:justify-between md:px-8">
          <div className="max-w-sm">
            <Logo size={30} />
            <p className="mt-4 text-[14px] leading-relaxed text-ink-3">
              A personal project, not a medical device. AI output can be wrong; always confirm medical decisions with a doctor or pharmacist.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-10 gap-y-3 text-[15px]">
            <Link href="/demo" className="text-ink-2 hover:text-ink">Demo</Link>
            <Link href="/auth?mode=signup" className="text-ink-2 hover:text-ink">Sign up</Link>
            <Link href="/auth" className="text-ink-2 hover:text-ink">Log in</Link>
            <a href={GITHUB} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-ink-2 hover:text-ink">
              <GithubMark /> GitHub
            </a>
          </nav>
        </div>
        <div className="border-t border-line">
          <p className="mx-auto max-w-[1200px] px-5 py-5 text-[13px] text-ink-3 md:px-8">
            © {new Date().getFullYear()} K S Phanindra · MediVault
          </p>
        </div>
      </footer>
    </div>
  )
}

function Feature({
  icon: Icon,
  title,
  children,
  className,
  delay = 0,
}: {
  icon: typeof ScanText
  title: string
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <BlurFade inView delay={delay} className={className}>
      <div className="group h-full rounded-3xl bg-surface p-7 shadow-card ring-1 ring-ink/[0.04] transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-lift md:p-8">
        <span className="grid size-11 place-items-center rounded-xl bg-band-soft text-band transition-colors duration-200 group-hover:bg-band group-hover:text-white">
          <Icon className="size-[22px]" aria-hidden="true" />
        </span>
        <h3 className="mt-5 font-heading text-[21px] font-bold leading-tight">{title}</h3>
        <div className="mt-2 text-[16px] leading-relaxed text-ink-2">{children}</div>
      </div>
    </BlurFade>
  )
}

// lucide dropped brand icons, so the GitHub mark is drawn here.
function GithubMark() {
  return (
    <svg viewBox="0 0 16 16" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
    </svg>
  )
}
