import {
  GoogleGenerativeAI,
  GoogleGenerativeAIAbortError,
  GoogleGenerativeAIFetchError,
  ModelParams,
} from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// When Gemini is overloaded a request can hang for minutes. Better to give up
// and let the user try again than leave them looking at a spinner.
const TIMEOUT_MS = 25_000

export function getModel(params: Omit<ModelParams, 'model'> = {}) {
  return genAI.getGenerativeModel({ model: 'gemini-flash-latest', ...params }, { timeout: TIMEOUT_MS })
}

function isBusy(err: unknown) {
  return err instanceof GoogleGenerativeAIFetchError && (err.status === 503 || err.status === 429)
}

// 503s and 429s are usually short spikes, so one retry often gets through.
export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (!isBusy(err)) throw err
    await new Promise((resolve) => setTimeout(resolve, 2000))
    return fn()
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
