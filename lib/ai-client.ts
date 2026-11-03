import { authHeaders } from '@/lib/supabase'
import { isDemo } from '@/lib/demo/mode'
import { demoAnswer } from '@/lib/demo/ai'

// Every AI call from the browser goes through askAi, so they all share one
// timeout and one set of plain-language errors. Nothing here shows the user
// raw fetch or JSON errors.
export const AI_TIMEOUT_MS = 30_000

export const AI_MESSAGES = {
  offline: "You're offline. Check your connection and try again.",
  timeout: 'This is taking too long. Try again in a minute.',
  broken: 'Something went wrong on our side. Try again in a minute.',
}

export class AiError extends Error {}

export async function askAi<T>(path: string, body: object): Promise<T> {
  // The demo answers from its sample data and never calls the API.
  if (isDemo()) {
    const data = (await demoAnswer(path, body as Record<string, unknown>)) as { error?: string }
    if (data.error) throw new AiError(data.error)
    return data as T
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new AiError(AI_MESSAGES.offline)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(`/api/${path}`, { method: 'POST', headers: await authHeaders(), body: JSON.stringify(body), signal: controller.signal })
  } catch {
    throw new AiError(controller.signal.aborted ? AI_MESSAGES.timeout : navigator.onLine ? AI_MESSAGES.broken : AI_MESSAGES.offline)
  } finally {
    clearTimeout(timer)
  }

  // Our routes always answer with JSON; anything else is a crash or a proxy page.
  const data = await res.json().catch(() => null)
  if (!data) throw new AiError(AI_MESSAGES.broken)
  if (!res.ok || data.error) throw new AiError(typeof data.error === 'string' ? data.error : AI_MESSAGES.broken)
  return data as T
}

// For catch blocks: the message to show for any error from askAi.
export function aiMessage(err: unknown) {
  return err instanceof AiError ? err.message : AI_MESSAGES.broken
}
