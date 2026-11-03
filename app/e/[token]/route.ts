import { NextRequest } from 'next/server'
import { publicCard, type PublicCard } from '@/lib/emergency-public'
import { rateLimited } from '@/lib/rate-limit'

// The public emergency card behind a QR code. Plain server-rendered HTML with
// no scripts, so it opens fast on a weak connection and works without login.
// Only this route reads the database with the service-role key, and only the
// fields in PublicCard leave it.

export const dynamic = 'force-dynamic'

const PER_MINUTE = 30

const HEADERS = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'Referrer-Policy': 'no-referrer',
}

export async function GET(req: NextRequest, ctx: RouteContext<'/e/[token]'>) {
  const { token } = await ctx.params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  if (rateLimited(`card:${ip}`, PER_MINUTE, 60_000)) {
    return new Response(page('Too many requests', notice('Too many requests', 'Wait a minute, then open the link again.')), {
      status: 429,
      headers: { ...HEADERS, 'Retry-After': '60' },
    })
  }

  let card: PublicCard | null = null
  try {
    card = await publicCard(token)
  } catch (err) {
    console.error('Emergency card lookup failed:', err)
    return new Response(page('Something went wrong', notice('Couldn’t load this card', 'Try again in a moment.')), { status: 500, headers: HEADERS })
  }
  if (!card) {
    return new Response(page('Card not active', notice('This card is no longer active', 'The person who shared it has turned it off, or it has expired.')), {
      status: 404,
      headers: HEADERS,
    })
  }
  return new Response(page(`Emergency information`, cardBody(card)), { headers: HEADERS })
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const tel = (phone: string) => phone.replace(/[^\d+]/g, '')

function cardBody(c: PublicCard) {
  const contact = c.contactName || c.contactPhone
  return `
<main>
  ${c.sample ? '<p class="sample">Sample card from the MediVault demo. This is not a real person.</p>' : ''}
  <header>
    <p class="kicker">Emergency medical information</p>
    <h1>${esc(c.name)}</h1>
    ${c.age !== null ? `<p class="age">Age ${c.age}</p>` : ''}
  </header>
  ${
    c.allergies.length
      ? `<section class="allergies" aria-labelledby="h-allergies"><h2 id="h-allergies">Allergies</h2><ul>${c.allergies.map((a) => `<li>${esc(a)}</li>`).join('')}</ul></section>`
      : `<section class="no-allergies" aria-labelledby="h-allergies"><h2 id="h-allergies">Allergies</h2><p>None known</p></section>`
  }
  <section class="blood" aria-labelledby="h-blood"><h2 id="h-blood">Blood group</h2><p>${c.bloodGroup ? esc(c.bloodGroup) : '<span class="muted">Not known</span>'}</p></section>
  <section aria-labelledby="h-conditions"><h2 id="h-conditions">Conditions</h2><p>${c.conditions.length ? esc(c.conditions.join(', ')) : '<span class="muted">None known</span>'}</p></section>
  <section aria-labelledby="h-meds"><h2 id="h-meds">Current medicines</h2>${
    c.medicines.length ? `<ul class="meds">${c.medicines.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>` : '<p class="muted">None on record</p>'
  }</section>
  <section aria-labelledby="h-contact"><h2 id="h-contact">Emergency contact</h2>${
    contact
      ? `${c.contactName ? `<p class="contact">${esc(c.contactName)}</p>` : ''}${
          c.contactPhone ? `<a class="btn teal" href="tel:${esc(tel(c.contactPhone))}">Call ${esc(c.contactName?.split(' ')[0] || 'contact')} <span>${esc(c.contactPhone)}</span></a>` : ''
        }`
      : '<p class="muted">Not added</p>'
  }</section>
  <p class="note">Shared by the family through MediVault. Medicines are read from prescriptions; a doctor should confirm them.</p>
</main>`
}

function notice(title: string, text: string) {
  return `
<main class="notice">
  <h1>${esc(title)}</h1>
  <p>${esc(text)}</p>
  <p>If this is an emergency, call for help below.</p>
</main>`
}

// Large type and strong contrast for someone reading it in a hurry, on a phone first.
function page(title: string, body: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex, nofollow, noarchive">
<meta name="referrer" content="no-referrer">
<meta name="theme-color" content="#0A2540">
<meta name="description" content="Emergency medical information shared from MediVault.">
<title>${esc(title)}</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<style>
*{box-sizing:border-box;margin:0}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{font:400 21px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0D253D;background:#fff;padding-bottom:calc(112px + env(safe-area-inset-bottom))}
main{max-width:640px;margin:0 auto;padding:0 20px}
header{background:#0A2540;color:#fff;margin:0 -20px;padding:24px 20px 22px}
.kicker{font-size:17px;font-weight:600;color:#DCE6F2}
h1{font-size:36px;line-height:1.15;font-weight:700;margin-top:6px;overflow-wrap:anywhere}
.age{font-size:22px;margin-top:4px;color:#fff}
section{padding:20px 0;border-bottom:2px solid #E3E8EE}
h2{font-size:18px;font-weight:700;color:#425466}
section p,section li{margin-top:6px}
ul{padding:0;list-style:none}
.allergies{background:#A61B13;color:#fff;margin:0 -20px;padding:20px;border:0}
.allergies h2{color:#fff}
.allergies li{font-size:30px;font-weight:800;line-height:1.2;overflow-wrap:anywhere}
.no-allergies p{font-size:24px;font-weight:600}
.blood p{font-size:72px;font-weight:800;line-height:1;letter-spacing:-0.02em}
.meds li{font-size:22px;font-weight:600;padding:6px 0;border-top:1px solid #E3E8EE}
.meds li:first-child{border-top:0}
.contact{font-size:26px;font-weight:700}
.muted{color:#425466;font-weight:400}
.note{font-size:16px;color:#425466;padding:20px 0}
.sample{background:#FFF5DB;color:#5C3E00;font-size:17px;font-weight:600;margin:0 -20px;padding:12px 20px}
.btn{display:flex;align-items:center;justify-content:center;gap:10px;min-height:60px;border-radius:999px;padding:10px 20px;font-size:22px;font-weight:700;color:#fff;text-decoration:none;text-align:center}
.btn span{font-weight:500}
.btn:focus-visible{outline:4px solid #12A594;outline-offset:3px}
.teal{background:#0B6B60;margin-top:12px}
.sos{position:fixed;left:0;right:0;bottom:0;display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:12px 16px calc(12px + env(safe-area-inset-bottom));background:#fff;border-top:2px solid #E3E8EE}
.sos .btn{flex-direction:column;gap:0;line-height:1.15;min-height:72px;border-radius:16px}
.sos .btn span{font-size:16px}
.red{background:#A61B13}
.navy{background:#0A2540}
.notice{padding-top:48px}
.notice h1{font-size:32px}
.notice p{margin-top:14px}
@media (min-width:700px){header,.allergies,.sample{margin:0;border-radius:0 0 16px 16px}.allergies{border-radius:16px;margin-top:16px}.sos{max-width:640px;margin:0 auto;border:2px solid #E3E8EE;border-bottom:0;border-radius:16px 16px 0 0}}
</style>
</head>
<body>
${body}
<nav class="sos" aria-label="Emergency numbers">
  <a class="btn red" href="tel:112">Call 112<span>Emergency</span></a>
  <a class="btn navy" href="tel:108">Call 108<span>Ambulance</span></a>
</nav>
</body>
</html>`
}
