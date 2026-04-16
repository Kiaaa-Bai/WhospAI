'use client'
import { useState } from 'react'
import type { GameState } from '@/hooks/useGameReducer'

export function InnerThoughtsDrawer({ state }: { state: GameState }) {
  const [open, setOpen] = useState(true)

  const alivePlayers = state.players.filter(p => !p.eliminated)

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 z-40">
      <div className="max-w-6xl mx-auto px-4 py-2">
        <button
          className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-2"
          onClick={() => setOpen(v => !v)}
        >
          Inner Thoughts (god-view) {open ? '\u25BE' : '\u25B4'}
        </button>

        {open && (
          <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-3 max-h-52 overflow-y-auto text-xs pb-2">
            {alivePlayers.map(p => {
              const isActive = state.currentSpeaker === p.id
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded border ${
                    isActive
                      ? 'bg-zinc-800 border-amber-500/50'
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                >
                  <div className="font-medium text-zinc-300">
                    {p.displayName}{' '}
                    <span className="text-zinc-500">
                      ({p.id}, {p.role})
                    </span>
                    {isActive && (
                      <span className="ml-1 text-amber-400 animate-pulse">thinking...</span>
                    )}
                  </div>
                  <div className="mt-1 text-zinc-400 whitespace-pre-wrap break-words">
                    {state.reasoningByPlayer[p.id] || (
                      <span className="italic opacity-60">{'\u2026'}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
