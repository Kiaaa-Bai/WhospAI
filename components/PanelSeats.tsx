'use client'
import { Users, ClockCounterClockwise } from '@phosphor-icons/react'
import { SeatCard } from './SeatCard'
import { HistoryStrip } from './HistoryStrip'
import type { GameState } from '@/hooks/useGameReducer'

function SectionLabel({
  icon,
  text,
}: {
  icon: React.ReactNode
  text: string
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2" style={{ color: 'var(--reigns-ink-soft)' }}>
      <span style={{ color: 'var(--reigns-ink)' }}>{icon}</span>
      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.18em]">
        {text}
      </span>
      <div className="flex-1 h-0.5 ml-1" style={{ background: 'var(--reigns-border-soft)' }} />
    </div>
  )
}

export function PanelSeats({ state }: { state: GameState }) {
  const seatOrder = state.players.map(p => p.id)

  return (
    <div>
      <SectionLabel
        icon={<Users weight="fill" size={14} />}
        text="Contestants"
      />
      <div className="grid grid-cols-6 gap-3">
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

      <div className="mt-5">
        <SectionLabel
          icon={<ClockCounterClockwise weight="fill" size={14} />}
          text="Round History"
        />
        <div className="grid grid-cols-6 gap-3">
          <HistoryStrip state={state} />
        </div>
      </div>
    </div>
  )
}
