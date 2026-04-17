'use client'
import { HandPointing, HourglassMedium, Skull } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import type { GameState } from '@/hooks/useGameReducer'

/**
 * Renders 6 columns (one per player). Must be placed inside a parent
 * grid-cols-6 container so columns align with SeatCards above.
 *
 * Statement cell per round:
 *   - Eliminated in an earlier round → 💀 skull
 *   - Normal statement → full text
 *   - Describe phase complete for this round but no statement → ⏳ hourglass (timeout)
 *   - Current round still in describe phase, not yet spoken → empty (pending)
 *
 * Vote cell per round:
 *   - Eliminated earlier → blank
 *   - Vote cast with target → target avatar
 *   - Vote cast with null target → ⏳ (abstained/timed out)
 *   - No vote yet → empty (pending)
 */
export function HistoryStrip({ state }: { state: GameState }) {
  const roundsCompleted = Math.max(
    ...state.statements.map(s => s.round),
    ...state.votes.map(v => v.round),
    0,
  )

  const rounds = Array.from({ length: roundsCompleted }, (_, i) => i + 1)

  const currentRound = state.round
  const describeOngoing = state.phase === 'describe' || state.phase === 'tiebreak'

  return (
    <>
      {state.players.map(p => (
        <div key={p.id} className="flex flex-col gap-1.5">
          {rounds.length === 0 ? (
            <div className="text-[10px] leading-tight bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1.5 text-zinc-600 italic text-center">
              no rounds yet
            </div>
          ) : (
            rounds.map(r => {
              const stmt = state.statements.find(s => s.playerId === p.id && s.round === r)
              const vote = state.votes.find(v => v.voterId === p.id && v.round === r)
              const target = vote?.targetId
                ? state.players.find(pp => pp.id === vote.targetId)
                : null

              const eliminatedBefore =
                p.eliminated &&
                typeof p.eliminatedRound === 'number' &&
                p.eliminatedRound < r

              // The describe phase of round r is "still open" when r is the
              // current round AND the phase is still describe (or tiebreak).
              const describePhaseOpen = r === currentRound && describeOngoing

              let statementCell: React.ReactNode
              if (eliminatedBefore) {
                statementCell = (
                  <Skull weight="fill" size={12} className="text-zinc-600 inline" />
                )
              } else if (stmt) {
                statementCell = stmt.text
              } else if (describePhaseOpen) {
                // Pending: will speak later this round — show nothing.
                statementCell = <span className="text-zinc-700">&nbsp;</span>
              } else {
                // Timed out / failed to speak.
                statementCell = (
                  <HourglassMedium weight="fill" size={12} className="text-zinc-600 inline" />
                )
              }

              let voteCell: React.ReactNode = null
              if (!eliminatedBefore) {
                if (vote && target) {
                  voteCell = (
                    <>
                      <HandPointing weight="fill" size={12} />
                      <Avatar modelSlug={target.modelSlug} size={18} />
                    </>
                  )
                } else if (vote && vote.targetId === null) {
                  voteCell = (
                    <HourglassMedium weight="fill" size={12} className="text-zinc-600" />
                  )
                }
                // else: no vote yet → empty
              }

              return (
                <div
                  key={r}
                  className="text-[11px] leading-tight bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                >
                  <div className="text-zinc-500 font-mono text-[10px]">R{r}</div>
                  <div className="text-zinc-300 break-words whitespace-normal min-h-[16px]">
                    {statementCell}
                  </div>
                  <div className="text-amber-400 flex items-center gap-1 min-h-[20px] mt-0.5">
                    {voteCell}
                  </div>
                </div>
              )
            })
          )}
        </div>
      ))}
    </>
  )
}
