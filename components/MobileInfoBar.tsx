'use client'
import { useLayoutEffect, useRef } from 'react'
import { Brain, ListNumbers, HourglassMedium } from '@phosphor-icons/react'
import { LayoutGroup, motion } from 'framer-motion'
import { ProviderAvatar } from './ProviderAvatar'
import { useLang } from '@/lib/i18n'
import { roleFill } from '@/lib/provider-colors'
import type { GameState } from '@/hooks/useGameReducer'
import type { Player, PlayerId } from '@/lib/game/types'

interface Buckets {
  now: Player | null
  upNext: Player[]
  done: Player[]
  skipped: Player[]
  out: Player[]
}

function buildBuckets(state: GameState): Buckets {
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
  const current: PlayerId | null = state.currentSpeaker

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

/**
 * Mobile-only info strip sitting below the seat grid. Shows:
 *   row 1 — speaking-order mini discs (NOW / UP NEXT / DONE / SKIPPED / OUT)
 *   row 2 — single-line scrolling ticker with current speaker's reasoning
 * No scrolling, fixed height, always fits one row of seats above.
 */
export function MobileInfoBar({ state }: { state: GameState }) {
  const { t } = useLang()
  const buckets = buildBuckets(state)
  const focusId = state.currentSpeaker ?? buckets.now?.id ?? null
  const focus = focusId ? state.players.find(p => p.id === focusId) : null
  const reasoning = focus ? state.reasoningByPlayer[focus.id] ?? '' : ''
  const thinkingPlaceholder = t('game.thinking')

  return (
    <div
      className="lg:hidden shrink-0 border-t flex flex-col"
      style={{
        background: 'var(--reigns-bg-soft)',
        borderTopColor: 'var(--reigns-ink)',
        borderTopWidth: 3,
      }}
    >
      {/* Speaking order row */}
      <div className="px-3 py-2 flex items-center gap-2 overflow-x-auto">
        <ListNumbers weight="fill" size={12} style={{ color: 'var(--reigns-ink-soft)' }} />
        <LayoutGroup id="mobile-speaking-order">
          <div className="flex items-center gap-1.5">
            {buckets.now && <MiniDisc player={buckets.now} variant="now" />}
            {buckets.upNext.map(p => (
              <MiniDisc key={p.id} player={p} variant="next" />
            ))}
            {buckets.done.map(p => (
              <MiniDisc key={p.id} player={p} variant="done" />
            ))}
            {buckets.skipped.map(p => (
              <MiniDisc key={p.id} player={p} variant="skipped" />
            ))}
            {buckets.out.map(p => (
              <MiniDisc key={p.id} player={p} variant="out" />
            ))}
          </div>
        </LayoutGroup>
      </div>

      {/* Reasoning row — typewriter-style: new characters appear on the right
          as they stream in, and once the text overflows the container it
          smoothly scrolls left at a fixed speed to keep the newest chars
          visible. No looping. */}
      <div
        className="px-3 py-2 flex items-center gap-2 border-t"
        style={{ borderTopColor: 'var(--reigns-border-soft)' }}
      >
        <Brain weight="fill" size={12} style={{ color: 'var(--reigns-ink-soft)' }} />
        <div className="flex-1 min-w-0 overflow-hidden relative h-5">
          {reasoning ? (
            <StreamingTicker key={focus?.id ?? 'none'} text={reasoning} />
          ) : (
            <span
              className="italic text-xs font-mono"
              style={{ color: 'var(--reigns-ink-faint)' }}
            >
              {thinkingPlaceholder}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

function MiniDisc({
  player,
  variant,
}: {
  player: Player
  variant: 'now' | 'next' | 'done' | 'skipped' | 'out'
}) {
  const isNow = variant === 'now'
  const dim = variant === 'out' || variant === 'done' || variant === 'skipped'
  const size = isNow ? 34 : 26

  return (
    <motion.div layout transition={{ type: 'spring', stiffness: 220, damping: 25 }} className="relative shrink-0">
      <ProviderAvatar
        modelSlug={player.modelSlug}
        size={size}
        padding={3}
        outline={2}
        shadow={false}
        activeGlow={isNow ? roleFill(player.role) : undefined}
        dim={dim}
      />
      {variant === 'out' && (
        <span
          className="absolute inset-0 flex items-center justify-center pointer-events-none font-black text-xl"
          style={{ color: 'var(--reigns-red)' }}
        >
          ✕
        </span>
      )}
      {variant === 'skipped' && (
        <span
          className="absolute -top-1 -right-1 rounded-full p-0.5"
          style={{ background: 'var(--reigns-ink)' }}
        >
          <HourglassMedium weight="fill" size={8} style={{ color: 'var(--reigns-gold)' }} />
        </span>
      )}
    </motion.div>
  )
}

/** Scroll speed (pixels per second) used once the text overflows the
 *  container. Tuned so incoming characters feel unhurried but still keep
 *  up with the LLM stream. */
const SCROLL_PX_PER_SEC = 60

/**
 * One-pass streaming ticker. The text lives in a single span; as its
 * `scrollWidth` exceeds the container width we translate the span left by
 * exactly the overflow amount, animated at a fixed px/s. The result reads
 * as "new chars appear on the right; once we run out of room, older text
 * slides off to the left at a steady pace". No looping — when the stream
 * ends the last characters are left pinned to the right edge.
 *
 * Resetting for a new speaker is handled by the `key` prop on the caller.
 */
function StreamingTicker({ text }: { text: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const textRef = useRef<HTMLSpanElement | null>(null)
  const prevOverflowRef = useRef(0)

  useLayoutEffect(() => {
    const container = containerRef.current
    const textEl = textRef.current
    if (!container || !textEl) return

    const tw = textEl.scrollWidth
    const cw = container.clientWidth
    const overflow = Math.max(0, tw - cw)
    const delta = Math.abs(overflow - prevOverflowRef.current)
    const duration = delta > 0 ? delta / SCROLL_PX_PER_SEC : 0

    textEl.style.transition = duration > 0 ? `transform ${duration}s linear` : 'none'
    textEl.style.transform = `translateX(${-overflow}px)`
    prevOverflowRef.current = overflow
  }, [text])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <span
        ref={textRef}
        className="block whitespace-nowrap text-xs font-mono leading-5"
        style={{
          color: 'var(--reigns-ink)',
          willChange: 'transform',
          transform: 'translateX(0)',
        }}
      >
        {text}
      </span>
    </div>
  )
}
