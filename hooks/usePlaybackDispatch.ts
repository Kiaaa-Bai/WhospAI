'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { GameEvent, PlayerId } from '@/lib/game/types'

/**
 * Animation pacing for "human-like" playback.
 * Server events are buffered per-turn and replayed at these speeds,
 * decoupling the user-visible pace from the LLM generation pace.
 */
const REASONING_MS_PER_CHAR = 40    // 25 chars/s (unified with statement)
const STATEMENT_MS_PER_CHAR = 40    // 25 chars/s
const PAUSE_BETWEEN_MS = 500
const POST_TURN_LINGER_MS = 3000    // linger on speaker after they finish
const ERROR_FLASH_MS = 150

interface TurnItem {
  kind: 'turn'
  playerId: PlayerId
  phase: 'describe' | 'vote'
  startEvent: GameEvent
  think: string
  speak: string
  end: GameEvent | null
}

interface PassItem {
  kind: 'pass'
  event: GameEvent
}

type QueueItem = TurnItem | PassItem

/**
 * Wraps a dispatch function so that speak/vote events play at a steady,
 * human-readable pace (typewriter), independent of server generation speed.
 *
 * - Non-turn events (round-start, phase, elimination, game-over…) pass through
 *   in order, but only after any preceding turn's animation has completed.
 * - Turn events (speak-start → think-tokens → speak-tokens → speak-end) are
 *   buffered. Once the turn completes on the server, the client animates it:
 *     1. reasoning tokens at REASONING_MS_PER_CHAR
 *     2. pause PAUSE_BETWEEN_MS
 *     3. (describe only) statement tokens at STATEMENT_MS_PER_CHAR
 *     4. dispatch the final speak-end/vote-cast
 * - If multiple turns complete on the server while the first animates,
 *   they queue and play in order.
 */
export function usePlaybackDispatch(
  dispatch: (e: GameEvent) => void,
): (e: GameEvent) => void {
  const queueRef = useRef<QueueItem[]>([])
  const runningRef = useRef(false)
  const abortedRef = useRef(false)

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
    }
  }, [])

  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms))

  const drain = useCallback(async () => {
    if (runningRef.current) return
    runningRef.current = true
    try {
      while (!abortedRef.current) {
        const item = queueRef.current[0]
        if (!item) break

        if (item.kind === 'pass') {
          queueRef.current.shift()
          dispatch(item.event)
          continue
        }

        // Turn: wait for end event to arrive before animating.
        if (!item.end) break

        // Error path: brief flash, no text animation.
        if (item.end.type === 'speak-error') {
          dispatch(item.startEvent)
          await sleep(ERROR_FLASH_MS)
          if (abortedRef.current) return
          dispatch(item.end)
          queueRef.current.shift()
          continue
        }

        // Normal path: start → reasoning → pause → statement → end.
        dispatch(item.startEvent)

        for (let i = 0; i < item.think.length; i++) {
          if (abortedRef.current) return
          dispatch({
            type: 'think-token',
            playerId: item.playerId,
            delta: item.think[i],
          })
          await sleep(REASONING_MS_PER_CHAR)
        }

        await sleep(PAUSE_BETWEEN_MS)
        if (abortedRef.current) return

        if (item.phase === 'describe') {
          for (let i = 0; i < item.speak.length; i++) {
            if (abortedRef.current) return
            dispatch({
              type: 'speak-token',
              playerId: item.playerId,
              delta: item.speak[i],
            })
            await sleep(STATEMENT_MS_PER_CHAR)
          }
        }

        // Linger on the speaker so viewers can read the full output before
        // the focus jumps to the next model. Keep currentSpeaker set during
        // this pause by delaying the speak-end / vote-cast dispatch.
        await sleep(POST_TURN_LINGER_MS)
        if (abortedRef.current) return

        dispatch(item.end)
        queueRef.current.shift()
      }
    } finally {
      runningRef.current = false
    }
  }, [dispatch])

  return useCallback(
    (e: GameEvent) => {
      const queue = queueRef.current
      const findOpenTurn = (playerId: PlayerId) => {
        for (let i = queue.length - 1; i >= 0; i--) {
          const it = queue[i]
          if (it.kind === 'turn' && it.playerId === playerId && !it.end) return it
        }
        return null
      }

      switch (e.type) {
        case 'speak-start':
          queue.push({
            kind: 'turn',
            playerId: e.playerId,
            phase: 'describe',
            startEvent: e,
            think: '',
            speak: '',
            end: null,
          })
          break
        case 'vote-start':
          queue.push({
            kind: 'turn',
            playerId: e.playerId,
            phase: 'vote',
            startEvent: e,
            think: '',
            speak: '',
            end: null,
          })
          break
        case 'think-token': {
          const turn = findOpenTurn(e.playerId)
          if (turn) turn.think += e.delta
          break
        }
        case 'speak-token': {
          const turn = findOpenTurn(e.playerId)
          if (turn) turn.speak += e.delta
          break
        }
        case 'speak-end': {
          const turn = findOpenTurn(e.statement.playerId)
          if (turn) turn.end = e
          break
        }
        case 'vote-cast': {
          const turn = findOpenTurn(e.vote.voterId)
          if (turn) {
            // Vote reasoning is delivered atomically in vote.reasoning — inject
            // it as the think content so the animation can type it out.
            turn.think = e.vote.reasoning
            turn.end = e
          }
          break
        }
        case 'speak-error': {
          const turn = findOpenTurn(e.playerId)
          if (turn) turn.end = e
          else queue.push({ kind: 'pass', event: e })
          break
        }
        default:
          queue.push({ kind: 'pass', event: e })
      }
      drain()
    },
    [drain],
  )
}
