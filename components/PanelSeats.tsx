'use client'
import { SeatCard } from './SeatCard'
import { HistoryStrip } from './HistoryStrip'
import type { GameState } from '@/hooks/useGameReducer'

export function PanelSeats({ state }: { state: GameState }) {
  const seatOrder = state.players.map(p => p.id)

  return (
    <div>
      <div className="flex gap-3 justify-center">
        {seatOrder.map(id => {
          const p = state.players.find(pp => pp.id === id)
          if (!p) return null
          const isActive = state.currentSpeaker === p.id
          const myVote = state.currentRoundVotes[p.id]
          const target = myVote ? state.players.find(pp => pp.id === myVote) : null
          return (
            <SeatCard
              key={p.id}
              player={p}
              currentSpeech={state.currentSpeech[p.id]}
              isActive={isActive}
              voteTarget={target?.modelSlug ?? null}
              phase={state.phase}
            />
          )
        })}
      </div>

      <div className="mt-6">
        <HistoryStrip state={state} />
      </div>
    </div>
  )
}
