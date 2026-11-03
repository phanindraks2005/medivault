'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'motion/react'
import { ArrowUp, Loader2, RotateCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isOffline, saveError, supabase } from '@/lib/supabase'
import { AI_MESSAGES, aiMessage, askAi } from '@/lib/ai-client'
import { useFamily } from '@/lib/family-context'
import { Button } from '@/components/ui/button'
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
import { ease } from '@/lib/motion'
import { LIMITS } from '@/lib/limits'
import { cn } from '@/lib/utils'

type Message = { role: 'user' | 'assistant'; content: string }

// Matches the server, which ignores anything older.
const RECENT_TURNS = 12

// YYYY-MM-DD in the visitor's time zone, so "due in 3 days" matches their calendar.
function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function DocMark({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full bg-band font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      D
    </span>
  )
}

export default function DocPage() {
  const { members } = useFamily()
  const [userId, setUserId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [history, setHistory] = useState<'loading' | 'ready' | 'error'>('loading')
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  const loadHistory = useCallback(async () => {
    setHistory('loading')
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return
    setUserId(user.id)
    const { data, error } = await supabase.from('chat_history').select('role, content').order('created_at', { ascending: true })
    if (error) return setHistory('error')
    setMessages((data || []).map((d) => ({ role: d.role as Message['role'], content: d.content })))
    setHistory('ready')
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadHistory()
  }, [loadHistory])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  // The composer grows with its text, up to about six lines.
  useEffect(() => {
    const el = box.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`
  }, [input])

  const ask = async (list: Message[]) => {
    setSending(true)
    setError('')
    try {
      // Only recent turns are sent; the server reads the family's records itself.
      const data = await askAi<{ reply: string }>('doc-chat', { messages: list.slice(-RECENT_TURNS), today: localToday() })
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
      await supabase.from('chat_history').insert({ user_id: userId, role: 'assistant', content: data.reply })
    } catch (e) {
      setError(aiMessage(e))
    }
    setSending(false)
  }

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || !userId || sending) return
    // Offline: keep the question in the box rather than sending it into the void.
    if (isOffline()) return setError(AI_MESSAGES.offline)
    const list: Message[] = [...messages, { role: 'user', content: q }]
    setMessages(list)
    setInput('')
    supabase.from('chat_history').insert({ user_id: userId, role: 'user', content: q }).then()
    await ask(list)
  }

  const clear = async () => {
    const { error } = await supabase.from('chat_history').delete().eq('user_id', userId)
    setConfirmClear(false)
    if (error) return toast.error(saveError("Couldn't clear the conversation. Try again."))
    setMessages([])
    setError('')
  }

  // Suggestions use the family's own names, so the first question is a real one.
  const others = members.filter((m) => m.relation?.toLowerCase() !== 'self')
  const firstOf = (i: number) => others[i]?.name.split(' ')[0]
  const suggestions = [
    firstOf(0) ? `What is ${firstOf(0)} taking right now?` : 'What medicines am I taking right now?',
    'Does anyone in the family have allergies?',
    firstOf(1) ? `Summarise ${firstOf(1)}'s latest prescription` : 'Summarise our latest prescription',
    'Which vaccinations are due soon?',
  ]

  const lastIsUser = messages[messages.length - 1]?.role === 'user'
  // A question saved before its answer failed (or the page closed) still offers a retry after reload.
  const unanswered = lastIsUser && !sending && history === 'ready'

  return (
    <div className="-mb-24 flex h-[calc(100dvh-48px-56px)] flex-col lg:mb-0 lg:h-[calc(100dvh-18px)]">
      <header className="border-b border-line px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[760px] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <DocMark size={40} />
            <div className="min-w-0">
              <h1 className="text-[20px] font-semibold leading-tight">Ask Doc</h1>
              <p className="truncate text-[14px] text-ink-3">Answers from your family&apos;s records. Not a diagnosis.</p>
            </div>
          </div>
          {messages.length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
              <Trash2 aria-hidden="true" /> <span className="hidden sm:inline">Clear conversation</span>
              <span className="sr-only sm:hidden">Clear conversation</span>
            </Button>
          )}
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 sm:px-6">
        <div className="mx-auto flex min-h-full max-w-[760px] flex-col py-6">
          {history === 'loading' && (
            <div className="space-y-4" aria-busy="true" aria-label="Loading the conversation">
              <Skeleton className="ml-auto h-10 w-2/5 rounded-2xl" />
              <Skeleton className="h-24 w-3/4 rounded-2xl" />
            </div>
          )}

          {history === 'error' && (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-5 py-4">
              <p className="flex-1">Couldn&apos;t load your conversation.</p>
              <Button size="sm" variant="outline" onClick={loadHistory}>
                Try again
              </Button>
            </div>
          )}

          {history === 'ready' && messages.length === 0 && (
            <div className="my-auto py-8">
              <p className="font-heading text-[28px] leading-tight tracking-[-0.03em] sm:text-[32px]">What would you like to know?</p>
              <p className="mt-2 max-w-[52ch] text-[16px] text-ink-2">
                Doc reads your family&apos;s prescriptions, allergies and vaccinations before it answers. For anything serious it will tell you to see a doctor.
              </p>
              <ul className="mt-8 grid gap-2 sm:grid-cols-2">
                {suggestions.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => send(s)}
                      className="h-full w-full rounded-xl border border-line bg-surface px-4 py-3.5 text-left text-[15px] transition-[box-shadow,border-color] duration-150 hover:border-line-strong hover:shadow-[var(--shadow-lift)]"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.length > 0 && (
            <ol role="log" aria-live="polite" aria-label="Conversation with Doc" className="space-y-5">
              {messages.map((m, i) => (
                <motion.li
                  key={i}
                  initial={i >= messages.length - 2 ? { opacity: 0, y: 8 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, ease }}
                  className={cn('flex gap-3', m.role === 'user' && 'justify-end')}
                >
                  {m.role === 'assistant' && <DocMark />}
                  <div
                    className={cn(
                      'max-w-[85%] text-[15px] leading-relaxed sm:max-w-[78%]',
                      m.role === 'user'
                        ? 'whitespace-pre-wrap rounded-2xl rounded-br-md bg-band px-4 py-2.5 text-white'
                        : 'markdown-body rounded-2xl rounded-tl-md bg-canvas px-4 py-3'
                    )}
                  >
                    <span className="sr-only">{m.role === 'user' ? 'You: ' : 'Doc: '}</span>
                    {m.role === 'user' ? m.content : <ReactMarkdown>{m.content}</ReactMarkdown>}
                  </div>
                </motion.li>
              ))}
              {sending && (
                <li className="flex gap-3">
                  <DocMark />
                  <span className="flex h-11 items-center gap-1 rounded-2xl rounded-tl-md bg-canvas px-4" aria-label="Doc is writing">
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        className="size-1.5 rounded-full bg-ink-3"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.15 }}
                      />
                    ))}
                  </span>
                </li>
              )}
            </ol>
          )}

          {(error || unanswered) && (
            <div role="alert" className="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-canvas px-4 py-3">
              <p className="flex-1 text-[15px]">{error || "This question didn't get an answer."}</p>
              {lastIsUser && (
                <Button size="sm" variant="outline" onClick={() => ask(messages)} disabled={sending}>
                  <RotateCw aria-hidden="true" /> Try again
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="px-4 pb-4 pt-2 sm:px-6 lg:pb-6"
      >
        <div className="mx-auto flex max-w-[760px] items-end gap-2 rounded-2xl border border-line-strong bg-surface p-2 transition-[border-color,box-shadow] focus-within:border-band focus-within:ring-3 focus-within:ring-band/20">
          <label htmlFor="doc-input" className="sr-only">
            Ask Doc a question
          </label>
          <textarea
            id="doc-input"
            maxLength={LIMITS.question}
            name="question"
            autoComplete="off"
            ref={box}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Ask about a medicine, a dose or someone's records…"
            className="max-h-[168px] min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] leading-6 outline-none placeholder:text-ink-3"
          />
          <Button type="submit" size="icon" aria-label="Send" disabled={sending || !userId}>
            {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowUp aria-hidden="true" />}
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-[760px] px-1 text-[13px] text-ink-3">Enter to send, Shift + Enter for a new line.</p>
      </form>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear this conversation?</AlertDialogTitle>
            <AlertDialogDescription>Doc forgets these messages. Your family&apos;s records stay as they are.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clear}>
              Clear conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
