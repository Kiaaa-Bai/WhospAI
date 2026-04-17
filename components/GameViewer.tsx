'use client'
import { useEffect } from 'react'
import { useGameSSE } from '@/hooks/useGameSSE'
import { useGameReducer } from '@/hooks/useGameReducer'
import { MainStage } from './MainStage'
import { PanelSeats } from './PanelSeats'
import { InfoBox } from './InfoBox'
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800">
        <div className="font-bold text-lg">WHOSPY</div>
        <div className="text-xs text-zinc-500">
          {state.phase !== 'setup' && (
            <>
              Round {state.round} · <span className="uppercase">{state.phase}</span> · Alive:{' '}
              {state.players.filter(p => !p.eliminated).length}
            </>
          )}
        </div>
        <button
          onClick={onExit}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          exit
        </button>
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

      {state.players.length > 0 && (
        <div className="grid grid-cols-[360px_1fr] gap-6 px-6 py-6">
          <div className="sticky top-4 self-start">
            <MainStage state={state} />
          </div>
          <div className="space-y-6">
            <PanelSeats state={state} />
            <InfoBox
              state={state}
              civilianWord={config.civilianWord}
              undercoverWord={config.undercoverWord}
            />
          </div>
        </div>
      )}

      {state.result && <GameOverOverlay result={state.result} onPlayAgain={onExit} />}
    </div>
  )
}
