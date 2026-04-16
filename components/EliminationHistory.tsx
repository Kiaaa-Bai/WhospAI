import type { GameState } from '@/hooks/useGameReducer'

export function EliminationHistory({ state }: { state: GameState }) {
  if (state.history.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 justify-center py-2 text-xs text-zinc-400">
      {state.history.map((h, i) => {
        if (!h.eliminatedId) {
          return (
            <span key={i} className="px-2 py-1 rounded bg-zinc-800/60">
              R{h.round}: no elimination
            </span>
          )
        }
        const p = state.players.find(p => p.id === h.eliminatedId)!
        const color = h.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
        return (
          <span key={i} className="px-2 py-1 rounded bg-zinc-800/60">
            R{h.round}: <span className="font-medium">{p.displayName}</span>{' '}
            eliminated — was <span className={color}>{h.role}</span>
          </span>
        )
      })}
    </div>
  )
}
