// lib/game/llm.ts
import type { ModelSlug } from './types'
import type { DescribeOutput, VoteOutput } from './schemas'

export interface DescribeRequest {
  modelSlug: ModelSlug
  system: string
  prompt: string
  onToken: (delta: string) => void   // called with incremental statement text
  signal?: AbortSignal
}

export interface VoteRequest {
  modelSlug: ModelSlug
  system: string
  prompt: string
  signal?: AbortSignal
}

export interface LLM {
  describe(req: DescribeRequest): Promise<DescribeOutput>
  vote(req: VoteRequest): Promise<VoteOutput>
}
