'use client'
import type { GameState } from '@/hooks/useGameReducer'

interface Props {
  state: GameState
  civilianWord: string
  undercoverWord: string
}

export function InfoBox({ state, civilianWord, undercoverWord }: Props) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-xs space-y-3">
      <div className="flex gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-zinc-400">Civilian:</span>
          <span className="text-emerald-300 font-semibold">{civilianWord}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-zinc-400">Undercover:</span>
          <span className="text-red-300 font-semibold">{undercoverWord}</span>
        </div>
      </div>

      {state.history.length > 0 && (
        <div className="pt-2 border-t border-zinc-800 space-y-1">
          {state.history.map((h, i) => {
            if (!h.eliminatedId) {
              return (
                <div key={i} className="text-zinc-500">R{h.round}: no elimination</div>
              )
            }
            const p = state.players.find(pp => pp.id === h.eliminatedId)
            const color = h.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
            return (
              <div key={i} className="text-zinc-400">
                R{h.round}: <span className="text-zinc-100">{p?.displayName ?? h.eliminatedId}</span>{' '}
                — was <span className={color}>{h.role}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
