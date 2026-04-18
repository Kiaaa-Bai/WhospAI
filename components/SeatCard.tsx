'use client'
import { motion } from 'framer-motion'
import { Detective, Shield } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import { providerBg, roleFill, CARD_TEXT } from '@/lib/provider-colors'
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
  const cardFill = roleFill(role)
  const providerOutline = providerBg(player.modelSlug)
  const roleGlow = cardFill   // active ring is the role color

  let bubble: React.ReactNode = null
  if (!eliminated) {
    if (voteTarget) {
      bubble = (
        <ThoughtBubble targetModelSlug={voteTarget} size="sm" fullWidth />
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
    <motion.div layout className="flex flex-col items-center gap-2 w-full relative">
      {/* Bubble slot — fixed so rows line up */}
      <div className="h-20 w-full flex items-end justify-center">{bubble}</div>

      {/* Circular avatar — no background card */}
      <div className="relative">
        <Avatar
          modelSlug={player.modelSlug}
          size={64}
          className={eliminated ? 'grayscale opacity-50' : ''}
        />
        {eliminated && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-4xl"
            style={{ color: 'var(--reigns-red)' }}
          >
            ✕
          </span>
        )}
      </div>

      {/* Desk card — provider-colored outline, role-colored fill */}
      <div
        className="relative w-full rounded-lg px-2.5 py-2.5 flex flex-col gap-1.5 items-center"
        style={{
          background: cardFill,
          border: `4px solid ${providerOutline}`,
          boxShadow:
            isActive
              ? `0 0 0 4px ${roleGlow}, 4px 4px 0 0 var(--reigns-ink)`
              : '4px 4px 0 0 var(--reigns-ink)',
          opacity: eliminated ? 0.55 : 1,
          color: CARD_TEXT,
        }}
      >
        {/* Top-left p-id */}
        <span
          className="absolute -top-2 -left-2 ink-chip"
          style={{ fontSize: 10, padding: '2px 6px' }}
        >
          {player.id.toUpperCase()}
        </span>
        {/* Top-right role icon */}
        <span
          className="absolute -top-2 -right-2 ink-chip"
          style={{ fontSize: 10, padding: '3px 5px' }}
          title={role}
        >
          <RoleIcon weight="fill" size={11} />
        </span>

        <div
          className="text-[10px] font-mono font-bold uppercase tracking-wider truncate w-full text-center"
          style={{ color: CARD_TEXT, opacity: 0.9 }}
        >
          {player.displayName}
        </div>
        <div
          className="text-base font-heading font-black truncate w-full text-center leading-tight"
          style={{ color: CARD_TEXT }}
        >
          {player.word}
        </div>
      </div>
    </motion.div>
  )
}
