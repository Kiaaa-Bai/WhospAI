'use client'
import { motion } from 'framer-motion'
import { Detective, Shield } from '@phosphor-icons/react'
import { ProviderAvatar } from './ProviderAvatar'
import { ThoughtBubble } from './ThoughtBubble'
import { roleFill, CARD_TEXT } from '@/lib/provider-colors'
import type { Player, ModelSlug } from '@/lib/game/types'

interface Props {
  player: Player
  currentSpeech?: string
  isActive: boolean
  voteTarget?: ModelSlug | null
  phase: string
  /** Number of votes this player has received in the current round. Shown
   *  as a red ×N badge on the avatar disc during vote / tiebreak phases. */
  votesReceived?: number
}

/** Muted warm grey used as card fill when a player is eliminated. Deliberately
 *  drained vs. the saturated green/red so "dead" reads at a glance. */
const ELIMINATED_FILL = '#7A7168'

export function SeatCard({
  player,
  currentSpeech,
  isActive,
  voteTarget,
  phase,
  votesReceived = 0,
}: Props) {
  const eliminated = player.eliminated
  const role = player.role
  const RoleIcon = role === 'undercover' ? Detective : Shield
  const cardFill = eliminated ? ELIMINATED_FILL : roleFill(role)
  // Role-color glow — eliminated seats never glow.
  const glow = isActive && !eliminated ? roleFill(role) : undefined
  const showVoteBadge =
    (phase === 'vote' || phase === 'tiebreak') && !eliminated && votesReceived > 0

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

  const cardShadow = glow
    ? `0 0 0 3px ${glow}, 0 0 12px ${glow}, 4px 4px 0 0 var(--reigns-ink)`
    : '4px 4px 0 0 var(--reigns-ink)'

  return (
    <motion.div
      layout
      className="flex flex-col items-center gap-2 w-full h-full relative"
    >
      {/* Bubble slot — fixed so rows line up */}
      <div className="h-20 w-full flex items-end justify-center">{bubble}</div>

      {/* Avatar inside provider-colored disc. Active speaker gets a role-color
          ring + glow around the disc. Vote phase shows a red ×N badge. */}
      <div className="relative inline-block">
        <ProviderAvatar
          modelSlug={player.modelSlug}
          size={64}
          padding={7}
          outline={3}
          activeGlow={glow}
          dim={eliminated}
        />
        {eliminated && (
          <span
            className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-4xl"
            style={{ color: 'var(--reigns-red)' }}
          >
            ✕
          </span>
        )}
        {showVoteBadge && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full font-mono font-black"
            style={{
              minWidth: 24,
              height: 24,
              padding: '0 6px',
              background: 'var(--reigns-red)',
              color: '#FFFFFF',
              border: '2px solid var(--reigns-ink)',
              fontSize: 11,
              lineHeight: 1,
              boxShadow: '2px 2px 0 0 var(--reigns-ink)',
            }}
          >
            ×{votesReceived}
          </span>
        )}
      </div>

      {/* Desk card — black ink outline, role-colored fill. Active card gets
          a role-color glow shadow. Corner chips sit inside the card edge.
          `flex-1` so all cards stretch to the tallest-in-row's height. */}
      <div
        className="relative w-full flex-1 rounded-lg px-3 pt-4 pb-3 flex flex-col gap-2 items-center"
        style={{
          background: cardFill,
          border: '3px solid var(--reigns-ink)',
          boxShadow: cardShadow,
          opacity: eliminated ? 0.55 : 1,
          color: 'var(--reigns-ink)',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        {/* Top-left p-id — tucked just inside the card */}
        <span
          className="absolute top-1 left-1 ink-chip"
          style={{ fontSize: 10, padding: '2px 6px' }}
        >
          {player.id.toUpperCase()}
        </span>
        {/* Top-right role icon */}
        <span
          className="absolute top-1 right-1 ink-chip"
          style={{ fontSize: 10, padding: '3px 5px' }}
          title={role}
        >
          <RoleIcon weight="fill" size={11} />
        </span>

        <div
          className="text-[10px] font-mono font-bold uppercase tracking-wider w-full text-center mt-3 break-words leading-tight"
          style={{ color: 'var(--reigns-ink)', opacity: 0.75 }}
        >
          {player.displayName}
        </div>

        {/* Keyword nested card — black ink fill with cream text. Wraps
            naturally for long words, never truncates. `mt-auto` pins it to
            the bottom so word cards line up across seats regardless of how
            many lines the model name took. */}
        <div
          className="w-full mt-auto rounded-md px-2 py-1.5"
          style={{
            background: 'var(--reigns-ink)',
            border: '2px solid var(--reigns-ink)',
            boxShadow: '2px 2px 0 0 var(--reigns-ink)',
          }}
        >
          <div
            className="font-heading text-base font-black text-center leading-tight break-words"
            style={{ color: CARD_TEXT }}
          >
            {player.word}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
