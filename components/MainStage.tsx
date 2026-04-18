'use client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Brain, Shield, Detective, HourglassMedium, ListNumbers } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import { providerBg } from '@/lib/provider-colors'
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
    <div className="flex flex-col items-center gap-2.5">
      <div
        className="text-base font-mono font-bold tracking-[0.18em] uppercase"
        style={labelStyle}
      >
        {label}
      </div>
      <div className="flex items-center gap-3">{children}</div>
    </div>
  )
}

type BucketVariant = 'now' | 'next' | 'done' | 'skipped' | 'out'

function BucketAvatar({ player, variant }: { player: Player; variant: BucketVariant }) {
  const size = variant === 'now' ? 80 : 64
  const ringStyle: React.CSSProperties =
    variant === 'now'
      ? {
          boxShadow:
            '0 0 0 3px var(--reigns-gold), 0 0 0 5px var(--reigns-bg-soft)',
          borderRadius: '9999px',
        }
      : {}
  const imgClass =
    variant === 'out' || variant === 'done' || variant === 'skipped'
      ? 'grayscale opacity-60'
      : ''

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="relative"
    >
      <div style={ringStyle}>
        <Avatar modelSlug={player.modelSlug} size={size} className={imgClass} />
      </div>
      {variant === 'out' && (
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none font-bold text-5xl"
          style={{ color: 'var(--reigns-red)' }}
        >
          ✕
        </span>
      )}
      {variant === 'skipped' && (
        <span
          className="absolute -bottom-1 -right-1 rounded-full p-1"
          style={{ background: 'var(--reigns-ink)', border: '2px solid var(--reigns-bg-soft)' }}
        >
          <HourglassMedium weight="fill" size={16} style={{ color: 'var(--reigns-gold)' }} />
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

      {/* Focus card — provider-colored portrait card with word chip */}
      <div className="shrink-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-xl flex items-center justify-center"
            style={{
              background: providerBg(focus.modelSlug),
              border: '3px solid var(--reigns-ink)',
              boxShadow:
                state.currentSpeaker === focus.id
                  ? '0 0 0 4px var(--reigns-gold), 6px 6px 0 0 var(--reigns-ink)'
                  : '6px 6px 0 0 var(--reigns-ink)',
              width: 200,
              height: 200,
            }}
          >
            <Avatar modelSlug={focus.modelSlug} size={130} className="drop-shadow-lg" />
            {/* Word chip pinned to bottom */}
            <span
              className="absolute left-2 right-2 bottom-2 ink-chip justify-center"
              style={{ padding: '6px 10px', fontSize: 13 }}
            >
              <span className="font-bold uppercase tracking-widest">{focus.word}</span>
            </span>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desk — fills remainder. reasoning + speaking order strip */}
      <div
        className="flex-1 min-h-0 w-full rounded-xl p-4 text-center flex flex-col"
        style={{
          background: 'var(--reigns-bg-soft)',
          border: '2px solid var(--reigns-ink)',
          boxShadow: '4px 4px 0 0 var(--reigns-ink)',
        }}
      >
        <div
          className="shrink-0 flex items-center justify-center gap-2 font-mono font-bold tracking-[0.2em] uppercase text-xs"
          style={{ color: 'var(--reigns-ink-soft)' }}
        >
          {focus.role === 'undercover'
            ? <Detective weight="fill" size={14} style={{ color: 'var(--reigns-red)' }} />
            : <Shield weight="fill" size={14} style={{ color: 'var(--reigns-green)' }} />}
          {focus.displayName}
        </div>

        {/* Reasoning — fixed 150px */}
        <div className="shrink-0 flex flex-col mt-3">
          <div className="flex items-center gap-1.5 mb-1.5" style={{ color: 'var(--reigns-ink-soft)' }}>
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

        {/* Speaking order — label + divider + row */}
        <div
          className="flex-1 min-h-0 mt-4 pt-3 flex flex-col"
          style={{ borderTop: '2px solid var(--reigns-border-soft)' }}
        >
          <div className="flex items-center gap-1.5 mb-2 shrink-0" style={{ color: 'var(--reigns-ink-soft)' }}>
            <ListNumbers weight="fill" size={12} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              Speaking Order
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2">
            <LayoutGroup id="speaking-order">
              <div className="flex items-center justify-center gap-8 flex-wrap">
              {buckets.now && (
                <BucketGroup label="NOW" labelStyle={{ color: 'var(--reigns-gold)' }}>
                  {[buckets.now].map(p => (
                    <BucketAvatar key={p.id} player={p} variant="now" />
                  ))}
                </BucketGroup>
              )}
              {buckets.upNext.length > 0 && (
                <BucketGroup label="UP NEXT" labelStyle={{ color: 'var(--reigns-ink)' }}>
                  {buckets.upNext.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="next" />
                  ))}
                </BucketGroup>
              )}
              {buckets.done.length > 0 && (
                <BucketGroup label="DONE" labelStyle={{ color: 'var(--reigns-ink-faint)' }}>
                  {buckets.done.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="done" />
                  ))}
                </BucketGroup>
              )}
              {buckets.skipped.length > 0 && (
                <BucketGroup label="SKIPPED" labelStyle={{ color: 'var(--reigns-gold)' }}>
                  {buckets.skipped.map(p => (
                    <BucketAvatar key={p.id} player={p} variant="skipped" />
                  ))}
                </BucketGroup>
              )}
              {buckets.out.length > 0 && (
                <BucketGroup label="OUT" labelStyle={{ color: 'var(--reigns-red)' }}>
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
    </div>
  )
}
