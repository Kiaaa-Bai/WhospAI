/**
 * Per-IP rate limiting backed by Upstash Redis (Vercel Marketplace).
 *
 * Two budgets are tracked:
 *   • `play` — daily limit on full games (a `/api/play` request kicks off
 *     ~60+ LLM calls, so this is the expensive one)
 *   • `gen`  — hourly limit on word-pair generations (cheap but can rack up)
 *
 * Counters use TTL-scoped keys so we don't need a background job to
 * expire them. On each hit we INCR then set EXPIREAT to the end of the
 * current window; the key vanishes on its own when the window rolls over.
 *
 * When Upstash env vars are not configured (local dev), rate limiting is
 * disabled — every call returns `{ ok: true, remaining: limit }`.
 */
import { Redis } from '@upstash/redis'

export type Bucket = 'play' | 'gen'

export interface RateLimitResult {
  ok: boolean
  /** Requests left in the current window. 0 if just exhausted. */
  remaining: number
  /** Configured ceiling for this bucket. */
  limit: number
  /** Unix seconds when this bucket resets for this IP. */
  resetAt: number
  /** Whether limiting is active (false when Upstash env is missing). */
  enforced: boolean
}

/** Daily play budget per IP. Reset at UTC midnight. */
export const PLAY_LIMIT_PER_DAY = 10
/** Hourly generate-words budget per IP. Reset on the hour. */
export const GEN_LIMIT_PER_HOUR = 10

let cachedClient: Redis | null = null
let cachedClientConfigured = false

function getRedis(): Redis | null {
  if (cachedClientConfigured) return cachedClient
  cachedClientConfigured = true
  // Vercel's Upstash Marketplace integration provisions envs under the
  // `KV_REST_API_*` prefix; direct Upstash installs use `UPSTASH_REDIS_REST_*`.
  // Accept either so the limiter works regardless of how the DB was hooked up.
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) {
    console.warn('[rate-limit] KV/Upstash env not set — rate limiting disabled')
    return null
  }
  cachedClient = new Redis({ url, token })
  return cachedClient
}

/**
 * Extract the caller's IP address from a Next.js Request. Vercel sets
 * `x-forwarded-for`; the left-most entry is the client. Fallback to the
 * real IP header, then to a sentinel so local dev / unknown networks
 * still all share one bucket (safer than silently opening the gates).
 */
export function ipFromRequest(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xreal = req.headers.get('x-real-ip')
  if (xreal) return xreal.trim()
  return 'unknown'
}

function dayBucket(): { key: string; resetAt: number } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const next = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) / 1000
  return { key: `${y}${m}${d}`, resetAt: next }
}

function hourBucket(): { key: string; resetAt: number } {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, '0')
  const d = String(now.getUTCDate()).padStart(2, '0')
  const h = String(now.getUTCHours()).padStart(2, '0')
  const next = Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours() + 1,
  ) / 1000
  return { key: `${y}${m}${d}${h}`, resetAt: next }
}

function bucketInfo(bucket: Bucket): { limit: number; key: string; resetAt: number } {
  if (bucket === 'play') {
    const { key, resetAt } = dayBucket()
    return { limit: PLAY_LIMIT_PER_DAY, key: `rl:play:${key}`, resetAt }
  }
  const { key, resetAt } = hourBucket()
  return { limit: GEN_LIMIT_PER_HOUR, key: `rl:gen:${key}`, resetAt }
}

/**
 * Increment the counter for this IP in the given bucket and return the
 * result. Safe to call on every request; the window rolls over
 * automatically via EXPIREAT.
 */
export async function hitRateLimit(ip: string, bucket: Bucket): Promise<RateLimitResult> {
  const redis = getRedis()
  const { limit, key, resetAt } = bucketInfo(bucket)
  const fullKey = `${key}:${ip}`

  if (!redis) {
    return { ok: true, remaining: limit, limit, resetAt, enforced: false }
  }

  let count: number
  try {
    count = await redis.incr(fullKey)
    if (count === 1) {
      await redis.expireat(fullKey, resetAt)
    }
  } catch (err) {
    // Fail open — we'd rather serve the user than black-hole traffic if
    // Upstash is briefly unavailable.
    console.error('[rate-limit] redis error, failing open', { bucket, err: String(err) })
    return { ok: true, remaining: limit, limit, resetAt, enforced: false }
  }

  const remaining = Math.max(0, limit - count)
  return { ok: count <= limit, remaining, limit, resetAt, enforced: true }
}

/**
 * Read the current counter without incrementing — for quota pre-checks
 * on the setup screen so we can show "X / Y remaining today" and disable
 * the start button at the ceiling.
 */
export async function peekRateLimit(ip: string, bucket: Bucket): Promise<RateLimitResult> {
  const redis = getRedis()
  const { limit, key, resetAt } = bucketInfo(bucket)
  const fullKey = `${key}:${ip}`

  if (!redis) {
    return { ok: true, remaining: limit, limit, resetAt, enforced: false }
  }

  let count = 0
  try {
    const raw = await redis.get<number | string>(fullKey)
    if (raw != null) count = typeof raw === 'number' ? raw : parseInt(raw, 10) || 0
  } catch (err) {
    console.error('[rate-limit] peek redis error, failing open', { bucket, err: String(err) })
    return { ok: true, remaining: limit, limit, resetAt, enforced: false }
  }

  const remaining = Math.max(0, limit - count)
  return { ok: count < limit, remaining, limit, resetAt, enforced: true }
}
