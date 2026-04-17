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
  onReasoningToken?: (delta: string) => void   // called with incremental summary (observer-facing)
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

      let lastSummary = ''
      let lastStatement = ''
      let finalPartial: unknown = null
      for await (const partial of result.partialOutputStream) {
        finalPartial = partial
        // Stream summary tokens (observer-facing short version)
        const summary = (partial as { summary?: unknown })?.summary
        if (typeof summary === 'string' && summary.length > lastSummary.length) {
          req.onReasoningToken?.(summary.slice(lastSummary.length))
          lastSummary = summary
        }
        // Stream statement tokens
        const statement = (partial as { statement?: unknown })?.statement
        if (typeof statement === 'string' && statement.length > lastStatement.length) {
          req.onToken(statement.slice(lastStatement.length))
          lastStatement = statement
        }
      }

      // partialOutputStream yields unvalidated partials — validate the final one.
      try {
        return DescribeSchema.parse(finalPartial)
      } catch (err) {
        console.error(`[describe] schema parse failed for ${req.modelSlug}:`, {
          err: String(err),
          finalPartial,
        })
        throw err
      }
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
