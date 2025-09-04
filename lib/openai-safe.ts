import 'server-only'
import OpenAI from 'openai'

/**
 * Safe OpenAI client with timeout and retry capabilities
 * - Auto-retries on 429/5xx errors (up to 3 times)
 * - Configurable timeout to prevent hanging
 * - Graceful degradation on network issues
 */
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
  maxRetries: 3, // 429/5xx に対して自動再試行
})

export async function chatWithTimeout(messages: any[], {
  model = process.env.OPENAI_MODEL || 'gpt-4o-mini',
  temperature = 0.5,
  max_tokens = 2000,
  top_p = 0.9,
  presence_penalty = 0.1,
  frequency_penalty = 0.1,
  timeoutMs = 30_000,
}: { 
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  presence_penalty?: number
  frequency_penalty?: number
  timeoutMs?: number 
} = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  
  try {
    const res = await client.chat.completions.create({
      model,
      temperature,
      max_tokens,
      top_p,
      presence_penalty,
      frequency_penalty,
      messages
    }, { signal: ctrl.signal as any })
    
    return res.choices[0]?.message?.content ?? ''
  } finally {
    clearTimeout(t)
  }
}