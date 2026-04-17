// tests/lib/game/phases.test.ts
import { describe, it, expect, vi } from 'vitest'
import { runDescribe, runVote } from '@/lib/game/phases'
import type { Emit, GameEvent, Player } from '@/lib/game/types'
import type { LLM } from '@/lib/game/llm'

const mkPlayer = (id: string): Player => ({
  id: id as Player['id'],
  displayName: id,
  modelSlug: 'openai/gpt-5.4-mini',
  role: 'civilian',
  word: 'apple',
  eliminated: false,
})

const makeLLM = (overrides: Partial<LLM> = {}): LLM => ({
  describe: vi.fn(),
  vote: vi.fn(),
  ...overrides,
})

describe('runDescribe', () => {
  it('emits speak-start, speak-token(s), speak-end on success', async () => {
    const events: GameEvent[] = []
    const emit: Emit = e => events.push(e)

    const llm = makeLLM({
      describe: vi.fn(async (req) => {
        req.onToken('Hel')
        req.onToken('lo')
        return { reasoning: 'because', summary: 'greeting', statement: 'Hello' }
      }),
    })

    const player = mkPlayer('p1')
    const ctx = { players: [player], statements: [], round: 1 }
    const result = await runDescribe(player, ctx, emit, llm)

    expect(result).not.toBeNull()
    expect(result!.text).toBe('Hello')
    expect(events[0].type).toBe('speak-start')
    expect(events.filter(e => e.type === 'speak-token').length).toBe(2)
    expect(events.at(-1)!.type).toBe('speak-end')
  })

  it('retries once on failure, then succeeds', async () => {
    const events: GameEvent[] = []
    let attempt = 0
    const llm = makeLLM({
      describe: vi.fn(async (req) => {
        attempt++
        if (attempt === 1) throw new Error('boom')
        req.onToken('ok')
        return { reasoning: 'r', summary: 's', statement: 'ok' }
      }),
    })

    const player = mkPlayer('p1')
    const ctx = { players: [player], statements: [], round: 1 }
    const result = await runDescribe(player, ctx, e => events.push(e), llm)

    expect(result).not.toBeNull()
    expect(llm.describe).toHaveBeenCalledTimes(2)
  })

  it('emits speak-error and returns null after second failure', async () => {
    const events: GameEvent[] = []
    const llm = makeLLM({
      describe: vi.fn(async () => { throw new Error('boom') }),
    })

    const player = mkPlayer('p1')
    const ctx = { players: [player], statements: [], round: 1 }
    const result = await runDescribe(player, ctx, e => events.push(e), llm)

    expect(result).toBeNull()
    expect(events.some(e => e.type === 'speak-error')).toBe(true)
    expect(llm.describe).toHaveBeenCalledTimes(2)
  })
})

describe('runVote', () => {
  it('emits vote-start and vote-cast on success', async () => {
    const events: GameEvent[] = []
    const llm = makeLLM({
      vote: vi.fn(async () => ({ reasoning: 'suspicious', summary: 'p2 looks off', targetPlayerId: 'p2' })),
    })

    const voter = mkPlayer('p1')
    const players = [voter, mkPlayer('p2'), mkPlayer('p3')]
    const vote = await runVote(voter, { players, statements: [], round: 1 }, e => events.push(e), llm)

    expect(vote).not.toBeNull()
    expect(vote!.targetId).toBe('p2')
    expect(events[0].type).toBe('vote-start')
    expect(events.at(-1)!.type).toBe('vote-cast')
  })

  it('abstains (targetId=null) when LLM returns invalid target after retry', async () => {
    const events: GameEvent[] = []
    const llm = makeLLM({
      vote: vi.fn(async () => ({ reasoning: 'r', summary: 's', targetPlayerId: 'p1' })), // self-vote
    })

    const voter = mkPlayer('p1')
    const players = [voter, mkPlayer('p2')]
    const vote = await runVote(voter, { players, statements: [], round: 1 }, e => events.push(e), llm)

    expect(vote).not.toBeNull()
    expect(vote!.targetId).toBeNull()
  })
})

import { runTiebreak } from '@/lib/game/phases'

describe('runTiebreak', () => {
  it('re-describes and revotes among tied players, eliminates winner', async () => {
    const events: GameEvent[] = []
    const llm = makeLLM({
      describe: vi.fn(async (req) => {
        req.onToken('x')
        return { reasoning: 'r', summary: 's', statement: 'x' }
      }),
      vote: vi.fn(async (req) => {
        // all vote for p2
        return { reasoning: 'r', summary: 's', targetPlayerId: 'p2' }
      }),
    })

    const players = [mkPlayer('p1'), mkPlayer('p2'), mkPlayer('p3'), mkPlayer('p4')]
    const result = await runTiebreak(['p1', 'p2'], players, 2, e => events.push(e), llm)

    expect(result.kind).toBe('elimination')
    if (result.kind === 'elimination') expect(result.targetId).toBe('p2')
  })

  it('returns no-elimination if tiebreak ties again', async () => {
    const events: GameEvent[] = []
    const llm = makeLLM({
      describe: vi.fn(async () => ({ reasoning: 'r', summary: 's', statement: 'x' })),
      vote: vi.fn(async (req) => {
        // voters alternate: p1->p2, p2->p1, p3->p1, p4->p2 (ties)
        const voterMatch = req.system.match(/Player (p\d)/)
        const voter = voterMatch![1]
        const mapping: Record<string, string> = { p1: 'p2', p2: 'p1', p3: 'p1', p4: 'p2' }
        return { reasoning: 'r', summary: 's', targetPlayerId: mapping[voter] }
      }),
    })

    const players = [mkPlayer('p1'), mkPlayer('p2'), mkPlayer('p3'), mkPlayer('p4')]
    const result = await runTiebreak(['p1', 'p2'], players, 2, e => events.push(e), llm)

    expect(result.kind).toBe('no-elimination')
  })
})
