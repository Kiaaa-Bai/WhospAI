// lib/game/types.ts

export type ModelSlug =
  | 'openai/gpt-5.4-mini'
  | 'anthropic/claude-haiku-4.5'
  | 'google/gemini-2.5-flash'
  | 'deepseek/deepseek-v3'
  | 'xai/grok-3-mini'
  | 'alibaba/qwen3-max'

export type Role = 'civilian' | 'undercover'

export type PlayerId = 'p1' | 'p2' | 'p3' | 'p4' | 'p5' | 'p6'

export const ALL_PLAYER_IDS: readonly PlayerId[] = [
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6',
] as const

export interface Player {
  id: PlayerId
  displayName: string
  modelSlug: ModelSlug
  role: Role
  word: string
  eliminated: boolean
  eliminatedRound?: number
}

export interface Statement {
  playerId: PlayerId
  round: number
  text: string
}

export interface Vote {
  voterId: PlayerId
  targetId: PlayerId | null
  round: number
  reasoning: string
}

export interface GameConfig {
  civilianWord: string
  undercoverWord: string
}

export interface GameResult {
  winner: 'civilians' | 'undercover'
  rounds: number
  players: Array<Pick<Player, 'modelSlug' | 'role' | 'eliminated' | 'eliminatedRound'>>
}

export type GameEvent =
  | { type: 'game-start';   players: Player[] }
  | { type: 'round-start';  round: number }
  | { type: 'round-order';  round: number; order: PlayerId[] }
  | { type: 'phase';        phase: 'describe' | 'vote' | 'tiebreak' }
  | { type: 'speak-start';  playerId: PlayerId }
  | { type: 'speak-token';  playerId: PlayerId; delta: string }
  | { type: 'speak-end';    statement: Statement; reasoning: string }
  | { type: 'speak-error';  playerId: PlayerId; reason: string }
  | { type: 'vote-start';   playerId: PlayerId }
  | { type: 'vote-cast';    vote: Vote }
  | { type: 'elimination';  playerId: PlayerId; tally: Record<string, number> }
  | { type: 'tie';          tiedPlayers: PlayerId[] }
  | { type: 'no-elimination' }
  | { type: 'game-over';    result: GameResult }
  | { type: 'think-token';  playerId: PlayerId; delta: string }
  | { type: 'error';        message: string }

export type Emit = (event: GameEvent) => void
