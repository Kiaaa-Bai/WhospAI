// app/api/quota/route.ts
import { ipFromRequest, peekRateLimit } from '@/lib/rate-limit'

export const runtime = 'nodejs'

/**
 * Non-mutating quota check used by the setup screen to show remaining
 * games/generations before the user actually starts a run. Mirrors
 * exactly the limits that `/api/play` and `/api/generate-words` enforce.
 */
export async function GET(req: Request) {
  const ip = ipFromRequest(req)
  const [play, gen] = await Promise.all([
    peekRateLimit(ip, 'play'),
    peekRateLimit(ip, 'gen'),
  ])

  return new Response(
    JSON.stringify({
      play: {
        remaining: play.remaining,
        limit: play.limit,
        resetAt: play.resetAt,
      },
      gen: {
        remaining: gen.remaining,
        limit: gen.limit,
        resetAt: gen.resetAt,
      },
      enforced: play.enforced || gen.enforced,
    }),
    { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } },
  )
}
