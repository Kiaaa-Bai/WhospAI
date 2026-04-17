'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { GameEvent, ModelSlug, PlayerId } from '@/lib/game/types'

/**
 * Animation pacing for "human-like" playback.
 * Server events are buffered per-turn and replayed at these speeds,
 * decoupling the user-visible pace from the LLM generation pace.
 */
const REASONING_MS_PER_CHAR = 40    // 25 chars/s
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

type SpeakFn = (text: string, modelSlug: ModelSlug) => Promise<void>

/**
 * Wraps a dispatch function so that speak/vote events play at a steady,
 * human-readable pace (typewriter), independent of server generation speed.
 *
 * - Non-turn events (round-start, phase, elimination, game-over…) pass through
 *   in order, but only after any preceding turn's animation has completed.
 * - Turn events are buffered; once a turn completes on the server, the client
 *   animates it: reasoning → 500ms pause → statement → 3s linger → end event.
 * - If a `speak` callback is provided, summary and statement text are played
 *   aloud via TTS IN PARALLEL with the typewriter. Each phase waits for BOTH
 *   the typewriter and the TTS to finish before proceeding.
 * - game-start events are intercepted to cache the playerId→modelSlug mapping
 *   so TTS can pick the right voice without a separate lookup path.
 */
export function usePlaybackDispatch(
  dispatch: (e: GameEvent) => void,
  speak?: SpeakFn,
): (e: GameEvent) => void {
  const queueRef = useRef<QueueItem[]>([])
  const runningRef = useRef(false)
  const abortedRef = useRef(false)
  const slugsRef = useRef<Map<PlayerId, ModelSlug>>(new Map())
  // Keep `speak` in a ref so the stable `drain` closure always calls the
  // latest callback (which captures the latest enabled/voices state).
  const speakRef = useRef<SpeakFn | undefined>(speak)
  useEffect(() => { speakRef.current = speak }, [speak])

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
    }
  }, [])

  const sleep = (ms: number) =>
    new Promise<void>(resolve => setTimeout(resolve, ms))

  const animateChars = useCallback(
    async (
      text: string,
      playerId: PlayerId,
      eventType: 'think-token' | 'speak-token',
      msPerChar: number,
    ) => {
      for (let i = 0; i < text.length; i++) {
        if (abortedRef.current) return
        dispatch({ type: eventType, playerId, delta: text[i] })
        await sleep(msPerChar)
      }
    },
    [dispatch],
  )

  const speakText = useCallback(
    (text: string, playerId: PlayerId): Promise<void> => {
      const fn = speakRef.current
      const slug = slugsRef.current.get(playerId)
      if (!fn || !slug || !text) return Promise.resolve()
      return fn(text, slug)
    },
    [],
  )

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

        // Normal path: start → (reasoning + voice) → pause → (statement + voice)
        //   → linger → end.
        dispatch(item.startEvent)

        await Promise.all([
          animateChars(item.think, item.playerId, 'think-token', REASONING_MS_PER_CHAR),
          speakText(item.think, item.playerId),
        ])
        if (abortedRef.current) return

        await sleep(PAUSE_BETWEEN_MS)
        if (abortedRef.current) return

        if (item.phase === 'describe') {
          await Promise.all([
            animateChars(item.speak, item.playerId, 'speak-token', STATEMENT_MS_PER_CHAR),
            speakText(item.speak, item.playerId),
          ])
          if (abortedRef.current) return
        }

        await sleep(POST_TURN_LINGER_MS)
        if (abortedRef.current) return

        dispatch(item.end)
        queueRef.current.shift()
      }
    } finally {
      runningRef.current = false
    }
  }, [dispatch, animateChars, speakText])

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
        case 'game-start': {
          // Cache model slugs so TTS can resolve voices by playerId.
          slugsRef.current = new Map(e.players.map(p => [p.id, p.modelSlug]))
          queue.push({ kind: 'pass', event: e })
          break
        }
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
