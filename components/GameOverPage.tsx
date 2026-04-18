'use client'
import { motion } from 'framer-motion'
import {
  Trophy, Detective, Shield, Skull, ArrowClockwise, PencilSimple,
  FilmSlate, Scales,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Avatar } from './Avatar'
import type { GameResult, GameConfig } from '@/lib/game/types'
import type { GameState } from '@/hooks/useGameReducer'
import { ROSTER } from '@/lib/game/roster'

interface Props {
  result: GameResult
  state: GameState
  config: GameConfig
  onPlayAgain: () => void
}

export function GameOverPage({ result, state, config, onPlayAgain }: Props) {
  const civiliansWon = result.winner === 'civilians'
  const winnerColor = civiliansWon ? 'text-emerald-300' : 'text-red-300'
  const winnerBg = civiliansWon
    ? 'from-emerald-950/40 via-zinc-950 to-zinc-950'
    : 'from-red-950/40 via-zinc-950 to-zinc-950'

  const displayName = (slug: string) =>
    ROSTER.find(r => r.modelSlug === slug)?.displayName ?? slug

  const allPlayers = state.players.length > 0 ? state.players : []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`fixed inset-0 z-50 bg-gradient-to-b ${winnerBg} text-zinc-100 overflow-y-auto`}
    >
      <div className="min-h-full flex flex-col">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="shrink-0 border-b border-zinc-800 px-8 py-10 text-center"
        >
          <div className="flex items-center justify-center gap-3 mb-3 text-amber-400">
            <Trophy weight="fill" size={28} />
            <span className="text-xs font-bold tracking-[0.4em] uppercase text-zinc-500">
              Game Over
            </span>
            <Trophy weight="fill" size={28} />
          </div>
          <div className={`text-6xl md:text-7xl font-black tracking-[0.1em] ${winnerColor}`}>
            {civiliansWon ? 'CIVILIANS WIN' : 'UNDERCOVER WINS'}
          </div>
          <div className="mt-4 text-sm text-zinc-500 flex items-center justify-center gap-5">
            <span className="flex items-center gap-1.5">
              <FilmSlate weight="fill" size={14} />
              {result.rounds} {result.rounds === 1 ? 'round' : 'rounds'}
            </span>
            <span className="flex items-center gap-1.5">
              <Shield weight="fill" size={14} className="text-emerald-400" />
              {config.civilianWord}
            </span>
            <span className="flex items-center gap-1.5">
              <Detective weight="fill" size={14} className="text-red-400" />
              {config.undercoverWord}
            </span>
          </div>
        </motion.div>

        {/* Roster */}
        <div className="px-8 py-8 border-b border-zinc-800">
          <SectionHeader icon={<Detective weight="fill" size={14} />} text="Final Roster" />
          <div className="mt-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {allPlayers.map((p, i) => {
              const isWinner =
                (civiliansWon && p.role === 'civilian') ||
                (!civiliansWon && p.role === 'undercover')
              const RoleIcon = p.role === 'undercover' ? Detective : Shield
              const roleColor = p.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'

              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
                  className={`
                    relative flex flex-col items-center gap-3 p-4 rounded-xl border transition-colors
                    ${isWinner
                      ? 'bg-amber-500/5 border-amber-500/40 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                      : 'bg-zinc-900 border-zinc-800'}
                    ${p.eliminated ? 'opacity-70' : ''}
                  `}
                >
                  {isWinner && (
                    <span className="absolute top-2 right-2 text-amber-400">
                      <Trophy weight="fill" size={14} />
                    </span>
                  )}
                  <div className="relative">
                    <Avatar
                      modelSlug={p.modelSlug}
                      size={72}
                      className={p.eliminated ? 'grayscale opacity-80' : ''}
                    />
                    {p.eliminated && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 text-4xl font-bold">
                        ✕
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-center">{p.displayName}</div>
                  <div className="flex items-center gap-1.5">
                    <RoleIcon weight="fill" size={12} className={roleColor} />
                    <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${roleColor}`}>
                      {p.role}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                    {p.eliminated ? `Out · R${p.eliminatedRound}` : 'Survived'}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="px-8 py-8 flex-1 min-h-0">
          <SectionHeader
            icon={<FilmSlate weight="fill" size={14} />}
            text="How It Unfolded"
          />
          <div className="mt-5 space-y-2.5 max-w-3xl mx-auto">
            {state.history.length === 0 ? (
              <div className="text-sm text-zinc-600 italic text-center py-6">
                No eliminations happened this game.
              </div>
            ) : (
              state.history.map((h, i) => {
                if (!h.eliminatedId) {
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                    >
                      <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded">
                        <Scales weight="fill" size={10} />
                        R{h.round}
                      </div>
                      <div className="text-sm text-zinc-400">
                        Tied · no elimination
                      </div>
                    </motion.div>
                  )
                }
                const p = state.players.find(pp => pp.id === h.eliminatedId)
                const color = h.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800"
                  >
                    <div className="shrink-0 flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-950 border border-zinc-800 px-2 py-1 rounded">
                      <FilmSlate weight="fill" size={10} />
                      R{h.round}
                    </div>
                    {p && <Avatar modelSlug={p.modelSlug} size={32} className="shrink-0" />}
                    <div className="flex-1 text-sm">
                      <span className="text-zinc-100 font-semibold">
                        {p?.displayName ?? h.eliminatedId}
                      </span>
                      <span className="text-zinc-500 mx-2">eliminated</span>
                    </div>
                    <Skull weight="fill" size={16} className="text-zinc-600 shrink-0" />
                    <span className={`text-[11px] font-bold tracking-[0.15em] uppercase ${color}`}>
                      {h.role}
                    </span>
                  </motion.div>
                )
              })
            )}
          </div>
        </div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="shrink-0 px-8 py-8 border-t border-zinc-800 flex items-center justify-center gap-4 flex-wrap"
        >
          <Button
            className="h-14 px-8 text-base tracking-[0.2em] font-bold"
            size="lg"
            onClick={onPlayAgain}
          >
            <ArrowClockwise weight="fill" size={18} className="mr-2" />
            PLAY AGAIN
          </Button>
          <Button
            className="h-14 px-8 text-base tracking-[0.2em] font-bold"
            variant="outline"
            size="lg"
            onClick={onPlayAgain}
          >
            <PencilSimple weight="fill" size={18} className="mr-2" />
            CHANGE WORDS
          </Button>
        </motion.div>
      </div>
    </motion.div>
  )
}

function SectionHeader({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-500">
      <span className="text-zinc-400">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em]">{text}</span>
      <div className="flex-1 h-px bg-zinc-800 ml-1" />
    </div>
  )
}
