'use client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Brain, Shield, Detective, HourglassMedium, ListNumbers } from '@phosphor-icons/react'
import { ProviderAvatar } from './ProviderAvatar'
import { ThoughtBubble } from './ThoughtBubble'
import { roleFill, CARD_TEXT } from '@/lib/provider-colors'
import { useLang } from '@/lib/i18n'
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
      <div className="flex items-end gap-3">{children}</div>
    </div>
  )
}

type BucketVariant = 'now' | 'next' | 'done' | 'skipped' | 'out'

/**
 * Speaking-order entries are just provider-colored avatar discs — no outer
 * card, no p-id text. NOW is a larger disc with a role-color glow to echo
 * the focus card above.
 */
function BucketDisc({
  player,
  variant,
}: {
  player: Player
  variant: BucketVariant
}) {
  const isNow = variant === 'now'
  const dim = variant === 'out' || variant === 'done' || variant === 'skipped'
  const size = isNow ? 56 : 40
  const padding = isNow ? 7 : 5

  return (
    <motion.div
      layout
      transition={{ type: 'spring', stiffness: 200, damping: 25 }}
      className="relative"
    >
      <ProviderAvatar
        modelSlug={player.modelSlug}
        size={size}
        padding={padding}
        outline={isNow ? 3 : 2}
        dim={dim}
      />
      {variant === 'out' && (
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-3xl"
          style={{ color: 'var(--reigns-red)' }}
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
  const { t } = useLang()
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
        {t('game.dealing_lower')}
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
  const isFocusActive = state.currentSpeaker === focus.id
  const focusGlow = isFocusActive ? focusCardFill : undefined
  const focusCardShadow = focusGlow
    ? `0 0 0 3px ${focusGlow}, 0 0 14px ${focusGlow}, 4px 4px 0 0 var(--reigns-ink)`
    : '4px 4px 0 0 var(--reigns-ink)'

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

      {/* Big round avatar inside a provider-colored disc. Active speaker
          gets a role-color ring + glow around the disc. */}
      <div className="shrink-0 flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 220, damping: 20 }}
          >
            <ProviderAvatar
              modelSlug={focus.modelSlug}
              size={140}
              padding={10}
              outline={4}
              activeGlow={focusGlow}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desk card — black ink outline, role-colored fill. Active card gets
          a role-color glow. */}
      <div
        className="flex-1 min-h-0 w-full rounded-xl p-4 flex flex-col"
        style={{
          background: focusCardFill,
          border: '4px solid var(--reigns-ink)',
          boxShadow: focusCardShadow,
          color: 'var(--reigns-ink)',
          transition: 'box-shadow 0.25s ease',
        }}
      >
        {/* Name + word header */}
        <div className="shrink-0 text-center">
          <div
            className="flex items-center justify-center gap-2 font-mono font-bold tracking-[0.2em] uppercase text-xs"
            style={{ color: 'var(--reigns-ink)', opacity: 0.75 }}
          >
            {focus.role === 'undercover' ? (
              <Detective weight="fill" size={14} />
            ) : (
              <Shield weight="fill" size={14} />
            )}
            {focus.displayName}
          </div>

          {/* Keyword nested card — black ink fill with cream text + offset
              shadow. Wraps naturally for long words, never truncates. */}
          <div
            className="inline-block max-w-full mt-2 rounded-lg px-5 py-2"
            style={{
              background: 'var(--reigns-ink)',
              border: '3px solid var(--reigns-ink)',
              boxShadow: '3px 3px 0 0 var(--reigns-ink)',
            }}
          >
            <div
              className="font-heading text-4xl font-black leading-tight break-words"
              style={{ color: CARD_TEXT }}
            >
              {focus.word}
            </div>
          </div>
        </div>

        {/* Inner Thoughts */}
        <div className="shrink-0 flex flex-col mt-4">
          <div
            className="flex items-center gap-1.5 mb-1.5"
            style={{ color: 'var(--reigns-ink)', opacity: 0.75 }}
          >
            <Brain weight="fill" size={12} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              {t('game.inner_thoughts')}
            </span>
          </div>
          <div
            className="h-[100px] overflow-y-auto rounded-lg p-3 text-left text-sm leading-relaxed whitespace-pre-wrap break-words"
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
                <Brain weight="fill" size={16} /> {t('game.thinking')}
              </span>
            )}
          </div>
        </div>

        {/* Speaking order — provider-disc avatars, no outer card */}
        <div
          className="flex-1 min-h-0 mt-4 pt-3 flex flex-col"
          style={{ borderTop: '2px dashed rgba(42,39,35,0.3)' }}
        >
          <div
            className="flex items-center gap-1.5 mb-2 shrink-0"
            style={{ color: 'var(--reigns-ink)', opacity: 0.75 }}
          >
            <ListNumbers weight="fill" size={12} />
            <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase">
              Speaking Order
            </span>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center px-2 pb-2">
            <LayoutGroup id="speaking-order">
              <div className="flex items-end justify-center gap-5 flex-wrap">
                {buckets.now && (
                  <BucketGroup label="NOW" labelStyle={{ color: 'var(--reigns-gold)' }}>
                    <BucketDisc player={buckets.now} variant="now" />
                  </BucketGroup>
                )}
                {buckets.upNext.length > 0 && (
                  <BucketGroup
                    label="UP NEXT"
                    labelStyle={{ color: 'var(--reigns-ink)' }}
                  >
                    {buckets.upNext.map(p => (
                      <BucketDisc key={p.id} player={p} variant="next" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.done.length > 0 && (
                  <BucketGroup
                    label="DONE"
                    labelStyle={{ color: 'var(--reigns-ink)', opacity: 0.55 }}
                  >
                    {buckets.done.map(p => (
                      <BucketDisc key={p.id} player={p} variant="done" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.skipped.length > 0 && (
                  <BucketGroup label="SKIPPED" labelStyle={{ color: 'var(--reigns-gold)' }}>
                    {buckets.skipped.map(p => (
                      <BucketDisc key={p.id} player={p} variant="skipped" />
                    ))}
                  </BucketGroup>
                )}
                {buckets.out.length > 0 && (
                  <BucketGroup
                    label="OUT"
                    labelStyle={{ color: 'var(--reigns-ink)', opacity: 0.55 }}
                  >
                    {buckets.out.map(p => (
                      <BucketDisc key={p.id} player={p} variant="out" />
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
