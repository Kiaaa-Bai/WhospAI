'use client'
import { HandPointing, HourglassMedium, Skull } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import type { GameState } from '@/hooks/useGameReducer'

/**
 * Renders 6 columns (one per player). Must be placed inside a parent
 * grid-cols-6 container so columns align with SeatCards above.
 *
 * Cell semantics per round:
 *   - Eliminated in an earlier round → 💀 skull (no content)
 *   - No statement but should have spoken → ⏳ hourglass (timeout)
 *   - Normal statement → full text (wraps)
 *   - Vote row: target avatar if successful; ⏳ if abstained (targetId null)
 */
export function HistoryStrip({ state }: { state: GameState }) {
  const roundsCompleted = Math.max(
    ...state.statements.map(s => s.round),
    ...state.votes.map(v => v.round),
    0,
  )

  const rounds = Array.from({ length: roundsCompleted }, (_, i) => i + 1)

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

              // Was this player already out before round `r` started?
              const eliminatedBefore =
                p.eliminated &&
                typeof p.eliminatedRound === 'number' &&
                p.eliminatedRound < r

              return (
                <div
                  key={r}
                  className="text-[11px] leading-tight bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                >
                  <div className="text-zinc-500 font-mono text-[10px]">R{r}</div>

                  {/* Statement */}
                  <div className="text-zinc-300 break-words whitespace-normal min-h-[16px]">
                    {eliminatedBefore ? (
                      <Skull weight="fill" size={12} className="text-zinc-600 inline" />
                    ) : stmt ? (
                      stmt.text
                    ) : (
                      <HourglassMedium weight="fill" size={12} className="text-zinc-600 inline" />
                    )}
                  </div>

                  {/* Vote target */}
                  <div className="text-amber-400 flex items-center gap-1 min-h-[20px] mt-0.5">
                    {eliminatedBefore ? null : vote && target ? (
                      <>
                        <HandPointing weight="fill" size={12} />
                        <Avatar modelSlug={target.modelSlug} size={18} />
                      </>
                    ) : vote && vote.targetId === null ? (
                      <HourglassMedium weight="fill" size={12} className="text-zinc-600" />
                    ) : null}
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
