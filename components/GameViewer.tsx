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
import { GameOverPage } from './GameOverPage'
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
    <div
      className="h-screen flex flex-col overflow-hidden"
      style={{ background: 'var(--reigns-bg)', color: 'var(--reigns-ink)' }}
    >
      {/* Dark accent strip header — Reigns-style */}
      <header
        className="shrink-0"
        style={{
          background: 'var(--reigns-accent-strip)',
          color: '#F5EDDB',
          borderBottom: '3px solid var(--reigns-ink)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-3">
          <div
            className="font-heading font-black text-xl tracking-[0.3em]"
            style={{ color: '#F5EDDB' }}
          >
            WHOSPY
          </div>
          <div className="flex items-center gap-3 font-mono text-sm" style={{ color: '#E5DCCA' }}>
            {inGame && (
              <>
                <span className="ink-chip" style={{ background: 'rgba(0,0,0,0.25)' }}>
                  <FilmSlate weight="fill" size={12} />
                  R{state.round}
                </span>
                <span
                  className="ink-chip uppercase"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                >
                  {state.phase}
                </span>
                <span
                  className="ink-chip"
                  style={{ background: 'rgba(0,0,0,0.25)', color: '#F5EDDB' }}
                >
                  <Users weight="fill" size={12} />
                  {aliveCount}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            {speech.supported && (
              <button
                onClick={() => speech.setEnabled(!speech.enabled)}
                aria-label={speech.enabled ? 'Mute voice' : 'Enable voice'}
                title={speech.enabled ? 'Mute voice' : 'Enable voice'}
                className="transition-colors"
                style={{
                  color: speech.enabled ? '#F0C851' : 'rgba(245,237,219,0.35)',
                }}
              >
                {speech.enabled
                  ? <SpeakerHigh weight="fill" size={22} />
                  : <SpeakerSlash weight="fill" size={22} />}
              </button>
            )}
            <button
              onClick={onExit}
              aria-label="Exit"
              className="transition-colors"
              style={{ color: 'rgba(245,237,219,0.65)' }}
            >
              <XCircle weight="fill" size={22} />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="m-6 p-4 rounded-lg text-sm"
          style={{
            background: '#F5D9D5',
            border: '2px solid var(--reigns-red)',
            color: '#6B1C18',
          }}
        >
          <div className="font-bold flex items-center gap-2">
            <Skull weight="fill" size={16} /> Something went wrong
          </div>
          <div className="mt-1 text-xs">{error}</div>
          <button className="pixel-btn pixel-btn-danger mt-3 text-xs" onClick={onExit}>
            Back to setup
          </button>
        </div>
      )}

      {status === 'streaming' && state.players.length === 0 && (
        <div
          className="flex-1 flex items-center justify-center font-mono tracking-widest"
          style={{ color: 'var(--reigns-ink-soft)' }}
        >
          DEALING THE WORDS…
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

      {state.result && (
        <GameOverPage
          result={state.result}
          state={state}
          config={config}
          onPlayAgain={onExit}
        />
      )}
    </div>
  )
}
