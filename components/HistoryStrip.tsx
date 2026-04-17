'use client'
import { HandPointing } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import type { GameState } from '@/hooks/useGameReducer'

/**
 * Renders 6 columns (one per player). Must be placed inside a parent
 * grid-cols-6 container so columns align with SeatCards above.
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
        <div key={p.id} className="flex flex-col gap-1">
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
              const short = stmt
                ? stmt.text.length > 18 ? stmt.text.slice(0, 17) + '…' : stmt.text
                : '—'
              return (
                <div
                  key={r}
                  className="text-[11px] leading-tight bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5"
                >
                  <div className="text-zinc-500 font-mono text-[10px]">R{r}</div>
                  <div className="text-zinc-300 truncate">{short}</div>
                  <div className="text-amber-400 flex items-center gap-1 min-h-[20px]">
                    {vote && target ? (
                      <>
                        <HandPointing weight="fill" size={12} />
                        <Avatar modelSlug={target.modelSlug} size={18} />
                      </>
                    ) : vote ? (
                      <span>—</span>
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
