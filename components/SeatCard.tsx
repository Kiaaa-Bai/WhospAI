'use client'
import { motion } from 'framer-motion'
import { Detective, Shield } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import { providerBg } from '@/lib/provider-colors'
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
  const role = player.role
  const RoleIcon = role === 'undercover' ? Detective : Shield

  let bubble: React.ReactNode = null
  if (!eliminated) {
    if (voteTarget) {
      bubble = (
        <ThoughtBubble
          targetModelSlug={voteTarget}
          size="sm"
          fullWidth
        />
      )
    } else if (currentSpeech) {
      bubble = (
        <ThoughtBubble
          text={currentSpeech}
          active={isActive && phase !== 'vote'}
          size="sm"
          fullWidth
        />
      )
    }
  }

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-2 w-full relative"
    >
      {/* Bubble slot — fixed height so rows stay aligned. */}
      <div className="h-20 w-full flex items-end justify-center">
        {bubble}
      </div>

      {/* Character card — provider color bg with avatar centered, like Reigns */}
      <div
        className="relative w-full aspect-[4/5] rounded-lg overflow-hidden flex items-center justify-center transition-transform"
        style={{
          background: providerBg(player.modelSlug),
          border: '2px solid var(--reigns-ink)',
          boxShadow: isActive
            ? '0 0 0 3px var(--reigns-gold), 4px 4px 0 0 var(--reigns-ink)'
            : '4px 4px 0 0 var(--reigns-ink)',
          opacity: eliminated ? 0.45 : 1,
          filter: eliminated ? 'grayscale(0.7)' : 'none',
        }}
      >
        {/* Top-left p-id chip */}
        <span
          className="absolute top-1.5 left-1.5 ink-chip"
          style={{ fontSize: 10 }}
        >
          {player.id.toUpperCase()}
        </span>

        {/* Top-right role icon chip */}
        <span
          className="absolute top-1.5 right-1.5 ink-chip"
          style={{ fontSize: 10, padding: '3px 4px' }}
          title={role}
        >
          <RoleIcon weight="fill" size={12} />
        </span>

        {/* Avatar */}
        <Avatar modelSlug={player.modelSlug} size={64} className="drop-shadow-md" />

        {eliminated && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-black"
            style={{ color: 'var(--reigns-red)', fontSize: 60 }}
          >
            ✕
          </span>
        )}

        {/* Bottom dark plaque with word */}
        <div
          className="absolute left-1.5 right-1.5 bottom-1.5 ink-chip justify-center"
          style={{ padding: '4px 8px' }}
        >
          <span className="truncate font-bold uppercase">{player.word}</span>
        </div>
      </div>

      {/* displayName under the card */}
      <div
        className="text-xs font-mono font-bold tracking-wider text-center truncate w-full"
        style={{ color: 'var(--reigns-ink)' }}
      >
        {player.displayName}
      </div>
    </motion.div>
  )
}
