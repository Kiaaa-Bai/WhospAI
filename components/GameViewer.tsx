'use client'
import { useEffect } from 'react'
import {
  XCircle, Users, Skull, FilmSlate, SpeakerHigh, SpeakerSlash,
} from '@phosphor-icons/react'
import { useGameSSE } from '@/hooks/useGameSSE'
import { useGameReducer } from '@/hooks/useGameReducer'
import { useOverlayTrigger } from '@/hooks/useOverlayTrigger'
import { usePlaybackDispatch } from '@/hooks/usePlaybackDispatch'
import { useSpeech } from '@/hooks/useSpeech'
import { MainStage } from './MainStage'
import { PanelSeats } from './PanelSeats'
import { PhaseOverlay } from './PhaseOverlay'
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
  const speech = useSpeech()
  const playbackDispatch = usePlaybackDispatch(dispatch, speech.speak, speech.prepare)
  const { start, status, error } = useGameSSE(playbackDispatch)
  const overlay = useOverlayTrigger(state)

  useEffect(() => {
    start(config)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aliveCount = state.players.filter(p => !p.eliminated).length
  const inGame = state.phase !== 'setup' && state.players.length > 0

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-hidden">
      <header className="shrink-0 border-b border-zinc-800">
        {/* Row 1: title, game status, voice + exit */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="font-bold text-lg tracking-wider">WHOSPY</div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            {inGame && (
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
          <div className="flex items-center gap-3">
            {speech.supported && (
              <button
                onClick={() => speech.setEnabled(!speech.enabled)}
                aria-label={speech.enabled ? 'Mute voice' : 'Enable voice'}
                title={speech.enabled ? 'Mute voice' : 'Enable voice'}
                className={`transition-colors ${
                  speech.enabled
                    ? 'text-amber-300 hover:text-amber-200'
                    : 'text-zinc-600 hover:text-zinc-400'
                }`}
              >
                {speech.enabled
                  ? <SpeakerHigh weight="fill" size={22} />
                  : <SpeakerSlash weight="fill" size={22} />}
              </button>
            )}
            <button
              onClick={onExit}
              aria-label="Exit"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <XCircle weight="fill" size={22} />
            </button>
          </div>
        </div>

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
        <div className="flex-1 flex items-center justify-center text-zinc-400">
          Dealing the words…
        </div>
      )}

      {state.players.length > 0 && (
        <div className="flex-1 min-h-0 grid grid-cols-[minmax(520px,48%)_1fr] gap-6 px-6 py-6">
          <div className="min-h-0 overflow-hidden">
            <MainStage state={state} />
          </div>
          <div className="min-h-0 overflow-y-auto">
            <PanelSeats state={state} />
          </div>
        </div>
      )}

      <PhaseOverlay state={overlay} />

      {state.result && <GameOverOverlay result={state.result} onPlayAgain={onExit} />}
    </div>
  )
}
