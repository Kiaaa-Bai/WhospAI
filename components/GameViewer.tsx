'use client'
import { useEffect } from 'react'
import { XCircle, Users, Skull, FilmSlate } from '@phosphor-icons/react'
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

  const aliveCount = state.players.filter(p => !p.eliminated).length

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 shrink-0">
        <div className="font-bold text-lg tracking-wider">WHOSPY</div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {state.phase !== 'setup' && (
            <>
              <span className="flex items-center gap-1.5">
                <FilmSlate weight="fill" size={16} className="text-zinc-500" />
                R{state.round}
              </span>
              <span className="uppercase tracking-wider text-xs bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
                {state.phase}
              </span>
              <span className="flex items-center gap-1.5">
                <Users weight="fill" size={16} className="text-emerald-400" />
                {aliveCount}
              </span>
            </>
          )}
        </div>
        <button
          onClick={onExit}
          aria-label="Exit"
          className="text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <XCircle weight="fill" size={22} />
        </button>
      </header>

      {error && (
        <div className="m-6 p-4 rounded bg-red-950 border border-red-800 text-red-200 text-sm">
          <div className="font-medium flex items-center gap-2">
            <Skull weight="fill" size={16} /> Something went wrong
          </div>
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
        <div className="flex-1 flex items-center justify-center text-zinc-400">Dealing the words…</div>
      )}

      {state.players.length > 0 && (
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(480px,45%)_1fr] gap-6 px-6 py-6">
          <div className="min-h-0 overflow-hidden">
            <MainStage state={state} />
          </div>
          <div className="min-h-0 flex flex-col gap-4">
            <div className="shrink-0">
              <PanelSeats state={state} />
            </div>
            <div className="flex-1 min-h-0" />
            <div className="shrink-0 h-[30vh] min-h-[200px]">
              <InfoBox
                state={state}
                civilianWord={config.civilianWord}
                undercoverWord={config.undercoverWord}
              />
            </div>
          </div>
        </div>
      )}

      {state.result && <GameOverOverlay result={state.result} onPlayAgain={onExit} />}
    </div>
  )
}
