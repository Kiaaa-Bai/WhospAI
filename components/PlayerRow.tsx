'use client'
import { LayoutGroup, motion } from 'framer-motion'
import { PlayerCard } from './PlayerCard'
import type { GameState } from '@/hooks/useGameReducer'

export function PlayerRow({ state }: { state: GameState }) {
  const alive = state.players.filter(p => !p.eliminated)
  const eliminated = state.players.filter(p => p.eliminated)

  const orderedAlive = state.order.length
    ? state.order
        .map(id => alive.find(p => p.id === id))
        .filter((p): p is NonNullable<typeof p> => p !== undefined)
    : alive

  const all = [...orderedAlive, ...eliminated]

  return (
    <LayoutGroup>
      <motion.div
        layout
        className="flex flex-wrap justify-center gap-4 py-8"
      >
        {all.map(p => {
          const showVote = (state.phase === 'vote' || state.phase === 'tiebreak' || state.phase === 'over')
            && p.id in state.currentRoundVotes
          return (
            <PlayerCard
              key={p.id}
              player={p}
              currentSpeech={state.currentSpeech[p.id]}
              isSpeaking={state.currentSpeaker === p.id && (state.phase === 'describe' || state.phase === 'tiebreak')}
              isVoting={state.currentSpeaker === p.id && state.phase === 'vote'}
              votedFor={showVote ? state.currentRoundVotes[p.id] : undefined}
            />
          )
        })}
      </motion.div>
    </LayoutGroup>
  )
}
