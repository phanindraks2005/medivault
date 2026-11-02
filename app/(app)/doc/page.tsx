'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ReactMarkdown from 'react-markdown'

type Message = { role: 'user' | 'assistant'; content: string }

const suggestedPrompts = [
  "What medicines is my family currently on?",
  "Quick remedy for a headache?",
  "Any allergies I should know about?",
  "Summarize our latest prescription",
]

export default function DocPage() {
  const [userId, setUserId] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data } = await supabase
        .from('chat_history')
        .select('role, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setMessages(data.map((d) => ({ role: d.role as 'user' | 'assistant', content: d.content })))
      }
      setHistoryLoaded(true)
    }
    load()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const saveMessage = async (role: 'user' | 'assistant', content: string) => {
    await supabase.from('chat_history').insert({ user_id: userId, role, content })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || !userId) return
    const newMessages: Message[] = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)
    setError('')
    saveMessage('user', text)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/doc-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ messages: newMessages }),
      })
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
        saveMessage('assistant', data.reply)
      }
    } catch {
      setError('Something went wrong, try again')
    }
    setLoading(false)
  }

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleClearChat = async () => {
    const confirmed = window.confirm('Clear this conversation? This can\'t be undone.')
    if (!confirmed) return
    await supabase.from('chat_history').delete().eq('user_id', userId)
    setMessages([])
  }

  return (
    <div className="h-[calc(100dvh-3.5rem-5rem)] lg:h-dvh flex flex-col bg-background">
      <div className="flex-shrink-0">
      </div>

      <div className="flex-1 min-h-0 flex flex-col max-w-3xl mx-auto w-full">
        {!historyLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-text-secondary">Loading…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center px-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-sage flex items-center justify-center mb-5 shadow-[0_0_40px_-8px_var(--color-sage)]">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#0F1115" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
</svg>
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Hey, I'm Doc</h1>
            <p className="text-sm text-text-secondary max-w-sm mb-8">
              I know your family's records, prescriptions, and medicines. Ask me anything — from quick remedies to what your dad's currently taking.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
              {suggestedPrompts.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-left text-sm px-4 py-3 rounded-2xl border border-border bg-card text-foreground hover:border-sage transition"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto px-5 py-6 flex flex-col gap-4">
            <div className="flex justify-end">
              <button onClick={handleClearChat} className="text-xs text-text-secondary hover:text-red-300 transition">
                <i className="ti ti-trash" style={{ marginRight: 4 }}></i>Clear conversation
              </button>
            </div>
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F1115" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
</svg>
                  </div>
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-sage text-[#0F1115] rounded-tr-sm whitespace-pre-wrap'
                      : 'bg-card border border-border text-foreground rounded-tl-sm markdown-body'
                  }`}
                >
                  {m.role === 'user' ? (
                    m.content
                  ) : (
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-sage flex items-center justify-center flex-shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F1115" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>
</svg>
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-text-secondary animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            {error && <div className="text-sm text-red-300 px-2">{error}</div>}
            <div ref={bottomRef} />
          </div>
        )}

        <form onSubmit={handleSend} className="flex-shrink-0 px-5 py-4">
          <div className="flex gap-2 bg-card border border-border rounded-2xl p-2 shadow-lg">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Doc anything…"
              className="flex-1 px-3 py-2 bg-transparent text-sm text-foreground focus:outline-none placeholder:text-text-muted"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="w-10 h-10 rounded-xl bg-sage flex items-center justify-center hover:opacity-90 transition disabled:opacity-40 flex-shrink-0"
            >
              <i className="ti ti-arrow-up" style={{ fontSize: 18, color: '#0F1115' }}></i>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}