'use client'

import QRCode from 'qrcode'

// The QR code and the two downloads made from it: a wallet-size card to print
// and a phone lock-screen picture. Drawn on a canvas in the browser, so the
// card details never go to a server to be turned into an image.

export type CardFace = {
  name: string
  bloodGroup: string | null
  allergies: string[]
  contactName: string | null
  contactPhone: string | null
}

const INK = '#0D253D'
const INK_2 = '#425466'
const NAVY = '#0A2540'
const RED_INK = '#A61B13'

function modules(text: string) {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' })
  return { size: qr.modules.size, dark: (r: number, c: number) => !!qr.modules.get(r, c) }
}

// An SVG path of the dark modules, in module units, with a 4-module quiet zone.
export function qrPath(text: string) {
  const { size, dark } = modules(text)
  let d = ''
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (dark(r, c)) d += `M${c + 4} ${r + 4}h1v1h-1z`
  return { d, view: size + 8 }
}

function drawQr(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number) {
  const { size, dark } = modules(text)
  const cell = Math.floor(width / (size + 8))
  const side = cell * (size + 8)
  const ox = x + Math.floor((width - side) / 2)
  ctx.fillStyle = '#fff'
  ctx.fillRect(ox, y, side, side)
  ctx.fillStyle = '#000'
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (dark(r, c)) ctx.fillRect(ox + (c + 4) * cell, y + (r + 4) * cell, cell, cell)
  return side
}

// Breaks text into at most `max` lines that fit, ending the last with "…" if cut.
function lines(ctx: CanvasRenderingContext2D, text: string, width: number, max: number) {
  const words = text.split(/\s+/)
  const out: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (ctx.measureText(next).width <= width || !line) line = next
    else {
      out.push(line)
      line = w
    }
  }
  if (line) out.push(line)
  if (out.length <= max) return out
  const kept = out.slice(0, max)
  let last = kept[max - 1]
  while (last && ctx.measureText(`${last}…`).width > width) last = last.slice(0, -1)
  kept[max - 1] = `${last.trimEnd()}…`
  return kept
}

const fit = (ctx: CanvasRenderingContext2D, text: string, width: number) => lines(ctx, text, width, 1)[0] || ''

async function fontFamily() {
  const inter = getComputedStyle(document.documentElement).getPropertyValue('--font-inter').trim()
  const family = `${inter ? `${inter}, ` : ''}system-ui, sans-serif`
  try {
    await Promise.all([document.fonts.load(`700 40px ${family}`), document.fonts.load(`400 40px ${family}`)])
  } catch {}
  return family
}

function canvas(w: number, h: number) {
  const el = document.createElement('canvas')
  el.width = w
  el.height = h
  return [el, el.getContext('2d')!] as const
}

// 85.6 × 54 mm (a bank card) at 300 dpi.
export async function walletCard(face: CardFace, link: string) {
  const f = await fontFamily()
  const [el, ctx] = canvas(1011, 638)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 1011, 638)
  ctx.strokeStyle = '#C1CCD8'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 1009, 636)

  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, 1011, 150)
  ctx.fillStyle = '#DCE6F2'
  ctx.font = `600 28px ${f}`
  ctx.fillText('Emergency medical information', 44, 58)
  ctx.fillStyle = '#fff'
  ctx.font = `700 52px ${f}`
  ctx.fillText(fit(ctx, face.name, 920), 44, 120)

  const left = 520
  ctx.fillStyle = INK_2
  ctx.font = `600 26px ${f}`
  ctx.fillText('Blood group', 44, 205)
  ctx.fillStyle = INK
  ctx.font = `800 80px ${f}`
  ctx.fillText(face.bloodGroup || '—', 44, 288)

  ctx.fillStyle = INK_2
  ctx.font = `600 26px ${f}`
  ctx.fillText('Allergies', 44, 345)
  ctx.font = `700 34px ${f}`
  ctx.fillStyle = face.allergies.length ? RED_INK : INK
  lines(ctx, face.allergies.length ? face.allergies.join(', ') : 'None known', left, 2).forEach((l, i) => ctx.fillText(l, 44, 388 + i * 40))

  if (face.contactPhone) {
    ctx.fillStyle = INK_2
    ctx.font = `600 26px ${f}`
    ctx.fillText(fit(ctx, `Call ${face.contactName || 'emergency contact'}`, left), 44, 498)
    ctx.fillStyle = INK
    ctx.font = `700 38px ${f}`
    ctx.fillText(fit(ctx, face.contactPhone, left), 44, 542)
  }
  ctx.fillStyle = INK_2
  ctx.font = `600 24px ${f}`
  ctx.fillText('Ambulance 108 · Emergency 112', 44, 600)

  const side = drawQr(ctx, link, 615, 172, 360)
  ctx.fillStyle = INK
  ctx.font = `600 24px ${f}`
  ctx.textAlign = 'center'
  ctx.fillText('Scan for medicines and more', 615 + 180, 172 + side + 34)
  ctx.textAlign = 'left'
  return png(el, 300)
}

// Sized for a phone lock screen; the top third is left clear for the clock.
export async function lockScreen(face: CardFace, link: string) {
  const f = await fontFamily()
  const W = 1170
  const [el, ctx] = canvas(W, 2532)
  ctx.fillStyle = NAVY
  ctx.fillRect(0, 0, W, 2532)

  const x = 90
  const y = 880
  const w = W - 2 * x
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.roundRect(x, y, w, 1200, 48)
  ctx.fill()

  ctx.textAlign = 'center'
  const cx = W / 2
  ctx.fillStyle = RED_INK
  ctx.font = `700 50px ${f}`
  ctx.fillText('In an emergency, scan this', cx, y + 100)

  const side = drawQr(ctx, link, cx - 320, y + 140, 640)
  let ty = y + 140 + side + 90
  ctx.fillStyle = INK
  ctx.font = `700 60px ${f}`
  ctx.fillText(fit(ctx, face.name, w - 80), cx, ty)
  ty += 76
  ctx.font = `600 46px ${f}`
  ctx.fillText(`Blood group ${face.bloodGroup || 'not known'}`, cx, ty)
  ty += 76
  ctx.font = `700 44px ${f}`
  ctx.fillStyle = face.allergies.length ? RED_INK : INK
  for (const l of lines(ctx, face.allergies.length ? `Allergic to ${face.allergies.join(', ')}` : 'No known allergies', w - 80, 2)) {
    ctx.fillText(l, cx, ty)
    ty += 56
  }
  if (face.contactPhone) {
    ty += 20
    ctx.fillStyle = INK_2
    ctx.font = `500 40px ${f}`
    ctx.fillText(fit(ctx, `Call ${face.contactName ? `${face.contactName}: ` : ''}${face.contactPhone}`, w - 80), cx, ty)
  }
  ctx.fillStyle = '#fff'
  ctx.font = `600 40px ${f}`
  ctx.fillText('Ambulance 108 · Emergency 112', cx, y + 1200 + 90)
  return png(el, 0)
}

// canvas → PNG; with dpi, a pHYs chunk so it prints at its real size.
async function png(el: HTMLCanvasElement, dpi: number) {
  const blob = await new Promise<Blob>((ok, fail) => el.toBlob((b) => (b ? ok(b) : fail(new Error('Could not draw the image'))), 'image/png'))
  if (!dpi) return blob
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // pHYs
  view.setUint32(8, ppm)
  view.setUint32(12, ppm)
  chunk[16] = 1 // metres
  view.setUint32(17, crc32(chunk.subarray(4, 17)))
  // After the signature (8 bytes) and IHDR (25 bytes).
  return new Blob([bytes.subarray(0, 33), chunk, bytes.subarray(33)], { type: 'image/png' })
}

let table: Uint32Array | null = null
function crc32(data: Uint8Array) {
  if (!table) {
    table = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      table[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (const b of data) c = table[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
