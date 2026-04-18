// lib/game/roster.ts
import type { ModelSlug } from './types'

export interface RosterEntry {
  modelSlug: ModelSlug
  displayName: string
}

/**
 * Fixed roster of 6 AI players. Order here is not the player slot order —
 * slots p1..p6 are assigned by shuffling this roster at game start.
 */
export const ROSTER: readonly RosterEntry[] = [
  { modelSlug: 'openai/gpt-5.4-mini',        displayName: 'GPT-5.4 mini' },
  { modelSlug: 'anthropic/claude-haiku-4.5', displayName: 'Claude Haiku 4.5' },
  { modelSlug: 'google/gemini-2.5-flash-lite', displayName: 'Gemini 2.5 Flash Lite' },
  { modelSlug: 'deepseek/deepseek-v3',       displayName: 'DeepSeek V3' },
  { modelSlug: 'xai/grok-4.1-fast-non-reasoning', displayName: 'Grok 4.1' },
  { modelSlug: 'alibaba/qwen3-max',          displayName: 'Qwen 3 Max' },
] as const

if (ROSTER.length !== 6) {
  throw new Error(`Roster must have exactly 6 entries, got ${ROSTER.length}`)
}
