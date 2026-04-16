import { describe, it, expect } from 'vitest'
import { shuffle } from '@/lib/game/shuffle'

describe('shuffle', () => {
  it('returns a new array with the same elements', () => {
    const input = [1, 2, 3, 4, 5]
    const output = shuffle(input, () => 0)
    expect(output).not.toBe(input)
    expect(output.sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic given a fixed rng', () => {
    let i = 0
    const rng = () => [0.9, 0.1, 0.5, 0.3][i++ % 4]
    const a = shuffle([1, 2, 3, 4], rng)
    i = 0
    const b = shuffle([1, 2, 3, 4], rng)
    expect(a).toEqual(b)
  })

  it('does not mutate the input', () => {
    const input = [1, 2, 3]
    const copy = [...input]
    shuffle(input)
    expect(input).toEqual(copy)
  })
})
