import { describe, it, expect } from 'vitest'
import { assignRoles } from '@/lib/game/assign-roles'

describe('assignRoles', () => {
  const config = { civilianWord: 'apple', undercoverWord: 'pear' }

  it('creates exactly 6 players', () => {
    const players = assignRoles(config)
    expect(players).toHaveLength(6)
  })

  it('assigns player ids p1..p6', () => {
    const players = assignRoles(config)
    expect(players.map(p => p.id).sort()).toEqual(['p1','p2','p3','p4','p5','p6'])
  })

  it('has exactly 1 undercover and 5 civilians', () => {
    for (let i = 0; i < 50; i++) {
      const players = assignRoles(config)
      const undercovers = players.filter(p => p.role === 'undercover')
      const civilians = players.filter(p => p.role === 'civilian')
      expect(undercovers).toHaveLength(1)
      expect(civilians).toHaveLength(5)
    }
  })

  it('gives civilians the civilian word and undercover the undercover word', () => {
    const players = assignRoles(config)
    for (const p of players) {
      expect(p.word).toBe(p.role === 'civilian' ? 'apple' : 'pear')
    }
  })

  it('starts all players alive', () => {
    const players = assignRoles(config)
    for (const p of players) {
      expect(p.eliminated).toBe(false)
      expect(p.eliminatedRound).toBeUndefined()
    }
  })

  it('assigns each model slot exactly once', () => {
    const players = assignRoles(config)
    const slugs = players.map(p => p.modelSlug)
    expect(new Set(slugs).size).toBe(6)
  })
})
