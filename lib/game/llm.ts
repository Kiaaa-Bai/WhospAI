// lib/game/llm.ts
import { streamText, generateText, Output } from 'ai'
import type { ModelSlug } from './types'
import { DescribeSchema, VoteSchema } from './schemas'
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

// Real implementation appended to lib/game/llm.ts
export function createRealLLM(): LLM {
  return {
    async describe(req): Promise<DescribeOutput> {
      const result = streamText({
        model: req.modelSlug,
        system: req.system,
        prompt: req.prompt,
        temperature: 0.8,
        abortSignal: req.signal,
        output: Output.object({ schema: DescribeSchema }),
      })

      let last = ''
      let finalPartial: unknown = null
      for await (const partial of result.partialOutputStream) {
        finalPartial = partial
        const statement = (partial as { statement?: unknown })?.statement
        const current = typeof statement === 'string' ? statement : ''
        if (current.length > last.length) {
          req.onToken(current.slice(last.length))
          last = current
        }
      }

      // partialOutputStream yields unvalidated partials — validate the final one.
      return DescribeSchema.parse(finalPartial)
    },

    async vote(req): Promise<VoteOutput> {
      const { output } = await generateText({
        model: req.modelSlug,
        system: req.system,
        prompt: req.prompt,
        temperature: 0.8,
        abortSignal: req.signal,
        output: Output.object({ schema: VoteSchema }),
      })
      return output
    },
  }
}
