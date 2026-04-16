'use client'
import { useEffect } from 'react'
import { useGameSSE } from '@/hooks/useGameSSE'
import { useGameReducer } from '@/hooks/useGameReducer'
import { PlayerRow } from './PlayerRow'
import { EliminationHistory } from './EliminationHistory'
import { InnerThoughtsDrawer } from './InnerThoughtsDrawer'
import { GameOverOverlay } from './GameOverOverlay'
import type { GameConfig } from '@/lib/game/types'

export function GameViewer({
  config,
  onExit,
}: {
  config: GameConfig
  onExit: () => void
}) {
  const [state, dispatch] = useGameReducer()
  const { start, status, error } = useGameSSE(e => dispatch(e))

  useEffect(() => {
    start(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100 pb-72">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
        <div className="font-bold text-lg">Whospy</div>
        <div className="text-xs text-zinc-500">
          {state.phase !== 'setup' && (
            <>
              Round {state.round} ·{' '}
              <span className="uppercase">{state.phase}</span> ·{' '}
              Alive: {state.players.filter(p => !p.eliminated).length}
            </>
          )}
        </div>
      </header>

      {error && (
        <div className="m-6 p-4 rounded bg-red-950 border border-red-800 text-red-200 text-sm">
          <div className="font-medium">Something went wrong</div>
          <div className="mt-1 text-red-300/80 text-xs">{error}</div>
          <button
            className="mt-3 text-xs px-2 py-1 rounded bg-red-900 hover:bg-red-800"
            onClick={onExit}
          >
            Back to setup
          </button>
        </div>
      )}

      {status === 'streaming' && state.players.length === 0 && (
        <div className="text-center mt-16 text-zinc-400">Dealing the words…</div>
      )}

      <PlayerRow state={state} />
      <EliminationHistory state={state} />

      {state.result && <GameOverOverlay result={state.result} onPlayAgain={onExit} />}

      {state.players.length > 0 && <InnerThoughtsDrawer state={state} />}
    </div>
  )
}
