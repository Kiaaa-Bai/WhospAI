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
import { MobileInfoBar } from './MobileInfoBar'
import { useLang } from '@/lib/i18n'
import type { GameConfig } from '@/lib/game/types'

export function GameViewer({
  config,
  onExit,
}: {
  config: GameConfig
  onExit: () => void
}) {
  const { t } = useLang()
  const [state, dispatch] = useGameReducer()
  const speech = useSpeech()
  const playbackDispatch = usePlaybackDispatch(
    dispatch,
    speech.speak,
    speech.prepare,
    config.language,
  )
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
        <div className="flex items-center justify-between gap-3 px-3 md:px-6 py-2 md:py-3">
          <div
            className="font-heading font-black text-base md:text-xl tracking-[0.2em] md:tracking-[0.3em] shrink-0"
            style={{ color: '#F5EDDB' }}
          >
            {t('app.title')}
          </div>
          <div
            className="flex items-center gap-1.5 md:gap-3 font-mono text-xs md:text-sm min-w-0"
            style={{ color: '#E5DCCA' }}
          >
            {inGame && (
              <>
                <span
                  className="ink-chip shrink-0"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                >
                  <FilmSlate weight="fill" size={12} />
                  R{state.round}
                </span>
                <span
                  className="ink-chip uppercase shrink-0 hidden sm:inline-flex"
                  style={{ background: 'rgba(0,0,0,0.25)' }}
                >
                  {state.phase}
                </span>
                <span
                  className="ink-chip shrink-0"
                  style={{ background: 'rgba(0,0,0,0.25)', color: '#F5EDDB' }}
                >
                  <Users weight="fill" size={12} />
                  {aliveCount}
                </span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-4 shrink-0">
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
                  ? <SpeakerHigh weight="fill" size={20} />
                  : <SpeakerSlash weight="fill" size={20} />}
              </button>
            )}
            <button
              onClick={onExit}
              aria-label="Exit"
              className="transition-colors"
              style={{ color: 'rgba(245,237,219,0.65)' }}
            >
              <XCircle weight="fill" size={20} />
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div
          className="m-3 md:m-6 p-3 md:p-4 rounded-lg text-sm"
          style={{
            background: '#F5D9D5',
            border: '2px solid var(--reigns-red)',
            color: '#6B1C18',
          }}
        >
          <div className="font-bold flex items-center gap-2">
            <Skull weight="fill" size={16} /> {t('game.error_title')}
          </div>
          <div className="mt-1 text-xs">{error}</div>
          <button className="pixel-btn pixel-btn-danger mt-3 text-xs" onClick={onExit}>
            {t('game.back_to_setup')}
          </button>
        </div>
      )}

      {status === 'streaming' && state.players.length === 0 && (
        <div
          className="flex-1 flex items-center justify-center font-mono tracking-widest text-center px-4"
          style={{ color: 'var(--reigns-ink-soft)' }}
        >
          {t('game.dealing')}
        </div>
      )}

      {state.players.length > 0 && (
        <>
          {/* Desktop / tablet: stage on the left, seats on the right. */}
          <div
            className="hidden lg:grid flex-1 min-h-0 grid-cols-[minmax(520px,48%)_1fr] gap-6 px-6 py-6 overflow-x-hidden"
          >
            <div className="min-h-0 overflow-hidden px-5 py-3 flex flex-col">
              <MainStage state={state} />
            </div>
            <div className="min-h-0 overflow-y-auto overflow-x-hidden px-5 py-3">
              <PanelSeats state={state} />
            </div>
          </div>

          {/* Mobile: stage removed. Seats grid fills available space,
              speaking order + reasoning ticker live in a fixed info bar at
              the bottom of the viewport. */}
          <div className="lg:hidden flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 py-3">
              <PanelSeats state={state} />
            </div>
            <MobileInfoBar state={state} />
          </div>
        </>
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
