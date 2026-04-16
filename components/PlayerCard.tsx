'use client'
import { motion } from 'framer-motion'
import { WordBadge } from './WordBadge'
import { SpeechBubble } from './SpeechBubble'
import type { Player } from '@/lib/game/types'

interface Props {
  player: Player
  currentSpeech?: string
  isSpeaking: boolean
  isVoting: boolean
  votedFor?: string | null
}

export function PlayerCard({ player, currentSpeech, isSpeaking, isVoting, votedFor }: Props) {
  const eliminated = player.eliminated

  return (
    <motion.div
      layout
      layoutId={player.id}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      className={`
        relative w-44 shrink-0 p-3 rounded-2xl border
        ${eliminated
          ? 'bg-zinc-900/40 border-zinc-800 opacity-50'
          : isSpeaking || isVoting
            ? 'bg-zinc-900 border-amber-500/70 shadow-[0_0_24px_rgba(245,158,11,0.25)]'
            : 'bg-zinc-900 border-zinc-800'}
      `}
    >
      {(isSpeaking || isVoting) && (
        <motion.div
          className="absolute -top-2 left-1/2 -translate-x-1/2 text-xs px-2 py-0.5 rounded-full bg-amber-500 text-zinc-950 font-medium"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {isSpeaking ? 'speaking' : 'voting'}
        </motion.div>
      )}

      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-semibold text-zinc-100">{player.displayName}</div>
          <div className="text-xs text-zinc-500 font-mono">{player.id}</div>
        </div>
      </div>

      <div className="mt-2">
        <WordBadge word={player.word} role={player.role} />
      </div>

      <SpeechBubble text={currentSpeech ?? ''} active={isSpeaking} />

      {votedFor !== undefined && (
        <div className="mt-2 text-xs font-mono">
          {votedFor ? (
            <span className="text-amber-400">voted → {votedFor}</span>
          ) : (
            <span className="text-zinc-600">abstained</span>
          )}
        </div>
      )}

      {eliminated && player.eliminatedRound && (
        <div className="mt-2 text-xs text-zinc-500">Eliminated in R{player.eliminatedRound}</div>
      )}
    </motion.div>
  )
}
