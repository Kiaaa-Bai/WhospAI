'use client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Brain, Shield, Detective, HourglassMedium } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import type { GameState } from '@/hooks/useGameReducer'
import type { Player, PlayerId, ModelSlug } from '@/lib/game/types'

function BucketGroup({
  label,
  labelClass,
  children,
}: {
  label: string
  labelClass: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div className={`text-base font-bold tracking-[0.18em] uppercase ${labelClass}`}>
        {label}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  )
}

type BucketVariant = 'now' | 'next' | 'done' | 'skipped' | 'out'

function BucketAvatar({ player, variant }: { player: Player; variant: BucketVariant }) {
  const size = variant === 'now' ? 80 : 64
  const ringClass = variant === 'now'
    ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950 rounded-full'
    : ''
  const imgClass =
    variant === 'out' || variant === 'done' || variant === 'skipped'
      ? 'grayscale opacity-50'
      : ''

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="relative"
    >
      <div className={ringClass}>
        <Avatar modelSlug={player.modelSlug} size={size} className={imgClass} />
      </div>
      {variant === 'out' && (
        <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 text-5xl font-bold">
          ✕
        </span>
      )}
      {variant === 'skipped' && (
        <span className="absolute -bottom-1 -right-1 bg-zinc-900 rounded-full p-1 border border-zinc-700">
          <HourglassMedium weight="fill" size={16} className="text-amber-500 block" />
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

  // Skipped players DON'T appear in DONE; they get their own bucket.
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

  const focus: Player | undefined = focusId ? state.players.find(p => p.id === focusId) : undefined

  if (!focus) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
        Dealing the words…
      </div>
    )
  }

  const myVote = state.currentRoundVotes[focus.id]
  const voteTarget = myVote ? state.players.find(p => p.id === myVote) : null
  const roleAccent = focus.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
  const reasoning = state.reasoningByPlayer[focus.id] ?? ''
  const statement = state.currentSpeech[focus.id] ?? ''

  // Bubble content selection — bubble is always visible.
  // - voteTarget present (any phase) → avatar
  // - currentSpeech present → statement text
  // - else → ellipsis (always-on placeholder)
  // This handles tiebreak naturally: tied players keep their tiebreak
  // statement bubble, voters get avatar after voting, others ellipsis.
  const showAvatarBubble = !isNextUp && !!voteTarget
  const showStatementBubble = !isNextUp && !voteTarget && !!statement
  const showEllipsis = !showAvatarBubble && !showStatementBubble
  const buckets = speakingBuckets(state)

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Bubble area — fixed 240px, always present, anchored to top */}
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

      {/* Avatar */}
      <div className="shrink-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${state.currentSpeaker === focus.id ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-zinc-950 rounded-full' : ''}`}
          >
            <Avatar modelSlug={focus.modelSlug} size={150} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desk — fills remainder. reasoning + speaking order strip */}
      <div className="flex-1 min-h-0 w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center flex flex-col">
        <div className="shrink-0 flex items-center justify-center gap-2 text-sm text-zinc-400">
          {focus.role === 'undercover'
            ? <Detective weight="fill" size={16} className="text-red-400" />
            : <Shield weight="fill" size={16} className="text-emerald-400" />}
          {focus.displayName}
        </div>
        <div className={`shrink-0 text-3xl font-bold mb-3 ${roleAccent}`}>{focus.word}</div>

        {/* Reasoning — fixed 200px so the layout below is stable. */}
        <div className="shrink-0 h-[200px] overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left text-base leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">
          {reasoning || (
            <span className="italic text-zinc-500 flex items-center gap-1.5">
              <Brain weight="fill" size={16} /> thinking…
            </span>
          )}
        </div>

        {/* Speaking order — borderless, divider line on top, large
            centered row spanning the desk's width. */}
        <div className="flex-1 min-h-0 mt-4 pt-4 border-t border-zinc-800 flex items-center justify-center overflow-y-auto">
          <LayoutGroup id="speaking-order">
            <div className="flex items-end justify-center gap-8 flex-wrap">
              {buckets.now && (
                <BucketGroup label="NOW" labelClass="text-amber-400">
                  {[buckets.now].map(p => (
                    <BucketAvatar key={p.id} player={p} variant="now" />
                  ))}
                </BucketGroup>
              )}
              {buckets.upNext.length > 0 && (
                <BucketGroup label="UP NEXT" labelClass="text-zinc-300">
                  {buckets.upNext.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="next" />
                  ))}
                </BucketGroup>
              )}
              {buckets.done.length > 0 && (
                <BucketGroup label="DONE" labelClass="text-zinc-500">
                  {buckets.done.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="done" />
                  ))}
                </BucketGroup>
              )}
              {buckets.skipped.length > 0 && (
                <BucketGroup label="SKIPPED" labelClass="text-amber-500">
                  {buckets.skipped.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="skipped" />
                  ))}
                </BucketGroup>
              )}
              {buckets.out.length > 0 && (
                <BucketGroup label="OUT" labelClass="text-red-400">
                  {buckets.out.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="out" />
                  ))}
                </BucketGroup>
              )}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  )
}
