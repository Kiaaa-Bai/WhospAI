import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildDescribePrompt, buildVotePrompt, resolveLanguageLabel } from '@/lib/game/prompts'
import type { Player, Statement } from '@/lib/game/types'

const mkPlayer = (id: string, opts: Partial<Player> = {}): Player => ({
  id: id as Player['id'],
  displayName: id,
  modelSlug: 'openai/gpt-5.4-mini',
  role: 'civilian',
  word: 'apple',
  eliminated: false,
  ...opts,
})

describe('buildSystemPrompt', () => {
  it('includes player id and word', () => {
    const player = mkPlayer('p3', { role: 'undercover', word: 'pear' })
    const prompt = buildSystemPrompt(player)
    expect(prompt).toContain('p3')
    expect(prompt).toContain('pear')
  })

  it('does not leak the player\'s own role (structural equality test)', () => {
    const civ = mkPlayer('p1', { role: 'civilian', word: 'apple' })
    const und = mkPlayer('p3', { role: 'undercover', word: 'pear' })
    // If we normalize away the id and word, the two prompts must be identical.
    // This proves there's no conditional branch saying "you are the undercover" etc.
    const norm = (p: string, id: string, word: string) =>
      p.replaceAll(id, '{id}').replaceAll(word, '{word}')
    expect(norm(buildSystemPrompt(civ), 'p1', 'apple'))
      .toBe(norm(buildSystemPrompt(und), 'p3', 'pear'))
  })
})

describe('buildDescribePrompt', () => {
  const players = [
    mkPlayer('p1'), mkPlayer('p2', { eliminated: true, eliminatedRound: 1 }),
    mkPlayer('p3'), mkPlayer('p4'), mkPlayer('p5'), mkPlayer('p6'),
  ]

  it('lists only alive players', () => {
    const prompt = buildDescribePrompt(players[0], { players, statements: [], round: 2 })
    expect(prompt).toContain('p1')
    expect(prompt).toContain('p3')
    expect(prompt).not.toContain('p2 is alive')
  })

  it('includes previous round statements', () => {
    const statements: Statement[] = [
      { playerId: 'p1', round: 1, text: 'It is red.' },
      { playerId: 'p3', round: 1, text: 'It is crunchy.' },
    ]
    const prompt = buildDescribePrompt(players[0], { players, statements, round: 2 })
    expect(prompt).toContain('It is red.')
    expect(prompt).toContain('It is crunchy.')
  })

  it('reveals eliminated players and their roles', () => {
    const prompt = buildDescribePrompt(players[0], { players, statements: [], round: 2 })
    expect(prompt).toContain('p2')
    expect(prompt.toLowerCase()).toContain('eliminated')
  })
})

describe('buildVotePrompt', () => {
  it('asks to pick a target and excludes self', () => {
    const players = [mkPlayer('p1'), mkPlayer('p2'), mkPlayer('p3')]
    const prompt = buildVotePrompt(players[0], { players, statements: [], round: 1 })
    expect(prompt.toLowerCase()).toContain('vote')
    expect(prompt).toContain('cannot vote for yourself')
  })
})

describe('resolveLanguageLabel', () => {
  it('uses the setup language for Latin-alphabet words', () => {
    expect(resolveLanguageLabel(['manzana', 'pera'], 'es')).toBe('Spanish')
    expect(resolveLanguageLabel(['pomme', 'poire'], 'fr')).toBe('French')
    expect(resolveLanguageLabel(['Apfel', 'Birne'], 'de')).toBe('German')
  })

  it('falls back to English for Latin words with no or a non-Latin setup language', () => {
    expect(resolveLanguageLabel(['apple', 'pear'])).toBe('English')
    expect(resolveLanguageLabel(['apple', 'pear'], 'zh')).toBe('English')
  })

  it('puts a kana word and a kanji-only word in the same language', () => {
    expect(resolveLanguageLabel(['りんご', '梨'], 'ja')).toBe('Japanese')
    // Even without the setup language, kana in either word means Japanese.
    expect(resolveLanguageLabel(['りんご', '梨'])).toBe('Japanese')
  })

  it('reads kanji-only pairs as Japanese only when the game is Japanese', () => {
    expect(resolveLanguageLabel(['苹果', '梨'], 'zh')).toBe('Chinese')
    expect(resolveLanguageLabel(['林檎', '梨'], 'ja')).toBe('Japanese')
  })

  it('trusts unambiguous scripts over the setup language', () => {
    expect(resolveLanguageLabel(['사과', '배'], 'en')).toBe('Korean')
    expect(resolveLanguageLabel(['яблоко', 'груша'], 'en')).toBe('Russian')
  })
})

describe('language label threading', () => {
  it('system, describe and vote prompts use the given label instead of the word', () => {
    const p = mkPlayer('p1', { word: 'manzana' })
    const ctx = { players: [p, mkPlayer('p2')], statements: [], round: 1, languageLabel: 'Spanish' }
    expect(buildSystemPrompt(p, 'Spanish')).toContain('MUST be written entirely in Spanish')
    expect(buildDescribePrompt(p, ctx)).toContain('(Spanish)')
    expect(buildVotePrompt(p, ctx)).toContain('(Spanish)')
    expect(buildSystemPrompt(p, 'Spanish')).toContain('The language of that word is: Spanish.')
    // Without a label the old per-word detection still applies (Latin → English).
    expect(buildSystemPrompt(p)).toContain('The language of that word is: English.')
  })
})
