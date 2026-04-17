'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { SkipForward, Brain, Shield, Detective } from '@phosphor-icons/react'
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Bubble area — 40% of flexible space, bubble anchored to bottom (near avatar) */}
      <div className="flex items-end justify-center min-h-0" style={{ flex: '4 1 0%' }}>
        {!isNextUp && state.phase === 'describe' && statement && (
          <ThoughtBubble
            text={statement}
            active={state.currentSpeaker === focus.id}
            size="xl"
            fullWidth
          />
        )}
        {!isNextUp && (state.phase === 'vote' || state.phase === 'tiebreak') && voteTarget && (
          <ThoughtBubble
            targetModelSlug={voteTarget.modelSlug as ModelSlug}
            size="xl"
            fullWidth
          />
        )}
        {isNextUp && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 uppercase tracking-wider pb-2">
            <SkipForward weight="fill" size={14} />
            next up
          </div>
        )}
      </div>

      {/* Avatar — fixed height */}
      <div className="shrink-0 flex items-center justify-center my-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={focus.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`${state.currentSpeaker === focus.id ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-zinc-950 rounded-full' : ''}`}
          >
            <Avatar modelSlug={focus.modelSlug} size={160} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Desk — 60% of flexible space, reasoning fills remainder */}
      <div
        className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-center flex flex-col min-h-0"
        style={{ flex: '6 1 0%' }}
      >
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
      </div>
    </div>
  )
}
