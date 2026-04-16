// lib/game/engine.ts
import type { Emit, GameConfig, GameResult, Statement, Vote } from './types'
import type { LLM } from './llm'
import { assignRoles } from './assign-roles'
import { shuffle } from './shuffle'
import { resolveVotes, checkWinCondition } from './scoring'
import { runDescribe, runVote, runTiebreak } from './phases'

export const MAX_ROUNDS = 6
const DEFAULT_INTER_CALL_DELAY_MS = 1000

function delay(ms: number) {
  if (ms <= 0) return
  return new Promise(resolve => setTimeout(resolve, ms))
}

export interface RunGameOptions {
  rng?: () => number
  interCallDelayMs?: number
}

export async function runGame(
  config: GameConfig,
  emit: Emit,
  llm: LLM,
  optsOrRng?: RunGameOptions | (() => number),
): Promise<GameResult> {
  const opts: RunGameOptions = typeof optsOrRng === 'function'
    ? { rng: optsOrRng }
    : optsOrRng ?? {}
  const rng = opts.rng ?? Math.random
  const interCallDelayMs = opts.interCallDelayMs ?? DEFAULT_INTER_CALL_DELAY_MS
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
    for (let i = 0; i < orderedAlive.length; i++) {
      if (i > 0) await delay(interCallDelayMs)
      const stmt = await runDescribe(orderedAlive[i], { players, statements, round }, emit, llm)
      if (stmt) statements.push(stmt)
    }

    emit({ type: 'phase', phase: 'vote' })
    const votes: Vote[] = []
    for (let i = 0; i < alive.length; i++) {
      if (i > 0) await delay(interCallDelayMs)
      const vote = await runVote(alive[i], { players, statements, round }, emit, llm)
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
