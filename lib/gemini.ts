import {
  GenerativeModel,
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  ModelParams,
} from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// Pinned rather than gemini-flash-latest: the alias moves to each new release,
// which on this key has hit quota limits and capacity errors for hours at a time.
const PRIMARY_MODEL = 'gemini-3.5-flash'
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'

// When Gemini is overloaded a request can hang for minutes. Better to give up
// and let the user try again than leave them looking at a spinner.
const TIMEOUT_MS = 25_000

function isBusy(err: unknown) {
  return err instanceof GoogleGenerativeAIFetchError && (err.status === 503 || err.status === 429)
}

// Runs the request on the primary model, and once more on the fallback if the
// primary is overloaded or out of quota. Busy errors are per model, so the
// fallback usually still has room.
export async function generate<T>(
  run: (model: GenerativeModel) => Promise<T>,
  params: Omit<ModelParams, 'model'> = {}
): Promise<T> {
  try {
    return await run(genAI.getGenerativeModel({ model: PRIMARY_MODEL, ...params }, { timeout: TIMEOUT_MS }))
  } catch (err) {
    if (!isBusy(err)) throw err
    console.warn(`${PRIMARY_MODEL} unavailable, using ${FALLBACK_MODEL}`)
    return run(genAI.getGenerativeModel({ model: FALLBACK_MODEL, ...params }, { timeout: TIMEOUT_MS }))
  }
}

// Maps Gemini failures to a message that's fine to show in the UI. Raw SDK
// errors include the API URL and status text, which users shouldn't see.
export function aiError(err: unknown, fallback: string) {
  if (err instanceof GoogleGenerativeAIAbortError) {
    return { message: 'This is taking longer than usual. Please try again in a minute.', status: 504 }
  }
  if (isBusy(err)) {
    return { message: 'The AI service is busy right now. Please try again in a minute.', status: 503 }
  }
  return { message: fallback, status: 500 }
}
