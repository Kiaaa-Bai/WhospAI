// tests/hooks/useGameReducer.test.ts
import { describe, it, expect } from 'vitest'
import { reduceGameEvent, initialGameState } from '@/hooks/useGameReducer'
import type { GameEvent, Player } from '@/lib/game/types'

const mkPlayer = (id: string, role: Player['role'] = 'civilian'): Player => ({
  id: id as Player['id'],
  displayName: id,
  modelSlug: 'openai/gpt-5.4-mini',
  role,
  word: 'w',
  eliminated: false,
})

describe('reduceGameEvent', () => {
  it('game-start sets players', () => {
    const players = [mkPlayer('p1'), mkPlayer('p2', 'undercover')]
    const state = reduceGameEvent(initialGameState, { type: 'game-start', players })
    expect(state.players).toEqual(players)
    expect(state.phase).toBe('describe')
  })

  it('round-start increments round and clears speech', () => {
    const s1 = reduceGameEvent(initialGameState, {
      type: 'game-start',
      players: [mkPlayer('p1')],
    })
    const s2 = reduceGameEvent(s1, { type: 'round-start', round: 1 })
    expect(s2.round).toBe(1)
    expect(s2.currentStatements).toEqual([])
  })

  it('speak-token accumulates into currentSpeech', () => {
    const s1 = reduceGameEvent(initialGameState, { type: 'game-start', players: [mkPlayer('p1')] })
    const s2 = reduceGameEvent(s1, { type: 'speak-start', playerId: 'p1' })
    const s3 = reduceGameEvent(s2, { type: 'speak-token', playerId: 'p1', delta: 'He' })
    const s4 = reduceGameEvent(s3, { type: 'speak-token', playerId: 'p1', delta: 'llo' })
    expect(s4.currentSpeech['p1']).toBe('Hello')
  })

  it('elimination marks player as eliminated', () => {
    const players = [mkPlayer('p1'), mkPlayer('p2', 'undercover')]
    const s1 = reduceGameEvent(initialGameState, { type: 'game-start', players })
    const s2 = reduceGameEvent(s1, { type: 'round-start', round: 1 })
    const s3 = reduceGameEvent(s2, { type: 'elimination', playerId: 'p2', tally: { p2: 3 } })
    expect(s3.players.find(p => p.id === 'p2')!.eliminated).toBe(true)
  })

  it('game-over sets result', () => {
    const s = reduceGameEvent(initialGameState, {
      type: 'game-over',
      result: { winner: 'civilians', rounds: 3, players: [] },
    })
    expect(s.result?.winner).toBe('civilians')
  })
})
