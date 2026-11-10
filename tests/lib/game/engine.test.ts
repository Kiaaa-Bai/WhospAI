import { describe, it, expect } from 'vitest'
import { runGame } from '@/lib/game/engine'
import { createMockLLM, mockKey } from '@/lib/game/mock-llm'
import type { GameEvent } from '@/lib/game/types'

describe('runGame', () => {
  it('runs a happy-path game and emits game-over with a winner', async () => {
    const script = {
      describes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', summary: 's', statement: 'red' }])
        )
      ),
      votes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [
            mockKey(id as any, r),
            { reasoning: 'r', summary: 's', targetPlayerId: id === 'p1' ? 'p2' : 'p1' },
          ])
        )
      ),
    }
    const llm = createMockLLM(script)

    const events: GameEvent[] = []
    const emit = (e: GameEvent) => events.push(e)

    const result = await runGame(
      { civilianWord: 'apple', undercoverWord: 'pear' },
      emit,
      llm,
      { rng: () => 0.5, interCallDelayMs: 0 },
    )

    expect(result.winner).toMatch(/civilians|undercover/)
    const gameOver = events.at(-1)
    expect(gameOver!.type).toBe('game-over')
    expect(events.some(e => e.type === 'game-start')).toBe(true)
    expect(events.some(e => e.type === 'elimination')).toBe(true)
  })

  it('emits round-order for each round', async () => {
    const script = {
      describes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', summary: 's', statement: 'x' }])
        )
      ),
      votes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', summary: 's', targetPlayerId: 'p1' }])
        )
      ),
    }
    const llm = createMockLLM(script)

    const events: GameEvent[] = []
    await runGame(
      { civilianWord: 'a', undercoverWord: 'b' }, e => events.push(e), llm,
      { rng: () => 0.5, interCallDelayMs: 0 },
    )

    const roundOrders = events.filter(e => e.type === 'round-order')
    expect(roundOrders.length).toBeGreaterThanOrEqual(1)
  })

  it('reports the number of rounds actually played', async () => {
    // rng 0.5 → undercover is p4 (Math.floor(0.5 * 6) === 3). Everyone votes
    // p4 out in round 1, so the game must report exactly 1 round.
    const ids = ['p1','p2','p3','p4','p5','p6']
    const script = {
      describes: Object.fromEntries(
        ids.map(id => [mockKey(id as any, 1), { reasoning: 'r', summary: 's', statement: 'x' }]),
      ),
      votes: Object.fromEntries(
        ids.map(id => [
          mockKey(id as any, 1),
          { reasoning: 'r', summary: 's', targetPlayerId: id === 'p4' ? 'p1' : 'p4' },
        ]),
      ),
    }
    const events: GameEvent[] = []
    const result = await runGame(
      { civilianWord: 'a', undercoverWord: 'b' }, e => events.push(e), createMockLLM(script),
      { rng: () => 0.5 },
    )

    expect(result.winner).toBe('civilians')
    expect(result.rounds).toBe(1)
    expect(events.filter(e => e.type === 'round-start')).toHaveLength(1)
  })

  it('gives every player the same prompt language, from the setup language', async () => {
    const ids = ['p1','p2','p3','p4','p5','p6']
    const script = {
      describes: Object.fromEntries(ids.flatMap(id =>
        [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', summary: 's', statement: 'x' }]))),
      votes: Object.fromEntries(ids.flatMap(id =>
        [1,2,3,4,5,6].map(r => [mockKey(id as any, r),
          { reasoning: 'r', summary: 's', targetPlayerId: id === 'p1' ? 'p2' : 'p1' }]))),
    }
    const base = createMockLLM(script)
    const systems: string[] = []
    const llm = {
      ...base,
      describe: (args: Parameters<typeof base.describe>[0]) => { systems.push(args.system); return base.describe(args) },
      vote: (args: Parameters<typeof base.vote>[0]) => { systems.push(args.system); return base.vote(args) },
    }

    await runGame(
      { civilianWord: 'りんご', undercoverWord: '梨', language: 'ja' },
      () => {},
      llm,
      { rng: () => 0.5, interCallDelayMs: 0 },
    )

    expect(systems.length).toBeGreaterThan(0)
    for (const s of systems) {
      expect(s).toContain('The language of that word is: Japanese.')
    }
  })
})
