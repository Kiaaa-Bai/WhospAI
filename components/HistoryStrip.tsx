'use client'
import type { GameState } from '@/hooks/useGameReducer'

export function HistoryStrip({ state }: { state: GameState }) {
  const roundsCompleted = Math.max(
    ...state.statements.map(s => s.round),
    ...state.votes.map(v => v.round),
    0,
  )
  if (roundsCompleted === 0) return null

  const rounds = Array.from({ length: roundsCompleted }, (_, i) => i + 1)

  return (
    <div className="grid grid-cols-6 gap-x-3">
      {state.players.map(p => (
        <div key={p.id} className="flex flex-col gap-1 w-24">
          {rounds.map(r => {
            const stmt = state.statements.find(s => s.playerId === p.id && s.round === r)
            const vote = state.votes.find(v => v.voterId === p.id && v.round === r)
            const short = stmt ? (stmt.text.length > 14 ? stmt.text.slice(0, 13) + '…' : stmt.text) : '—'
            return (
              <div key={r} className="text-[10px] leading-tight bg-zinc-900 border border-zinc-800 rounded px-1 py-0.5">
                <div className="text-zinc-500">R{r}</div>
                <div className="text-zinc-300 truncate">{short}</div>
                <div className="text-amber-400 truncate">
                  {vote ? (vote.targetId ? `→${vote.targetId}` : '—') : ''}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
