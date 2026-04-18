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
  currentRoundVotes: Record<string, string | null>
  /** Players who failed/abstained this round (describe error or null vote). */
  currentSkipped: PlayerId[]
  tiedPlayers: PlayerId[]
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
  currentRoundVotes: {},
  currentSkipped: [],
  tiedPlayers: [],
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
        currentRoundVotes: {},
        currentSkipped: [],
      }

    case 'round-order':
      return { ...state, order: event.order }

    case 'phase':
      // Entering tiebreak wipes per-round bubble + vote state so leftover
      // describe-phase content doesn't bleed into the tiebreak. Tied players
      // will repopulate currentSpeech via their tiebreak speak-start; voters
      // will repopulate currentRoundVotes via tiebreak vote-cast.
      // Phase switches clear `currentSkipped` so a player who failed in the
      // describe phase can still reach DONE in the vote phase if they vote
      // successfully (and vice versa).
      if (event.phase === 'tiebreak') {
        return {
          ...state,
          phase: event.phase,
          currentSpeech: {},
          currentRoundVotes: {},
          currentSkipped: [],
        }
      }
      if (event.phase === 'vote') {
        return {
          ...state,
          phase: event.phase,
          currentSpeech: {},
          currentSkipped: [],
        }
      }
      return { ...state, phase: event.phase, currentSkipped: [] }

    case 'speak-start':
      // Clear both reasoning AND currentSpeech for this player so a tiebreak
      // re-describe doesn't append onto the previous round's text in either
      // the bubble or the inner-thoughts area.
      return {
        ...state,
        currentSpeaker: event.playerId,
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.playerId]: '',
        },
        currentSpeech: {
          ...state.currentSpeech,
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
      // NOTE: currentSpeaker is intentionally NOT cleared here so the
      // speaker stays in focus during the post-turn linger. It's cleared
      // on the next speak-start / vote-start / game-over.
      return {
        ...state,
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
      // leave currentSpeaker alone; it'll roll over to the next speaker.
      // Mark the player as skipped so the speaking-order strip can show
      // them in the SKIPPED bucket (instead of a permanent UP NEXT).
      return {
        ...state,
        currentSkipped: state.currentSkipped.includes(event.playerId)
          ? state.currentSkipped
          : [...state.currentSkipped, event.playerId],
      }

    case 'vote-start':
      return {
        ...state,
        currentSpeaker: event.playerId,
        reasoningByPlayer: {
          ...state.reasoningByPlayer,
          [event.playerId]: '',
        },
      }

    case 'vote-cast':
      // currentSpeaker stays until the next speak/vote-start so the focus
      // lingers on the voter (with the target avatar visible above head).
      return {
        ...state,
        votes: [...state.votes, event.vote],
        currentRoundVotes: {
          ...state.currentRoundVotes,
          [event.vote.voterId]: event.vote.targetId,
        },
        currentSkipped:
          event.vote.targetId === null && !state.currentSkipped.includes(event.vote.voterId)
            ? [...state.currentSkipped, event.vote.voterId]
            : state.currentSkipped,
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
      return { ...state, tiedPlayers: event.tiedPlayers }

    case 'no-elimination':
      return {
        ...state,
        history: [...state.history, { round: state.round, eliminatedId: null }],
      }

    case 'game-over':
      return { ...state, phase: 'over', currentSpeaker: null, result: event.result }

    case 'error':
      return { ...state, error: event.message }
  }
}

export function useGameReducer() {
  return useReducer(reduceGameEvent, initialGameState)
}
