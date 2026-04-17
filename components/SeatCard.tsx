'use client'
import { motion } from 'framer-motion'
import { Detective, Shield } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import type { Player, ModelSlug } from '@/lib/game/types'

interface Props {
  player: Player
  currentSpeech?: string
  isActive: boolean
  voteTarget?: ModelSlug | null
  phase: string
}

export function SeatCard({ player, currentSpeech, isActive, voteTarget, phase }: Props) {
  const eliminated = player.eliminated
  const showBubble = currentSpeech || (phase === 'vote' && voteTarget)
  const role = player.role
  const roleAccent = role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
  const RoleIcon = role === 'undercover' ? Detective : Shield
  const roleIconColor = role === 'undercover' ? 'text-red-400' : 'text-emerald-400'

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-2 w-full relative"
    >
      {/* Bubble above head — generous reserved space */}
      <div className="h-24 flex items-end justify-center w-full">
        {showBubble && !eliminated && (
          <ThoughtBubble
            text={currentSpeech}
            targetModelSlug={phase === 'vote' && voteTarget ? voteTarget : undefined}
            active={isActive && phase !== 'vote'}
            size="sm"
          />
        )}
      </div>

      {/* Avatar */}
      <div className={`relative ${isActive ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950 rounded-full' : ''}`}>
        <Avatar modelSlug={player.modelSlug} size={60} className={eliminated ? 'grayscale opacity-40' : ''} />
        {eliminated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-red-500 text-4xl font-bold">✕</span>
          </div>
        )}
      </div>

      {/* Desk: taller, name + word + role icon + p-id badge */}
      <div className={`relative w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 text-center min-h-[110px] flex flex-col justify-between ${eliminated ? 'opacity-40' : ''}`}>
        <span className="absolute top-1.5 left-1.5 text-[10px] font-mono uppercase tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5">
          {player.id}
        </span>
        <div className="text-xs text-zinc-400 truncate pt-3">{player.displayName}</div>
        <div className={`text-xl font-bold truncate my-2 ${roleAccent}`}>{player.word}</div>
        <div className="flex items-center justify-center">
          <RoleIcon weight="fill" size={16} className={roleIconColor} />
        </div>
      </div>
    </motion.div>
  )
}
