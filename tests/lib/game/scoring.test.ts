import { describe, it, expect } from 'vitest'
import { resolveVotes, checkWinCondition } from '@/lib/game/scoring'
import type { Player, Vote } from '@/lib/game/types'

const mkVote = (voterId: string, targetId: string | null, round = 1): Vote => ({
  voterId: voterId as Vote['voterId'],
  targetId: targetId as Vote['targetId'],
  round,
  reasoning: '',
})

const alive = (ids: string[]): Player[] =>
  ids.map(id => ({
    id: id as Player['id'],
    displayName: id,
    modelSlug: 'openai/gpt-5.4-mini',
    role: 'civilian',
    word: 'w',
    eliminated: false,
  }))

describe('resolveVotes', () => {
  it('elects a single winner when one player has the most votes', () => {
    const votes = [
      mkVote('p1', 'p3'), mkVote('p2', 'p3'), mkVote('p3', 'p1'),
      mkVote('p4', 'p3'), mkVote('p5', 'p2'),
    ]
    const result = resolveVotes(votes, alive(['p1','p2','p3','p4','p5']))
    expect(result.kind).toBe('elimination')
    if (result.kind === 'elimination') expect(result.targetId).toBe('p3')
  })

  it('returns a tie when multiple players share the top vote count', () => {
    const votes = [
      mkVote('p1', 'p3'), mkVote('p2', 'p3'),
      mkVote('p3', 'p1'), mkVote('p4', 'p1'),
    ]
    const result = resolveVotes(votes, alive(['p1','p2','p3','p4']))
    expect(result.kind).toBe('tie')
    if (result.kind === 'tie') expect(result.tiedIds.sort()).toEqual(['p1','p3'])
  })

  it('ignores null (abstain) targets', () => {
    const votes = [mkVote('p1', null), mkVote('p2', 'p3'), mkVote('p3', 'p2')]
    const result = resolveVotes(votes, alive(['p1','p2','p3']))
    expect(result.kind).toBe('tie')
  })

  it('returns tie with empty tiedIds if all votes are null', () => {
    const votes = [mkVote('p1', null), mkVote('p2', null)]
    const result = resolveVotes(votes, alive(['p1','p2']))
    expect(result.kind).toBe('tie')
    if (result.kind === 'tie') expect(result.tiedIds).toEqual([])
  })
})

describe('checkWinCondition', () => {
  const mkPlayers = (roles: { role: Player['role']; eliminated: boolean }[]): Player[] =>
    roles.map((r, i) => ({
      id: `p${i+1}` as Player['id'],
      displayName: `p${i+1}`,
      modelSlug: 'openai/gpt-5.4-mini',
      role: r.role,
      word: 'w',
      eliminated: r.eliminated,
    }))

  it('civilians win when undercover is eliminated', () => {
    const players = mkPlayers([
      { role: 'civilian', eliminated: false },
      { role: 'civilian', eliminated: false },
      { role: 'undercover', eliminated: true },
      { role: 'civilian', eliminated: false },
    ])
    expect(checkWinCondition(players)).toBe('civilians')
  })

  it('undercover wins when only 2 players remain and undercover is alive', () => {
    const players = mkPlayers([
      { role: 'civilian', eliminated: false },
      { role: 'undercover', eliminated: false },
      { role: 'civilian', eliminated: true },
      { role: 'civilian', eliminated: true },
    ])
    expect(checkWinCondition(players)).toBe('undercover')
  })

  it('returns null when game should continue', () => {
    const players = mkPlayers([
      { role: 'civilian', eliminated: false },
      { role: 'civilian', eliminated: false },
      { role: 'civilian', eliminated: false },
      { role: 'undercover', eliminated: false },
    ])
    expect(checkWinCondition(players)).toBeNull()
  })
})
