'use client'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="flex flex-col items-center gap-4 h-full">
      <div className="h-24 flex items-end">
        {(statement || (state.phase === 'vote' && voteTarget)) && !isNextUp && (
          <ThoughtBubble
            text={statement}
            targetModelSlug={state.phase === 'vote' && voteTarget ? voteTarget.modelSlug as ModelSlug : undefined}
            active={state.currentSpeaker === focus.id && state.phase !== 'vote'}
            size="lg"
          />
        )}
        {isNextUp && (
          <div className="text-xs text-zinc-500 uppercase tracking-wider">
            ↓ next up
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={focus.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="flex flex-col items-center gap-4 w-full"
        >
          <div className={`${state.currentSpeaker === focus.id ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-zinc-950 rounded-full' : ''}`}>
            <Avatar modelSlug={focus.modelSlug} size={140} />
          </div>

          <div className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-center space-y-1">
            <div className="text-sm text-zinc-400">{focus.displayName}</div>
            <div className={`text-4xl font-bold ${roleAccent}`}>{focus.word}</div>

            <div className="mt-3 min-h-[80px] bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-left text-xs text-zinc-400 whitespace-pre-wrap break-words">
              {reasoning || <span className="italic opacity-60">thinking…</span>}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
