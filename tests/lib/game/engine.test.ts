import { describe, it, expect } from 'vitest'
import { runGame } from '@/lib/game/engine'
import { createMockLLM, mockKey } from '@/lib/game/mock-llm'
import type { GameEvent } from '@/lib/game/types'

describe('runGame', () => {
  it('runs a happy-path game and emits game-over with a winner', async () => {
    const script = {
      describes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', statement: 'red' }])
        )
      ),
      votes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [
            mockKey(id as any, r),
            { reasoning: 'r', targetPlayerId: id === 'p1' ? 'p2' : 'p1' },
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
      () => 0.5, // deterministic rng
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
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', statement: 'x' }])
        )
      ),
      votes: Object.fromEntries(
        ['p1','p2','p3','p4','p5','p6'].flatMap(id =>
          [1,2,3,4,5,6].map(r => [mockKey(id as any, r), { reasoning: 'r', targetPlayerId: 'p1' }])
        )
      ),
    }
    const llm = createMockLLM(script)

    const events: GameEvent[] = []
    await runGame(
      { civilianWord: 'a', undercoverWord: 'b' }, e => events.push(e), llm, () => 0.5,
    )

    const roundOrders = events.filter(e => e.type === 'round-order')
    expect(roundOrders.length).toBeGreaterThanOrEqual(1)
  })
})
