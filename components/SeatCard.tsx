'use client'
import { motion } from 'framer-motion'
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

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-2 w-full relative"
    >
      {/* Bubble above head */}
      <div className="min-h-12 flex items-end">
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
        <Avatar modelSlug={player.modelSlug} size={56} className={eliminated ? 'grayscale opacity-40' : ''} />
        {eliminated && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-red-500 text-4xl font-bold">✕</span>
          </div>
        )}
      </div>

      {/* Desk: name + word — bigger */}
      <div className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-center ${eliminated ? 'opacity-40' : ''}`}>
        <div className="text-xs text-zinc-400 truncate">{player.displayName}</div>
        <div className={`text-lg font-bold truncate ${roleAccent}`}>{player.word}</div>
      </div>
    </motion.div>
  )
}
