// lib/game/mock-llm.ts
import type { LLM, DescribeRequest, VoteRequest } from './llm'
import type { DescribeOutput, VoteOutput } from './schemas'
import type { PlayerId } from './types'

export interface MockScript {
  /** map playerId + round -> describe output */
  describes: Record<string, DescribeOutput>
  /** map playerId + round -> vote output */
  votes: Record<string, VoteOutput>
}

export function mockKey(playerId: PlayerId, round: number): string {
  return `${playerId}:r${round}`
}

export function createMockLLM(script: MockScript, opts: { tokenDelay?: number } = {}): LLM {
  const extractKey = (system: string, prompt: string): string => {
    const playerMatch = system.match(/You are Player (p\d)/)
    const roundMatch = prompt.match(/ROUND (\d+)/)
    if (!playerMatch || !roundMatch) {
      throw new Error(`Mock LLM could not extract player/round from prompts`)
    }
    return mockKey(playerMatch[1] as PlayerId, parseInt(roundMatch[1], 10))
  }

  return {
    async describe(req: DescribeRequest): Promise<DescribeOutput> {
      const key = extractKey(req.system, req.prompt)
      const output = script.describes[key]
      if (!output) throw new Error(`No mock describe output for ${key}`)

      const delay = opts.tokenDelay ?? 0
      // Simulate streaming reasoning
      for (const ch of output.reasoning) {
        req.onReasoningToken?.(ch)
        if (delay > 0) await new Promise(r => setTimeout(r, delay))
      }
      // Simulate streaming statement
      for (const ch of output.statement) {
        req.onToken(ch)
        if (delay > 0) await new Promise(r => setTimeout(r, delay))
      }
      return output
    },

    async vote(req: VoteRequest): Promise<VoteOutput> {
      const key = extractKey(req.system, req.prompt)
      const output = script.votes[key]
      if (!output) throw new Error(`No mock vote output for ${key}`)
      return output
    },
  }
}
