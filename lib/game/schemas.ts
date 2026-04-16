import { z } from 'zod'
import { ALL_PLAYER_IDS } from './types'

export const DescribeSchema = z.object({
  reasoning: z.string().min(1).max(2000),
  statement: z.string().min(1).max(500),
})

export const VoteSchema = z.object({
  reasoning: z.string().min(1).max(2000),
  targetPlayerId: z.enum(ALL_PLAYER_IDS as unknown as [string, ...string[]]),
})

export type DescribeOutput = z.infer<typeof DescribeSchema>
export type VoteOutput = z.infer<typeof VoteSchema>
