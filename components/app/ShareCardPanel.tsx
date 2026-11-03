'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Download, ExternalLink, Loader2, QrCode, RotateCw, Smartphone } from 'lucide-react'
import { toast } from 'sonner'
import { saveError, supabase, userForSave } from '@/lib/supabase'
import { useDemo } from '@/lib/demo/mode'
import { sampleMembers } from '@/lib/sample-family'
import {
  DEMO_CARD_TOKEN,
  cardLink,
  dayFromExpiry,
  expiryFromDay,
  hashCardToken,
  isExpired,
  newCardToken,
  type EmergencyLink,
} from '@/lib/emergency-link'
import { download, lockScreen, qrPath, walletCard, type CardFace } from '@/lib/card-images'
import { addDays } from '@/lib/medicines'
import { formatDay, todayISO } from '@/lib/dates'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ErrorLine, Panel, PanelHead } from '@/components/app/kit'

// The token only exists in the link. The device that made it keeps a copy so
// the QR can be shown and downloaded again here; anywhere else it has to be
// made again. The database only ever sees its hash.
const tokenKey = (linkId: string) => `medivault-card-token:${linkId}`

function rememberToken(linkId: string, token: string) {
  try {
    localStorage.setItem(tokenKey(linkId), token)
  } catch {}
}

async function tokenFor(link: EmergencyLink) {
  let token: string | null = null
  try {
    token = localStorage.getItem(tokenKey(link.id))
  } catch {}
  return token && (await hashCardToken(token)) === link.token_hash ? token : null
}

const openedAt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })

const fileName = (kind: string, name: string) => `${kind}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.png`

export default function ShareCardPanel({ memberId, face }: { memberId: string; face: CardFace | null }) {
  const demo = useDemo()
  const [link, setLink] = useState<EmergencyLink | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [opens, setOpens] = useState<string[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [busy, setBusy] = useState<'' | 'create' | 'revoke' | 'expiry' | 'wallet' | 'lock'>('')
  const [confirm, setConfirm] = useState<'' | 'revoke' | 'regenerate'>('')
  const [expiry, setExpiry] = useState('')
  const [error, setError] = useState('')

  // The demo's links open the sample card at /e/demo-<member>; members added in the demo use Ramesh's.
  const demoToken = `${DEMO_CARD_TOKEN}-${sampleMembers.some((m) => m.id === memberId) ? memberId : 'ramesh'}`

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('emergency_links')
      .select('id, family_member_id, token_hash, expires_at, revoked_at, created_at')
      .eq('family_member_id', memberId)
      .is('revoked_at', null)
      .maybeSingle()
    if (error) return setStatus('error')
    setLink(data)
    setExpiry(data?.expires_at ? dayFromExpiry(data.expires_at) : '')
    setToken(data ? (demo ? demoToken : await tokenFor(data)) : null)
    if (data) {
      const o = await supabase.from('emergency_link_opens').select('opened_at').eq('link_id', data.id).order('opened_at', { ascending: false }).limit(10)
      setOpens((o.data || []).map((x) => x.opened_at))
    } else setOpens([])
    setStatus('ready')
  }, [memberId, demo, demoToken])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load()
  }, [load])

  // A new link replaces the live one: the old token stops working at once.
  const create = async () => {
    setConfirm('')
    setError('')
    if (expiry && expiry <= todayISO()) return setError('Pick an expiry date after today, or leave it empty.')
    const user = await userForSave()
    if (user.error) return setError(user.error)
    setBusy('create')
    const fresh = demo ? demoToken : newCardToken()
    if (link) {
      const { error } = await supabase.from('emergency_links').update({ revoked_at: new Date().toISOString() }).eq('id', link.id)
      if (error) {
        setBusy('')
        return setError(saveError("Couldn't replace the old link. Try again."))
      }
    }
    const { data, error } = await supabase
      .from('emergency_links')
      .insert({ family_member_id: memberId, token_hash: await hashCardToken(fresh), expires_at: expiry ? expiryFromDay(expiry) : null })
      .select('id')
      .single()
    setBusy('')
    if (error || !data) {
      await load()
      return setError(saveError("Couldn't make the link. Try again."))
    }
    rememberToken(data.id, fresh)
    toast.success(link ? 'New QR made. The old one no longer works.' : 'QR link made')
    await load()
  }

  const revoke = async () => {
    if (!link) return
    setConfirm('')
    setBusy('revoke')
    const { error } = await supabase.from('emergency_links').update({ revoked_at: new Date().toISOString() }).eq('id', link.id)
    setBusy('')
    if (error) return setError(saveError("Couldn't turn off the link. Try again."))
    try {
      localStorage.removeItem(tokenKey(link.id))
    } catch {}
    toast.success('Link turned off. The QR no longer works.')
    await load()
  }

  const saveExpiry = async (day: string) => {
    if (!link) return
    setError('')
    if (day && day <= todayISO()) return setError('Pick an expiry date after today, or remove the expiry.')
    setBusy('expiry')
    const { error } = await supabase.from('emergency_links').update({ expires_at: day ? expiryFromDay(day) : null }).eq('id', link.id)
    setBusy('')
    if (error) return setError(saveError("Couldn't save the expiry date. Try again."))
    toast.success(day ? `Link works until ${formatDay(day)}` : 'Expiry removed')
    await load()
  }

  const save = async (kind: 'wallet' | 'lock') => {
    if (!token || !face) return
    setBusy(kind)
    try {
      const blob = kind === 'wallet' ? await walletCard(face, cardLink(token)) : await lockScreen(face, cardLink(token))
      download(blob, fileName(kind === 'wallet' ? 'emergency-card' : 'lock-screen', face.name))
    } catch {
      toast.error("Couldn't make the image. Try again.")
    }
    setBusy('')
  }

  const copy = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(cardLink(token))
      toast.success('Link copied')
    } catch {
      toast.error("Couldn't copy. Select the link and copy it instead.")
    }
  }

  const expired = !!link && isExpired(link)
  const url = token ? cardLink(token) : ''
  const qr = token ? qrPath(url) : null
  const first = face?.name.split(' ')[0] || 'them'

  return (
    <Panel labelledBy="share" className="mx-auto mt-6 max-w-[680px] print:hidden">
      <div id="share-qr" className="scroll-mt-24" />
      <PanelHead
        id="share"
        title="Share via QR"
        hint={`Anyone who scans it sees this card: name, age, blood group, allergies, conditions, current medicines and who to call. Nothing else from your account.`}
      />

      {status === 'loading' && <Skeleton className="mt-4 h-40 rounded-lg" />}
      {status === 'error' && <ErrorLine onRetry={load}>Couldn&apos;t load the QR link. Check your connection and try again.</ErrorLine>}
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-soft px-4 py-3 text-[15px] text-red-ink">
          {error}
        </p>
      )}

      {status === 'ready' && !link && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <p className="text-[15px]">
            Make a link and QR code for {first}&apos;s card, then print it as a wallet card or set it as a phone lock screen. You can turn it off at any time.
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="qr-expiry" className="mb-1.5 block text-[14px] font-medium text-ink-2">
                Stops working on <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <Input id="qr-expiry" name="qr-expiry" type="date" min={addDays(todayISO(), 1)} value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-auto" />
            </div>
            <Button onClick={create} disabled={busy === 'create' || !face}>
              {busy === 'create' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <QrCode aria-hidden="true" />}
              {busy === 'create' ? 'Making the link…' : 'Make a QR link'}
            </Button>
          </div>
        </div>
      )}

      {status === 'ready' && link && (
        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-line bg-surface p-4">
            <p className="text-[15px] font-medium">
              {expired ? (
                <span className="text-red-ink">Expired on {formatDay(dayFromExpiry(link.expires_at!))}. The QR shows “This card is no longer active”.</span>
              ) : (
                <>
                  Live since {formatDay(link.created_at)}
                  {link.expires_at ? `, until ${formatDay(dayFromExpiry(link.expires_at))}` : ', until you turn it off'}.
                </>
              )}
            </p>

            {qr ? (
              <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
                <svg
                  viewBox={`0 0 ${qr.view} ${qr.view}`}
                  role="img"
                  aria-label={`QR code that opens ${face?.name || 'this'} emergency card`}
                  className="size-44 shrink-0 rounded-md border border-line bg-white"
                  shapeRendering="crispEdges"
                >
                  <path d={qr.d} fill="#000" />
                </svg>
                <div className="min-w-0 flex-1 space-y-3">
                  <p className="break-all rounded-md bg-canvas px-3 py-2 font-mono text-[13px] text-ink-2" translate="no">
                    {url}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={copy}>
                      <Copy aria-hidden="true" /> Copy link
                    </Button>
                    <a href={demo ? `/e/${token}` : url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                      Open <ExternalLink aria-hidden="true" />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                    <Button size="sm" onClick={() => save('wallet')} disabled={!!busy || !face}>
                      {busy === 'wallet' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Download aria-hidden="true" />} Wallet card
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => save('lock')} disabled={!!busy || !face}>
                      {busy === 'lock' ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Smartphone aria-hidden="true" />} Lock screen
                    </Button>
                  </div>
                  <p className="text-[13px] text-ink-3">
                    The wallet card is bank-card size: print it at 100% (actual size).
                    {demo && ' In the demo, every QR opens a sample card.'}
                  </p>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-[14px] text-ink-2">
                The QR for this link was made in another browser or on another device. For safety MediVault keeps only a fingerprint of the link, so it can&apos;t show
                the QR again here. Make a new QR to download it; the old one stops working.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-surface p-4">
              <label htmlFor="qr-expiry-edit" className="block text-[14px] font-medium text-ink-2">
                Stops working on
              </label>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input id="qr-expiry-edit" name="qr-expiry" type="date" min={addDays(todayISO(), 1)} value={expiry} onChange={(e) => setExpiry(e.target.value)} className="w-auto" />
                <Button size="sm" variant="outline" onClick={() => saveExpiry(expiry)} disabled={busy === 'expiry' || expiry === (link.expires_at ? dayFromExpiry(link.expires_at) : '')}>
                  Save
                </Button>
                {link.expires_at && (
                  <Button size="sm" variant="ghost" onClick={() => saveExpiry('')} disabled={busy === 'expiry'}>
                    No expiry
                  </Button>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-surface p-4">
              <p className="text-[14px] font-medium text-ink-2">Last opened</p>
              {opens.length ? (
                <ul className="mt-1.5 space-y-0.5 text-[14px] num">
                  {opens.slice(0, 5).map((o) => (
                    <li key={o}>{openedAt(o)}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1.5 text-[14px] text-ink-3">Not opened yet</p>
              )}
              <p className="mt-2 text-[12.5px] text-ink-3">Times only. Nothing about who opened it is kept.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setConfirm('regenerate')} disabled={!!busy}>
              <RotateCw aria-hidden="true" /> Make a new QR
            </Button>
            <Button variant="destructive" onClick={() => setConfirm('revoke')} disabled={!!busy}>
              {busy === 'revoke' && <Loader2 className="animate-spin" aria-hidden="true" />} Turn off link
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm('')}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === 'revoke' ? 'Turn off this link?' : 'Make a new QR?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === 'revoke'
                ? 'Anyone who scans the current QR, including printed cards and lock screens, will see “This card is no longer active”. You can make a new one at any time.'
                : 'The current QR stops working straight away, including printed cards and lock screens. Download and print the new one.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant={confirm === 'revoke' ? 'destructive' : 'default'} onClick={confirm === 'revoke' ? revoke : create}>
              {confirm === 'revoke' ? 'Turn off link' : 'Make a new QR'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  )
}
