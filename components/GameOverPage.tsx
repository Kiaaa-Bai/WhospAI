'use client'
import { motion } from 'framer-motion'
import {
  Trophy, Detective, Shield, Skull, ArrowClockwise, PencilSimple, FilmSlate, Scales,
} from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ProviderAvatar } from './ProviderAvatar'
import { roleFill, CARD_TEXT } from '@/lib/provider-colors'
import { useLang } from '@/lib/i18n'
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
  const { t } = useLang()
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
        className="shrink-0 px-6 md:px-8 py-4 md:py-6 text-center"
        style={{ borderBottom: '3px solid var(--reigns-ink)' }}
      >
        <div
          className="flex items-center justify-center gap-3 mb-2 font-mono font-bold text-[10px] md:text-xs tracking-[0.3em] md:tracking-[0.4em] uppercase"
          style={{ color: 'var(--reigns-ink-faint)' }}
        >
          <Trophy weight="fill" size={18} style={{ color: 'var(--reigns-gold)' }} />
          {t('end.game_over')}
          <Trophy weight="fill" size={18} style={{ color: 'var(--reigns-gold)' }} />
        </div>
        <div
          className="font-heading font-black tracking-[0.1em] text-3xl md:text-6xl"
          style={{ color: winnerColor }}
        >
          {civiliansWon ? t('end.civilians_win') : t('end.undercover_wins')}
        </div>
        <div
          className="mt-2 md:mt-3 flex flex-wrap items-center justify-center gap-3 md:gap-5 font-mono text-xs md:text-sm"
          style={{ color: 'var(--reigns-ink-soft)' }}
        >
          <span className="flex items-center gap-1.5">
            <FilmSlate weight="fill" size={14} />
            {t(result.rounds === 1 ? 'end.round' : 'end.rounds', { n: result.rounds })}
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

      {/* Roster — fills available vertical space. Extra horizontal padding
          + internal grid padding so 4px offset shadows + winner chip
          offsets aren't clipped at the container edges. */}
      <div className="flex-1 min-h-0 px-4 md:px-10 py-3 md:py-5 flex flex-col overflow-hidden">
        <SectionHeader
          icon={<Detective weight="fill" size={14} />}
          text={t('end.final_roster')}
        />
        <div className="mt-3 md:mt-4 flex-1 grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-4 min-h-0 px-1 py-1">
          {allPlayers.map((p, i) => {
            const isWinner =
              (civiliansWon && p.role === 'civilian') ||
              (!civiliansWon && p.role === 'undercover')
            const RoleIcon = p.role === 'undercover' ? Detective : Shield
            const cardFill = roleFill(p.role)

            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05, duration: 0.3 }}
                className="relative flex flex-col items-center justify-between gap-2 p-3 rounded-lg"
                style={{
                  background: cardFill,
                  border: '3px solid var(--reigns-ink)',
                  boxShadow: '4px 4px 0 0 var(--reigns-ink)',
                  opacity: p.eliminated ? 0.7 : 1,
                  color: 'var(--reigns-ink)',
                }}
              >
                {isWinner && (
                  <span
                    className="absolute top-1 right-1 ink-chip"
                    style={{
                      background: 'var(--reigns-gold)',
                      color: 'var(--reigns-ink)',
                      border: '2px solid var(--reigns-ink)',
                      padding: '3px 6px',
                      fontSize: 10,
                    }}
                  >
                    <Trophy weight="fill" size={11} />
                    {t('end.win')}
                  </span>
                )}
                <div className="relative">
                  <ProviderAvatar
                    modelSlug={p.modelSlug}
                    size={64}
                    padding={7}
                    outline={3}
                    dim={p.eliminated}
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
                <div
                  className="flex items-center justify-center gap-1.5 text-[11px] font-mono font-bold uppercase tracking-wider w-full text-center leading-tight break-words"
                  style={{ color: 'var(--reigns-ink)', opacity: 0.8 }}
                >
                  <RoleIcon weight="fill" size={11} />
                  <span className="break-words">{p.displayName}</span>
                </div>

                {/* Keyword nested card — black ink fill with cream text,
                    wraps naturally so long words are never truncated. */}
                <div
                  className="w-full rounded-md px-2 py-1.5"
                  style={{
                    background: 'var(--reigns-ink)',
                    border: '2px solid var(--reigns-ink)',
                    boxShadow: '2px 2px 0 0 var(--reigns-ink)',
                  }}
                >
                  <div
                    className="font-heading text-base font-black w-full text-center leading-tight break-words"
                    style={{ color: CARD_TEXT }}
                  >
                    {p.word}
                  </div>
                </div>

                <div
                  className="text-[10px] font-mono font-bold uppercase tracking-wider"
                  style={{ color: 'var(--reigns-ink)', opacity: 0.7 }}
                >
                  {p.eliminated
                    ? t('end.out_round', { n: p.eliminatedRound ?? 0 })
                    : t('end.survived')}
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Condensed timeline — single horizontal row of chips (hidden on
          mobile to keep the game-over page to a single no-scroll view). */}
      <div
        className="shrink-0 px-8 py-4 hidden md:block"
        style={{ borderTop: '2px solid var(--reigns-border)' }}
      >
        <SectionHeader icon={<FilmSlate weight="fill" size={14} />} text={t('end.timeline')} />
        <div className="mt-2 flex items-center gap-2 overflow-x-auto">
          {state.history.length === 0 ? (
            <div
              className="text-xs font-mono italic"
              style={{ color: 'var(--reigns-ink-faint)' }}
            >
              {t('end.no_elims')}
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
                    {t('end.round_tied', { n: h.round })}
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
        className="shrink-0 px-4 md:px-8 py-3 md:py-5 flex items-center justify-center gap-3 md:gap-4 flex-wrap"
        style={{ borderTop: '3px solid var(--reigns-ink)' }}
      >
        <button
          className="pixel-btn pixel-btn-primary text-xs md:text-sm"
          onClick={onPlayAgain}
        >
          <ArrowClockwise weight="fill" size={18} />
          {t('end.play_again')}
        </button>
        <button className="pixel-btn text-xs md:text-sm" onClick={onPlayAgain}>
          <PencilSimple weight="fill" size={18} />
          {t('end.change_words')}
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
