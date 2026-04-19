'use client'
import { useCallback, useEffect, useRef } from 'react'
import type { GameEvent, GameLanguage, ModelSlug, Player, PlayerId } from '@/lib/game/types'
import type { PreparedSpeech } from './useSpeech'
import { detectTextLanguage, voteAnnouncementText, type Lang as VoiceLang } from '@/lib/voices'

const REASONING_MS_PER_CHAR = 40    // 25 chars/s
const STATEMENT_MS_PER_CHAR = 40    // 25 chars/s
const PAUSE_BETWEEN_MS = 500
const POST_TURN_LINGER_MS = 3000
const ERROR_FLASH_MS = 150

// Overlay timing — must match PhaseOverlay / useOverlayTrigger.
const OVERLAY_CURTAIN_DOWN_UP_MS = 400
const OVERLAY_ITEM_HOLD_MS = 1500
const OVERLAY_CROSSFADE_MS = 400

const OVERLAY_TRIGGERS = new Set([
  'game-start',
  'round-start',
  'phase',
  'elimination',
  'no-elimination',
])

function overlayBatchDuration(n: number): number {
  if (n <= 0) return 0
  return (
    OVERLAY_CURTAIN_DOWN_UP_MS +
    n * OVERLAY_ITEM_HOLD_MS +
    Math.max(0, n - 1) * OVERLAY_CROSSFADE_MS +
    OVERLAY_CURTAIN_DOWN_UP_MS
  )
}

interface TurnItem {
  kind: 'turn'
  playerId: PlayerId
  phase: 'describe' | 'vote'
  startEvent: GameEvent
  think: string
  speak: string
  voteTargetId: PlayerId | null
  end: GameEvent | null
  // Preloaded TTS audio. Kicked off as soon as the turn's end event arrives
  // so the fetch overlaps with whichever turn is currently animating.
  thinkSpeech: PreparedSpeech | null
  speakSpeech: PreparedSpeech | null
  voteAnnouncementSpeech: PreparedSpeech | null
}

interface PassItem {
  kind: 'pass'
  event: GameEvent
}

type QueueItem = TurnItem | PassItem

type SpeakFn = (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang) => Promise<void>
type PrepareFn = (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang) => PreparedSpeech

/**
 * Fallback voter-word → VoiceLang when no game language is passed
 * (legacy call path / tests). Character-based detection only.
 */
function fallbackLang(word: string): VoiceLang {
  return detectTextLanguage(word)
}

export function usePlaybackDispatch(
  dispatch: (e: GameEvent) => void,
  speak?: SpeakFn,
  prepare?: PrepareFn,
  gameLanguage?: GameLanguage,
): (e: GameEvent) => void {
  const queueRef = useRef<QueueItem[]>([])
  const runningRef = useRef(false)
  const abortedRef = useRef(false)
  const slugsRef = useRef<Map<PlayerId, ModelSlug>>(new Map())
  const playersRef = useRef<Map<PlayerId, Player>>(new Map())
  // Refs so the stable `drain` closure reaches the latest callbacks.
  const speakRef = useRef<SpeakFn | undefined>(speak)
  const prepareRef = useRef<PrepareFn | undefined>(prepare)
  const langRef = useRef<GameLanguage | undefined>(gameLanguage)
  useEffect(() => { speakRef.current = speak }, [speak])
  useEffect(() => { prepareRef.current = prepare }, [prepare])
  useEffect(() => { langRef.current = gameLanguage }, [gameLanguage])

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
      // Cancel any pending prepared audio to avoid leaking fetches.
      for (const item of queueRef.current) {
        if (item.kind !== 'turn') continue
        item.thinkSpeech?.cancel()
        item.speakSpeech?.cancel()
        item.voteAnnouncementSpeech?.cancel()
      }
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

  /** Fallback when no preloaded speech handle exists. */
  const speakTextNow = useCallback(
    (text: string, playerId: PlayerId): Promise<void> => {
      const fn = speakRef.current
      const slug = slugsRef.current.get(playerId)
      if (!fn || !slug || !text) return Promise.resolve()
      return fn(text, slug, langRef.current)
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
          if (OVERLAY_TRIGGERS.has(item.event.type)) {
            // Greedily consume any subsequent overlay-trigger events into the
            // batch. Also pull in `round-order` (not itself an overlay
            // trigger) so the speaking order is set in state BEFORE the
            // round-start overlay renders.
            let count = 1
            while (true) {
              const next = queueRef.current[0]
              if (!next || next.kind !== 'pass') break
              const isOverlay = OVERLAY_TRIGGERS.has(next.event.type)
              const isOrder = next.event.type === 'round-order'
              if (!isOverlay && !isOrder) break
              queueRef.current.shift()
              dispatch(next.event)
              if (isOverlay) count++
            }
            await sleep(overlayBatchDuration(count))
            if (abortedRef.current) return
          }
          continue
        }

        // Turn: wait for end event to arrive before animating.
        if (!item.end) break

        // Failed vote / describe: skip animation + TTS entirely.
        if (item.end.type === 'speak-error'
            || item.think.startsWith('(failed:')
            || item.speak.startsWith('(failed:')) {
          // Cancel any audio we preloaded for this turn.
          item.thinkSpeech?.cancel()
          item.speakSpeech?.cancel()
          item.voteAnnouncementSpeech?.cancel()
          dispatch(item.startEvent)
          await sleep(ERROR_FLASH_MS)
          if (abortedRef.current) return
          dispatch(item.end)
          queueRef.current.shift()
          continue
        }

        dispatch(item.startEvent)

        // Reasoning / summary: typewriter + preloaded TTS in parallel.
        const thinkPlay = item.thinkSpeech
          ? item.thinkSpeech.play()
          : speakTextNow(item.think, item.playerId)
        await Promise.all([
          animateChars(item.think, item.playerId, 'think-token', REASONING_MS_PER_CHAR),
          thinkPlay,
        ])
        if (abortedRef.current) return

        await sleep(PAUSE_BETWEEN_MS)
        if (abortedRef.current) return

        if (item.phase === 'describe') {
          const speakPlay = item.speakSpeech
            ? item.speakSpeech.play()
            : speakTextNow(item.speak, item.playerId)
          await Promise.all([
            animateChars(item.speak, item.playerId, 'speak-token', STATEMENT_MS_PER_CHAR),
            speakPlay,
          ])
          if (abortedRef.current) return
        }

        // Commit end state (currentRoundVotes populated, statements appended)
        // before the linger so the UI shows the final snapshot during dwell.
        dispatch(item.end)

        if (item.phase === 'vote') {
          const announce = item.voteAnnouncementSpeech
          if (announce) {
            await announce.play()
            if (abortedRef.current) return
          }
        }

        await sleep(POST_TURN_LINGER_MS)
        if (abortedRef.current) return

        queueRef.current.shift()
      }
    } finally {
      runningRef.current = false
    }
  }, [dispatch, animateChars, speakTextNow])

  const preloadTurn = (turn: TurnItem) => {
    const prep = prepareRef.current
    const slug = slugsRef.current.get(turn.playerId)
    if (!prep || !slug) return
    const lang: VoiceLang = langRef.current ?? (
      turn.think ? fallbackLang(turn.think) : 'en'
    )
    if (turn.think) {
      turn.thinkSpeech = prep(turn.think, slug, lang)
    }
    if (turn.phase === 'describe' && turn.speak) {
      turn.speakSpeech = prep(turn.speak, slug, lang)
    }
    if (turn.phase === 'vote' && turn.voteTargetId) {
      const voter = playersRef.current.get(turn.playerId)
      const target = playersRef.current.get(turn.voteTargetId)
      if (voter && target) {
        // Vote announcement lang: prefer the game-wide language, fall back to
        // inferring from the voter's word (handles legacy / test cases).
        const voteLang: VoiceLang = langRef.current ?? fallbackLang(voter.word)
        const line = voteAnnouncementText(target.displayName, voteLang)
        turn.voteAnnouncementSpeech = prep(line, slug, voteLang)
      }
    }
  }

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
          slugsRef.current = new Map(e.players.map(p => [p.id, p.modelSlug]))
          playersRef.current = new Map(e.players.map(p => [p.id, p]))
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
            voteTargetId: null,
            end: null,
            thinkSpeech: null,
            speakSpeech: null,
            voteAnnouncementSpeech: null,
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
            voteTargetId: null,
            end: null,
            thinkSpeech: null,
            speakSpeech: null,
            voteAnnouncementSpeech: null,
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
          if (turn) {
            turn.end = e
            preloadTurn(turn)
          }
          break
        }
        case 'vote-cast': {
          const turn = findOpenTurn(e.vote.voterId)
          if (turn) {
            turn.think = e.vote.reasoning
            turn.voteTargetId = e.vote.targetId
            turn.end = e
            preloadTurn(turn)
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
