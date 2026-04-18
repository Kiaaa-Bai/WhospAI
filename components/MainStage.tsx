'use client'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import { Brain, Shield, Detective } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ThoughtBubble } from './ThoughtBubble'
import type { GameState } from '@/hooks/useGameReducer'
import type { Player, PlayerId, ModelSlug } from '@/lib/game/types'

interface Props {
  state: GameState
}

function nextUpId(state: GameState): PlayerId | null {
  if (!state.order.length) return null
  const spoken = new Set(state.currentStatements.map(s => s.playerId))
  return state.order.find(id => !spoken.has(id)) ?? null
}

function speakingOrder(state: GameState): Player[] {
  // Bucket players: current speaker → not yet spoken (in order) → already spoken → eliminated.
  const eliminated = state.players.filter(p => p.eliminated)
  const aliveIds = state.order.length
    ? state.order
    : state.players.filter(p => !p.eliminated).map(p => p.id)

  const aliveOrdered = aliveIds
    .map(id => state.players.find(p => p.id === id))
    .filter((p): p is Player => !!p && !p.eliminated)

  const spoken = new Set(state.currentStatements.map(s => s.playerId))
  const current = state.currentSpeaker

  const currentP = current ? aliveOrdered.find(p => p.id === current) : null
  const notYet = aliveOrdered.filter(p => p.id !== current && !spoken.has(p.id))
  const already = aliveOrdered.filter(p => p.id !== current && spoken.has(p.id))

  return [
    ...(currentP ? [currentP] : []),
    ...notYet,
    ...already,
    ...eliminated,
  ]
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
  const isVotePhase = state.phase === 'vote' || state.phase === 'tiebreak'
  const showAvatarBubble = !isNextUp && isVotePhase && voteTarget
  const showStatementBubble = !isNextUp && state.phase === 'describe' && statement
  const showEllipsis = !showAvatarBubble && !showStatementBubble
  const order = speakingOrder(state)

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

        <div className="flex-1 min-h-0 overflow-y-auto bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-left text-xl leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">
          {reasoning || (
            <span className="italic text-zinc-500 flex items-center gap-1.5">
              <Brain weight="fill" size={18} /> thinking…
            </span>
          )}
        </div>

        {/* Speaking order strip */}
        <div className="shrink-0 mt-3 pt-3 border-t border-zinc-800">
          <LayoutGroup id="speaking-order">
            <div className="flex items-center justify-center gap-2">
              {order.map(p => {
                const spoken = state.currentStatements.some(s => s.playerId === p.id)
                const isCurrent = state.currentSpeaker === p.id
                const isEliminated = p.eliminated
                return (
                  <motion.div
                    key={p.id}
                    layout
                    transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                    className="relative"
                  >
                    <div
                      className={
                        isCurrent
                          ? 'ring-2 ring-amber-400 ring-offset-2 ring-offset-zinc-950 rounded-full'
                          : ''
                      }
                    >
                      <Avatar
                        modelSlug={p.modelSlug}
                        size={isCurrent ? 36 : 28}
                        className={
                          isEliminated
                            ? 'grayscale opacity-40'
                            : spoken
                              ? 'grayscale opacity-50'
                              : ''
                        }
                      />
                    </div>
                    {isEliminated && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none text-red-500 text-xl font-bold">
                        ✕
                      </span>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </LayoutGroup>
        </div>
      </div>
    </div>
  )
}
