// lib/game/engine.ts
import type { Emit, GameConfig, GameResult, Statement, Vote } from './types'
import type { LLM } from './llm'
import { assignRoles } from './assign-roles'
import { shuffle } from './shuffle'
import { resolveVotes, checkWinCondition } from './scoring'
import { runDescribe, runVote, runTiebreak } from './phases'

export const MAX_ROUNDS = 6

export async function runGame(
  config: GameConfig,
  emit: Emit,
  llm: LLM,
  rng: () => number = Math.random,
): Promise<GameResult> {
  const players = assignRoles(config, rng)
  emit({ type: 'game-start', players })

  let round = 0
  while (round < MAX_ROUNDS) {
    round++

    const win = checkWinCondition(players)
    if (win) break

    emit({ type: 'round-start', round })

    const alive = players.filter(p => !p.eliminated)
    const orderedAlive = shuffle(alive, rng)
    emit({ type: 'round-order', round, order: orderedAlive.map(p => p.id) })

    emit({ type: 'phase', phase: 'describe' })
    const statements: Statement[] = []
    for (const p of orderedAlive) {
      const stmt = await runDescribe(p, { players, statements, round }, emit, llm)
      if (stmt) statements.push(stmt)
    }

    emit({ type: 'phase', phase: 'vote' })
    const votes: Vote[] = []
    for (const p of alive) {
      const vote = await runVote(p, { players, statements, round }, emit, llm)
      if (vote) votes.push(vote)
    }

    const resolution = resolveVotes(votes, alive)
    if (resolution.kind === 'elimination') {
      const eliminated = players.find(p => p.id === resolution.targetId)!
      eliminated.eliminated = true
      eliminated.eliminatedRound = round
      emit({ type: 'elimination', playerId: eliminated.id, tally: resolution.tally })
    } else {
      emit({ type: 'tie', tiedPlayers: resolution.tiedIds })
      const tiebreak = await runTiebreak(resolution.tiedIds, players, round, emit, llm)
      if (tiebreak.kind === 'elimination') {
        const eliminated = players.find(p => p.id === tiebreak.targetId)!
        eliminated.eliminated = true
        eliminated.eliminatedRound = round
      }
    }
  }

  const winner = checkWinCondition(players) ?? 'undercover' // round cap hit = undercover survived

  const result: GameResult = {
    winner,
    rounds: round,
    players: players.map(p => ({
      modelSlug: p.modelSlug,
      role: p.role,
      eliminated: p.eliminated,
      eliminatedRound: p.eliminatedRound,
    })),
  }

  emit({ type: 'game-over', result })
  return result
}
