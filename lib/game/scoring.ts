import type { Player, PlayerId, Vote } from './types'

export type VoteResolution =
  | { kind: 'elimination'; targetId: PlayerId; tally: Record<string, number> }
  | { kind: 'tie'; tiedIds: PlayerId[]; tally: Record<string, number> }

export function resolveVotes(votes: Vote[], alivePlayers: Player[]): VoteResolution {
  const tally: Record<string, number> = {}
  for (const p of alivePlayers) tally[p.id] = 0
  for (const v of votes) {
    if (v.targetId) tally[v.targetId] = (tally[v.targetId] ?? 0) + 1
  }

  const counts = Object.values(tally)
  const max = counts.length ? Math.max(...counts) : 0

  if (max === 0) return { kind: 'tie', tiedIds: [], tally }

  const tied = Object.entries(tally)
    .filter(([, n]) => n === max)
    .map(([id]) => id as PlayerId)

  if (tied.length === 1) {
    return { kind: 'elimination', targetId: tied[0], tally }
  }
  return { kind: 'tie', tiedIds: tied, tally }
}

/**
 * Returns 'civilians' if civilians have won, 'undercover' if the undercover has won,
 * or null if the game should continue.
 */
export function checkWinCondition(players: Player[]): 'civilians' | 'undercover' | null {
  const undercover = players.find(p => p.role === 'undercover')
  if (!undercover) return null // should never happen given assignRoles
  if (undercover.eliminated) return 'civilians'

  const alive = players.filter(p => !p.eliminated)
  if (alive.length <= 2) return 'undercover'

  return null
}
