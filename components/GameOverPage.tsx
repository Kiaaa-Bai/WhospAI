'use client'
import { motion } from 'framer-motion'
import {
  Trophy, Detective, Shield, Skull, ArrowClockwise, PencilSimple, FilmSlate, Scales,
} from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { providerBg } from '@/lib/provider-colors'
import type { GameResult, GameConfig } from '@/lib/game/types'
import type { GameState } from '@/hooks/useGameReducer'

interface Props {
  result: GameResult
  state: GameState
  config: GameConfig
  onPlayAgain: () => void
}

/**
 * Full-screen end-of-game page. Fits the viewport without scrolling —
 * elimination timeline condenses to a single horizontal row of chips.
 */
export function GameOverPage({ result, state, config, onPlayAgain }: Props) {
  const civiliansWon = result.winner === 'civilians'
  const winnerColor = civiliansWon ? 'var(--reigns-green)' : 'var(--reigns-red)'

  const allPlayers = state.players.length > 0 ? state.players : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 h-screen overflow-hidden flex flex-col"
      style={{ background: 'var(--reigns-bg)', color: 'var(--reigns-ink)' }}
    >
      {/* Winner accent strip */}
      <div className="h-1 w-full shrink-0" style={{ background: winnerColor }} />

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
        className="shrink-0 px-8 py-6 text-center"
        style={{ borderBottom: '3px solid var(--reigns-ink)' }}
      >
        <div
          className="flex items-center justify-center gap-3 mb-2 font-mono font-bold text-xs tracking-[0.4em] uppercase"
          style={{ color: 'var(--reigns-ink-faint)' }}
        >
          <Trophy weight="fill" size={20} style={{ color: 'var(--reigns-gold)' }} />
          Game Over
          <Trophy weight="fill" size={20} style={{ color: 'var(--reigns-gold)' }} />
        </div>
        <div
          className="font-heading font-black tracking-[0.1em] text-5xl md:text-6xl"
          style={{ color: winnerColor }}
        >
          {civiliansWon ? 'CIVILIANS WIN' : 'UNDERCOVER WINS'}
        </div>
        <div
          className="mt-3 flex items-center justify-center gap-5 font-mono text-sm"
          style={{ color: 'var(--reigns-ink-soft)' }}
        >
          <span className="flex items-center gap-1.5">
            <FilmSlate weight="fill" size={14} />
            {result.rounds} {result.rounds === 1 ? 'round' : 'rounds'}
          </span>
          <span className="flex items-center gap-1.5">
            <Shield weight="fill" size={14} style={{ color: 'var(--reigns-green)' }} />
            {config.civilianWord}
          </span>
          <span className="flex items-center gap-1.5">
            <Detective weight="fill" size={14} style={{ color: 'var(--reigns-red)' }} />
            {config.undercoverWord}
          </span>
        </div>
      </motion.div>

      {/* Roster — fills available vertical space */}
      <div className="flex-1 min-h-0 px-8 py-5 flex flex-col">
        <SectionHeader icon={<Detective weight="fill" size={14} />} text="Final Roster" />
        <div className="mt-4 flex-1 grid grid-cols-6 gap-4 min-h-0">
          {allPlayers.map((p, i) => {
            const isWinner =
              (civiliansWon && p.role === 'civilian') ||
              (!civiliansWon && p.role === 'undercover')
            const RoleIcon = p.role === 'undercover' ? Detective : Shield
            const roleColor =
              p.role === 'undercover' ? 'var(--reigns-red)' : 'var(--reigns-green)'

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
                className="relative flex flex-col items-center justify-between gap-2 p-3 rounded-lg"
                style={{
                  background: providerBg(p.modelSlug),
                  border: '3px solid var(--reigns-ink)',
                  boxShadow: isWinner
                    ? '0 0 0 3px var(--reigns-gold), 4px 4px 0 0 var(--reigns-ink)'
                    : '4px 4px 0 0 var(--reigns-ink)',
                  opacity: p.eliminated ? 0.7 : 1,
                }}
              >
                {isWinner && (
                  <span
                    className="absolute -top-3 -right-3 ink-chip"
                    style={{
                      background: 'var(--reigns-gold)',
                      color: 'var(--reigns-ink)',
                      border: '2px solid var(--reigns-ink)',
                      padding: '4px 6px',
                    }}
                  >
                    <Trophy weight="fill" size={12} />
                    WIN
                  </span>
                )}
                <div className="relative">
                  <Avatar
                    modelSlug={p.modelSlug}
                    size={72}
                    className={p.eliminated ? 'grayscale opacity-80' : ''}
                  />
                  {p.eliminated && (
                    <span
                      className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold text-4xl"
                      style={{ color: 'var(--reigns-red)' }}
                    >
                      ✕
                    </span>
                  )}
                </div>
                <div className="ink-chip justify-center w-full" style={{ padding: '4px 8px' }}>
                  <span className="truncate">{p.displayName}</span>
                </div>
                <div
                  className="ink-chip justify-center gap-1.5"
                  style={{
                    padding: '3px 8px',
                    background: roleColor,
                    color: 'var(--reigns-ink)',
                  }}
                >
                  <RoleIcon weight="fill" size={11} />
                  {p.role.toUpperCase()}
                </div>
                <div
                  className="text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{ color: 'var(--reigns-ink)' }}
                >
                  {p.eliminated ? `Out · R${p.eliminatedRound}` : 'Survived'}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Condensed timeline — single horizontal row of chips */}
      <div
        className="shrink-0 px-8 py-4"
        style={{ borderTop: '2px solid var(--reigns-border)' }}
      >
        <SectionHeader icon={<FilmSlate weight="fill" size={14} />} text="Timeline" />
        <div className="mt-2 flex items-center gap-2 overflow-x-auto">
          {state.history.length === 0 ? (
            <div
              className="text-xs font-mono italic"
              style={{ color: 'var(--reigns-ink-faint)' }}
            >
              No eliminations this game
            </div>
          ) : (
            state.history.map((h, i) => {
              if (!h.eliminatedId) {
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.06 }}
                    className="ink-chip shrink-0"
                    style={{ padding: '4px 8px' }}
                  >
                    <Scales weight="fill" size={11} />
                    R{h.round} TIED
                  </motion.div>
                )
              }
              const p = state.players.find(pp => pp.id === h.eliminatedId)
              const color =
                h.role === 'undercover' ? 'var(--reigns-red)' : 'var(--reigns-green)'
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                  className="ink-chip shrink-0"
                  style={{ padding: '4px 10px' }}
                >
                  <FilmSlate weight="fill" size={11} />
                  <span>R{h.round}</span>
                  {p && (
                    <Avatar
                      modelSlug={p.modelSlug}
                      size={16}
                      className="ml-1 rounded-full"
                    />
                  )}
                  <span>{(p?.displayName ?? '').toUpperCase()}</span>
                  <Skull weight="fill" size={11} />
                  <span style={{ color }}>{(h.role ?? '').toUpperCase()}</span>
                </motion.div>
              )
            })
          )}
        </div>
      </div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="shrink-0 px-8 py-5 flex items-center justify-center gap-4 flex-wrap"
        style={{ borderTop: '3px solid var(--reigns-ink)' }}
      >
        <button className="pixel-btn pixel-btn-primary" onClick={onPlayAgain}>
          <ArrowClockwise weight="fill" size={18} />
          PLAY AGAIN
        </button>
        <button className="pixel-btn" onClick={onPlayAgain}>
          <PencilSimple weight="fill" size={18} />
          CHANGE WORDS
        </button>
      </motion.div>
    </motion.div>
  )
}

function SectionHeader({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2" style={{ color: 'var(--reigns-ink-soft)' }}>
      <span style={{ color: 'var(--reigns-ink)' }}>{icon}</span>
      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em]">{text}</span>
      <div className="flex-1 h-0.5 ml-1" style={{ background: 'var(--reigns-border-soft)' }} />
    </div>
  )
}
