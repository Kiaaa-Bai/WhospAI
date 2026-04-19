'use client'
import { Users, ClockCounterClockwise } from '@phosphor-icons/react'
import { SeatCard } from './SeatCard'
import { HistoryStrip } from './HistoryStrip'
import { useLang } from '@/lib/i18n'
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
  const { t } = useLang()
  const seatOrder = state.players.map(p => p.id)

  // Tally how many votes each player has received in the current round —
  // used to show a red ×N badge during vote / tiebreak phases.
  const voteCounts: Record<string, number> = {}
  for (const target of Object.values(state.currentRoundVotes)) {
    if (target) voteCounts[target] = (voteCounts[target] ?? 0) + 1
  }

  return (
    <div>
      <SectionLabel
        icon={<Users weight="fill" size={14} />}
        text={t('game.contestants')}
      />
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3 items-stretch">
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
              votesReceived={voteCounts[p.id] ?? 0}
            />
          )
        })}
      </div>

      <div className="mt-4 md:mt-5 hidden md:block">
        <SectionLabel
          icon={<ClockCounterClockwise weight="fill" size={14} />}
          text={t('game.round_history')}
        />
        <div className="grid grid-cols-6 gap-3">
          <HistoryStrip state={state} />
        </div>
      </div>
    </div>
  )
}
