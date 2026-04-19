import { z } from 'zod'
import { createSSEStream } from '@/lib/sse'
import { runGame } from '@/lib/game/engine'
import { createRealLLM } from '@/lib/game/llm'
import { hitRateLimit, ipFromRequest } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const maxDuration = 300

const WordSchema = z.string().trim().min(1).max(30)
const ConfigSchema = z.object({
  civilianWord: WordSchema,
  undercoverWord: WordSchema,
}).refine(d => d.civilianWord !== d.undercoverWord, {
  message: 'Words must differ',
})

export async function POST(req: Request) {
  // Rate limit BEFORE parsing / launching the game — a full /api/play run
  // fires ~60+ LLM calls, so we want the 429 to land before any compute.
  const ip = ipFromRequest(req)
  const limit = await hitRateLimit(ip, 'play')
  if (!limit.ok) {
    return new Response(
      JSON.stringify({
        error: 'Daily game limit reached. Resets at UTC midnight.',
        code: 'rate_limited',
        remaining: 0,
        limit: limit.limit,
        resetAt: limit.resetAt,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'X-RateLimit-Limit': String(limit.limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(limit.resetAt),
        },
      },
    )
  }

  let config
  try {
    config = ConfigSchema.parse(await req.json())
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const llm = createRealLLM()
  return createSSEStream(emit => runGame(config, emit, llm))
}
