'use client'
import type { GameState } from '@/hooks/useGameReducer'

interface Props {
  state: GameState
  civilianWord: string
  undercoverWord: string
}

export function InfoBox({ state, civilianWord, undercoverWord }: Props) {
  return (
    <div className="h-full bg-zinc-900 border border-zinc-800 rounded-xl p-6 flex flex-col gap-5 overflow-hidden">
      {/* Word pair — prominent */}
      <div className="flex items-stretch gap-4 shrink-0">
        <div className="flex-1 flex items-center gap-3 bg-zinc-950 border border-emerald-900/50 rounded-lg px-4 py-3">
          <span className="w-3 h-3 rounded-full bg-emerald-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Civilian</div>
            <div className="text-xl text-emerald-300 font-bold">{civilianWord}</div>
          </div>
        </div>
        <div className="flex-1 flex items-center gap-3 bg-zinc-950 border border-red-900/50 rounded-lg px-4 py-3">
          <span className="w-3 h-3 rounded-full bg-red-400 shrink-0" />
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500">Undercover</div>
            <div className="text-xl text-red-300 font-bold">{undercoverWord}</div>
          </div>
        </div>
      </div>

      {/* Elimination timeline — scrollable if long */}
      <div className="flex-1 min-h-0 flex flex-col">
        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 shrink-0">
          Elimination timeline
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 text-sm">
          {state.history.length === 0 ? (
            <div className="text-zinc-600 italic">No eliminations yet</div>
          ) : (
            state.history.map((h, i) => {
              if (!h.eliminatedId) {
                return (
                  <div key={i} className="text-zinc-500">
                    <span className="text-zinc-600 font-mono mr-2">R{h.round}</span>
                    no elimination
                  </div>
                )
              }
              const p = state.players.find(pp => pp.id === h.eliminatedId)
              const color = h.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
              return (
                <div key={i} className="text-zinc-400">
                  <span className="text-zinc-600 font-mono mr-2">R{h.round}</span>
                  <span className="text-zinc-100 font-medium">{p?.displayName ?? h.eliminatedId}</span>
                  <span className="text-zinc-600 mx-1.5">—</span>
                  <span className={color}>{h.role}</span>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
