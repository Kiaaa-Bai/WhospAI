// hooks/useGameReducer.ts
'use client'
import { useReducer } from 'react'
import type {
  GameEvent, GameResult, Player, PlayerId, Statement, Vote,
} from '@/lib/game/types'

export interface GameState {
  players: Player[]
  round: number
  phase: 'setup' | 'describe' | 'vote' | 'tiebreak' | 'over'
  order: PlayerId[]
  currentSpeaker: PlayerId | null
  currentSpeech: Record<string, string>
  statements: Statement[]
  currentStatements: Statement[]
  votes: Vote[]
  reasoningByPlayer: Record<string, string>
  lastEliminationTally: Record<string, number> | null
  history: Array<{ round: number; eliminatedId: PlayerId | null; role?: Player['role'] }>
  result: GameResult | null
  error: string | null
}

export const initialGameState: GameState = {
  players: [],
  round: 0,
  phase: 'setup',
  order: [],
  currentSpeaker: null,
  currentSpeech: {},
  statements: [],
  currentStatements: [],
  votes: [],
  reasoningByPlayer: {},
  lastEliminationTally: null,
  history: [],
  result: null,
  error: null,
}

export function reduceGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'game-start':
      return { ...initialGameState, players: event.players, phase: 'describe' }

    case 'round-start':
      return {
        ...state,
        round: event.round,
        currentSpeech: {},
        currentStatements: [],
      }

    case 'round-order':
      return { ...state, order: event.order }

    case 'phase':
      return { ...state, phase: event.phase }

    case 'speak-start':
      return {
        ...state,
        currentSpeaker: event.playerId,
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.playerId]: '',
        },
      }

    case 'speak-token':
      return {
        ...state,
        currentSpeech: {
          ...state.currentSpeech,
          [event.playerId]: (state.currentSpeech[event.playerId] ?? '') + event.delta,
        },
      }

    case 'speak-end':
      return {
        ...state,
        currentSpeaker: null,
        statements: [...state.statements, event.statement],
        currentStatements: [...state.currentStatements, event.statement],
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.statement.playerId]: event.reasoning,
        },
      }

    case 'think-token':
      return {
        ...state,
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.playerId]: (state.reasoningByPlayer[event.playerId] ?? '') + event.delta,
        },
      }

    case 'speak-error':
      return { ...state, currentSpeaker: null }

    case 'vote-start':
      return { ...state, currentSpeaker: event.playerId }

    case 'vote-cast':
      return {
        ...state,
        currentSpeaker: null,
        votes: [...state.votes, event.vote],
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.vote.voterId]: event.vote.reasoning,
        },
      }

    case 'elimination':
      return {
        ...state,
        players: state.players.map(p =>
          p.id === event.playerId
            ? { ...p, eliminated: true, eliminatedRound: state.round }
            : p,
        ),
        lastEliminationTally: event.tally,
        history: [
          ...state.history,
          {
            round: state.round,
            eliminatedId: event.playerId,
            role: state.players.find(p => p.id === event.playerId)?.role,
          },
        ],
      }

    case 'tie':
      return state

    case 'no-elimination':
      return {
        ...state,
        history: [...state.history, { round: state.round, eliminatedId: null }],
      }

    case 'game-over':
      return { ...state, phase: 'over', result: event.result }

    case 'error':
      return { ...state, error: event.message }
  }
}

export function useGameReducer() {
  return useReducer(reduceGameEvent, initialGameState)
}
