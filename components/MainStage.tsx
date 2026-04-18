'use client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Brain, Shield, Detective, HourglassMedium, ListNumbers } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import { providerBg, roleFill, CARD_TEXT } from '@/lib/provider-colors'
import type { GameState } from '@/hooks/useGameReducer'
import type { Player, PlayerId, ModelSlug } from '@/lib/game/types'

function BucketGroup({
  label,
  labelStyle,
  children,
}: {
  label: string
  labelStyle?: React.CSSProperties
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="text-xs font-mono font-bold tracking-[0.18em] uppercase"
        style={labelStyle}
      >
        {label}
      </div>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  )
}

type BucketVariant = 'now' | 'next' | 'done' | 'skipped' | 'out'

/**
 * Mini-card version of a seat — used in the speaking-order strip instead of
 * a bare round avatar. Follows the same provider-outline + role-fill rule.
 */
function BucketCard({
  player,
  variant,
}: {
  player: Player
  variant: BucketVariant
}) {
  const isNow = variant === 'now'
  const dim = variant === 'out' || variant === 'done' || variant === 'skipped'

  const providerOutline = providerBg(player.modelSlug)
  const cardFill = roleFill(player.role)
  const roleGlow = cardFill

  const size = isNow ? 76 : 56
  const avatarSize = isNow ? 48 : 36

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="relative rounded-lg flex flex-col items-center justify-center"
      style={{
        width: size,
        height: size + 18,
        background: cardFill,
        border: `3px solid ${providerOutline}`,
        boxShadow: isNow
          ? `0 0 0 3px ${roleGlow}, 3px 3px 0 0 var(--reigns-ink)`
          : '3px 3px 0 0 var(--reigns-ink)',
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Avatar
        modelSlug={player.modelSlug}
        size={avatarSize}
        className={dim ? 'grayscale' : ''}
      />
      <div
        className="text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5"
        style={{ color: CARD_TEXT }}
      >
        {player.id}
      </div>
      {variant === 'out' && (
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-4xl"
          style={{ color: 'var(--reigns-ink)' }}
        >
          ✕
        </span>
      )}
      {variant === 'skipped' && (
        <span
          className="absolute -top-1.5 -right-1.5 rounded-full p-0.5"
          style={{
            background: 'var(--reigns-ink)',
            border: '2px solid var(--reigns-bg-soft)',
          }}
        >
          <HourglassMedium weight="fill" size={12} style={{ color: 'var(--reigns-gold)' }} />
        </span>
      )}
    </motion.div>
  )
}

interface Props {
  state: GameState
}

function nextUpId(state: GameState): PlayerId | null {
  if (!state.order.length) return null
  const spoken = new Set(state.currentStatements.map(s => s.playerId))
  return state.order.find(id => !spoken.has(id)) ?? null
}

interface SpeakingBuckets {
  now: Player | null
  upNext: Player[]
  done: Player[]
  skipped: Player[]
  out: Player[]
}

function speakingBuckets(state: GameState): SpeakingBuckets {
  const eliminated = state.players.filter(p => p.eliminated)
  const aliveIds = state.order.length
    ? state.order
    : state.players.filter(p => !p.eliminated).map(p => p.id)

  const aliveOrdered = aliveIds
    .map(id => state.players.find(p => p.id === id))
    .filter((p): p is Player => !!p && !p.eliminated)

  const isVotePhase = state.phase === 'vote' || state.phase === 'tiebreak'
  const handledIds = isVotePhase
    ? new Set(Object.keys(state.currentRoundVotes))
    : new Set(state.currentStatements.map(s => s.playerId))
  const skippedIds = new Set(state.currentSkipped)
  const current = state.currentSpeaker

  return {
    now: current ? aliveOrdered.find(p => p.id === current) ?? null : null,
    upNext: aliveOrdered.filter(
      p => p.id !== current && !handledIds.has(p.id) && !skippedIds.has(p.id),
    ),
    done: aliveOrdered.filter(
      p => p.id !== current && handledIds.has(p.id) && !skippedIds.has(p.id),
    ),
    skipped: aliveOrdered.filter(p => p.id !== current && skippedIds.has(p.id)),
    out: eliminated,
  }
}

export function MainStage({ state }: Props) {
  const alive = state.players.filter(p => !p.eliminated)
  let focusId: PlayerId | null = state.currentSpeaker
  let isNextUp = false

  if (!focusId) {
    focusId = nextUpId(state) ?? state.order[0] ?? alive[0]?.id ?? null
    isNextUp = true
  }

  const focus: Player | undefined = focusId
    ? state.players.find(p => p.id === focusId)
    : undefined

  if (!focus) {
    return (
      <div className="h-full flex items-center justify-center text-sm" style={{ color: 'var(--reigns-ink-soft)' }}>
        Dealing the words…
      </div>
    )
  }

  const myVote = state.currentRoundVotes[focus.id]
  const voteTarget = myVote ? state.players.find(p => p.id === myVote) : null
  const reasoning = state.reasoningByPlayer[focus.id] ?? ''
  const statement = state.currentSpeech[focus.id] ?? ''

  const showAvatarBubble = !isNextUp && !!voteTarget
  const showStatementBubble = !isNextUp && !voteTarget && !!statement
  const showEllipsis = !showAvatarBubble && !showStatementBubble
  const buckets = speakingBuckets(state)

  const focusCardFill = roleFill(focus.role)
  const focusProviderOutline = providerBg(focus.modelSlug)
  const focusRoleGlow = focusCardFill
  const isFocusActive = state.currentSpeaker === focus.id

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Speech bubble */}
      <div className="shrink-0 w-full flex items-start justify-center">
        <ThoughtBubble
          text={showStatementBubble ? statement : undefined}
          targetModelSlug={showAvatarBubble ? (voteTarget!.modelSlug as ModelSlug) : undefined}
          ellipsis={showEllipsis}
          active={!!showStatementBubble && state.currentSpeaker === focus.id}
          size="xl"
          fullWidth
        />
      </div>

      {/* Circular avatar — no background card */}
      <div className="shrink-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <Avatar modelSlug={focus.modelSlug} size={150} className="drop-shadow-lg" />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desk card — provider outline, role fill. Contains name + word,
          inner thoughts, and speaking-order strip. */}
      <div
        className="flex-1 min-h-0 w-full rounded-xl p-4 flex flex-col"
        style={{
          background: focusCardFill,
          border: `4px solid ${focusProviderOutline}`,
          boxShadow: isFocusActive
            ? `0 0 0 4px ${focusRoleGlow}, 4px 4px 0 0 var(--reigns-ink)`
            : '4px 4px 0 0 var(--reigns-ink)',
          color: CARD_TEXT,
        }}
      >
        {/* Name + word header */}
        <div className="shrink-0 text-center">
          <div
            className="flex items-center justify-center gap-2 font-mono font-bold tracking-[0.2em] uppercase text-xs"
            style={{ color: CARD_TEXT, opacity: 0.85 }}
          >
            {focus.role === 'undercover' ? (
              <Detective weight="fill" size={14} />
            ) : (
              <Shield weight="fill" size={14} />
            )}
            {focus.displayName}
          </div>
          <div
            className="font-heading text-3xl font-black mt-1"
            style={{ color: CARD_TEXT }}
          >
            {focus.word}
          </div>
        </div>

        {/* Inner Thoughts */}
        <div className="shrink-0 flex flex-col mt-3">
          <div
            className="flex items-center gap-1.5 mb-1.5"
            style={{ color: CARD_TEXT, opacity: 0.75 }}
          >
            <Brain weight="fill" size={12} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              Inner Thoughts
            </span>
          </div>
          <div
            className="h-[150px] overflow-y-auto rounded-lg p-4 text-left text-base leading-relaxed whitespace-pre-wrap break-words"
            style={{
              background: '#FAF2DF',
              border: '2px solid var(--reigns-ink)',
              color: 'var(--reigns-ink)',
            }}
          >
            {reasoning || (
              <span
                className="italic flex items-center gap-1.5"
                style={{ color: 'var(--reigns-ink-faint)' }}
              >
                <Brain weight="fill" size={16} /> thinking…
              </span>
            )}
          </div>
        </div>

        {/* Speaking order — mini cards */}
        <div
          className="flex-1 min-h-0 mt-4 pt-3 flex flex-col"
          style={{ borderTop: `2px solid ${CARD_TEXT}`, borderTopStyle: 'dashed', borderColor: 'rgba(245,237,219,0.35)' }}
        >
          <div
            className="flex items-center gap-1.5 mb-2 shrink-0"
            style={{ color: CARD_TEXT, opacity: 0.75 }}
          >
            <ListNumbers weight="fill" size={12} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              Speaking Order
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2">
            <LayoutGroup id="speaking-order">
              <div className="flex items-center justify-center gap-5 flex-wrap">
                {buckets.now && (
                  <BucketGroup label="NOW" labelStyle={{ color: 'var(--reigns-gold)' }}>
                    <BucketCard player={buckets.now} variant="now" />
                  </BucketGroup>
                )}
                {buckets.upNext.length > 0 && (
                  <BucketGroup label="UP NEXT" labelStyle={{ color: CARD_TEXT }}>
                    {buckets.upNext.map(p => (
                      <BucketCard key={p.id} player={p} variant="next" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.done.length > 0 && (
                  <BucketGroup
                    label="DONE"
                    labelStyle={{ color: CARD_TEXT, opacity: 0.6 }}
                  >
                    {buckets.done.map(p => (
                      <BucketCard key={p.id} player={p} variant="done" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.skipped.length > 0 && (
                  <BucketGroup label="SKIPPED" labelStyle={{ color: 'var(--reigns-gold)' }}>
                    {buckets.skipped.map(p => (
                      <BucketCard key={p.id} player={p} variant="skipped" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.out.length > 0 && (
                  <BucketGroup
                    label="OUT"
                    labelStyle={{ color: CARD_TEXT, opacity: 0.6 }}
                  >
                    {buckets.out.map(p => (
                      <BucketCard key={p.id} player={p} variant="out" />
                    ))}
                  </BucketGroup>
                )}
              </div>
            </LayoutGroup>
          </div>
        </div>
      </div>
    </div>
  )
}
