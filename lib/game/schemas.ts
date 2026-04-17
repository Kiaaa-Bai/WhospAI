import { z } from 'zod'
import { ALL_PLAYER_IDS } from './types'

// `reasoning`   — full internal chain-of-thought. Helps the AI think.
//                 Not shown to the observer.
// `summary`     — 1-sentence observer-facing summary (shown in UI).
// `statement`   — short public phrase (3–8 words).
export const DescribeSchema = z.object({
  reasoning: z.string().min(1).max(4000),
  summary: z.string().min(1).max(300),
  statement: z.string().min(1).max(200),
})

export const VoteSchema = z.object({
  reasoning: z.string().min(1).max(4000),
  summary: z.string().min(1).max(300),
  targetPlayerId: z.enum(ALL_PLAYER_IDS as unknown as [string, ...string[]]),
})

export type DescribeOutput = z.infer<typeof DescribeSchema>
export type VoteOutput = z.infer<typeof VoteSchema>
