// lib/game/assign-roles.ts
import type { GameConfig, Player, PlayerId } from './types'
import { ALL_PLAYER_IDS } from './types'
import { ROSTER } from './roster'
import { shuffle } from './shuffle'

/**
 * Assigns roles and words to 6 players. Randomly shuffles the roster into
 * slots p1..p6 and picks one slot as the undercover.
 */
export function assignRoles(
  config: GameConfig,
  rng: () => number = Math.random,
): Player[] {
  const shuffledRoster = shuffle(ROSTER, rng)
  const undercoverIndex = Math.floor(rng() * 6)

  return ALL_PLAYER_IDS.map((id, idx): Player => {
    const isUndercover = idx === undercoverIndex
    return {
      id: id as PlayerId,
      displayName: shuffledRoster[idx].displayName,
      modelSlug: shuffledRoster[idx].modelSlug,
      role: isUndercover ? 'undercover' : 'civilian',
      word: isUndercover ? config.undercoverWord : config.civilianWord,
      eliminated: false,
    }
  })
}
