'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceFor, type Lang as VoiceLang } from '@/lib/voices'
import type { ModelSlug } from '@/lib/game/types'

const STORAGE_KEY = 'whospy:tts-enabled'

/**
 * Retry schedule for TTS fetches. Extended vs. the original [0, 300, 800]
 * so a throttling window that lasts 2–3s can still be ridden out instead
 * of silently dropping the audio for one speaker.
 */
const RETRY_DELAYS = [0, 400, 1200, 2500]

/**
 * Maximum concurrent TTS fetches across the entire app. Edge TTS
 * (`msedge-tts` → Microsoft's WebSocket endpoint) is unreliable at 4+
 * parallel connections from a single client — some of them get silently
 * dropped, which surfaces as "this model had no voice this turn". Capping
 * at 2 lets us preload the next turn's audio without hammering the
 * service. One module-level limiter is shared by every `useSpeech` call.
 */
const MAX_CONCURRENT_TTS = 2

class TtsConcurrencyLimiter {
  private active = 0
  private readonly queue: Array<() => void> = []

  constructor(private readonly max: number) {}

  async acquire(signal?: AbortSignal): Promise<void> {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    if (this.active < this.max) {
      this.active++
      return
    }
    await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        const idx = this.queue.indexOf(grant)
        if (idx >= 0) this.queue.splice(idx, 1)
        reject(new DOMException('Aborted', 'AbortError'))
      }
      const grant = () => {
        if (signal) signal.removeEventListener('abort', onAbort)
        this.active++
        resolve()
      }
      if (signal) signal.addEventListener('abort', onAbort, { once: true })
      this.queue.push(grant)
    })
  }

  release(): void {
    this.active--
    const next = this.queue.shift()
    if (next) next()
  }
}

const ttsLimiter = new TtsConcurrencyLimiter(MAX_CONCURRENT_TTS)

export interface PreparedSpeech {
  play: () => Promise<void>
  cancel: () => void
}

export interface SpeechController {
  supported: boolean
  enabled: boolean
  setEnabled: (on: boolean) => void
  speak: (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang) => Promise<void>
  prepare: (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang) => PreparedSpeech
  cancel: () => void
}

function loadInitialEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return true
    return stored === '1'
  } catch {
    return true
  }
}

async function fetchBlobWithRetry(
  text: string,
  voice: string,
  signal: AbortSignal,
): Promise<Blob | null> {
  const short = text.slice(0, 20).replace(/\s+/g, ' ')
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (signal.aborted) return null
    if (attempt > 0) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
      if (signal.aborted) return null
    }
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice }),
        signal,
      })
      if (res.ok) {
        const blob = await res.blob()
        if (blob.size === 0) {
          console.warn(
            `[tts] empty blob voice=${voice} len=${text.length} attempt=${attempt} "${short}…"`,
          )
          continue
        }
        return blob
      }
      console.warn(
        `[tts] http ${res.status} voice=${voice} len=${text.length} attempt=${attempt} "${short}…"`,
      )
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') return null
      console.warn(
        `[tts] fetch err voice=${voice} len=${text.length} attempt=${attempt} err=${String(err)}`,
      )
    }
  }
  console.error(
    `[tts] give-up voice=${voice} len=${text.length} "${short}…" — all ${RETRY_DELAYS.length} attempts failed`,
  )
  return null
}

/**
 * Web Audio API playback path — avoids the browser <audio> element entirely.
 *
 * We decode the full MP3 blob into an AudioBuffer up-front, then play it
 * through an AudioBufferSourceNode. This bypasses the streaming buffer
 * underruns that cause the "click / glitch / dropped syllable" artifacts
 * you get from Audio.src + blob URL.
 */
type AudioContextWindow = Window & {
  AudioContext?: typeof AudioContext
  webkitAudioContext?: typeof AudioContext
}

function isWebAudioSupported(): boolean {
  if (typeof window === 'undefined') return false
  const w = window as AudioContextWindow
  return typeof w.AudioContext !== 'undefined' || typeof w.webkitAudioContext !== 'undefined'
}

function createAudioContext(): AudioContext {
  const w = window as AudioContextWindow
  const Ctor = w.AudioContext ?? w.webkitAudioContext
  if (!Ctor) throw new Error('Web Audio API not supported')
  return new Ctor()
}

/**
 * Module-level shared AudioContext.
 *
 * iOS WebKit (Safari + any iOS browser, including Chrome) requires the
 * AudioContext to be created AND resumed inside the synchronous call stack
 * of a user gesture. If we create it later — e.g. on the first TTS preload
 * — `ctx.resume()` silently stays suspended forever, and every subsequent
 * `source.start()` schedules audio that never plays.
 *
 * Solution: expose `unlockAudioContext()` as a plain export so any user
 * gesture handler (the Start button on SetupScreen) can prime the context
 * inside its click stack. The hook then reuses the same singleton.
 */
let sharedAudioContext: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!isWebAudioSupported()) return null
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = createAudioContext()
    } catch {
      return null
    }
  }
  return sharedAudioContext
}

/**
 * Call this from inside a user-gesture handler (e.g. onClick) BEFORE the
 * first TTS preload happens. On iOS this is the only way to make audio
 * playback actually work during the game. No-op if audio is already
 * running or Web Audio is unsupported.
 */
export function unlockAudioContext(): void {
  const ctx = getSharedAudioContext()
  if (!ctx) return
  // resume() must be called inside the gesture stack to succeed on iOS.
  // We don't await — awaiting would push later operations out of the
  // gesture. Fire-and-forget is fine; the prime buffer below also helps.
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => { /* noop */ })
  }
  // Play a tiny silent buffer to fully unlock the audio system. On some
  // iOS versions resume() alone is not enough — the first actual playback
  // has to happen inside the gesture for the context to stay running.
  try {
    const buffer = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    src.start(0)
  } catch {
    /* noop */
  }
}

export function useSpeech(): SpeechController {
  const supported = isWebAudioSupported()
  const [enabled, setEnabledState] = useState<boolean>(loadInitialEnabled)
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const getContext = useCallback((): AudioContext | null => {
    if (!supported) return null
    return getSharedAudioContext()
  }, [supported])

  const stopCurrent = useCallback(() => {
    const src = currentSourceRef.current
    if (src) {
      try { src.stop() } catch { /* may already be stopped */ }
      try { src.disconnect() } catch { /* noop */ }
      currentSourceRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    stopCurrent()
  }, [stopCurrent])

  useEffect(() => {
    return () => {
      // Don't close the shared AudioContext on unmount — if we did, the
      // user would need another gesture to unlock it next game. Just stop
      // the currently-playing source.
      stopCurrent()
    }
  }, [stopCurrent])

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch { /* noop */ }
    if (!on) stopCurrent()
  }, [stopCurrent])

  const prepare = useCallback(
    (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang): PreparedSpeech => {
      const noop: PreparedSpeech = {
        play: () => Promise.resolve(),
        cancel: () => {},
      }
      if (!supported || !text.trim()) return noop

      const voice = voiceFor(modelSlug, text, gameLanguage)
      const ctrl = new AbortController()
      let cancelled = false

      // Gate fetch+decode behind the shared concurrency limiter so at most
      // MAX_CONCURRENT_TTS requests are in flight to Edge TTS at once. If
      // we exceed that, the upload waits here instead of blasting the
      // service and getting throttled into silent failure.
      const bufferPromise: Promise<AudioBuffer | null> = (async () => {
        try {
          await ttsLimiter.acquire(ctrl.signal)
        } catch {
          return null
        }
        try {
          if (cancelled) return null
          const blob = await fetchBlobWithRetry(text, voice, ctrl.signal)
          if (cancelled || !blob) return null
          const ctx = getContext()
          if (!ctx) return null
          try {
            const arrayBuffer = await blob.arrayBuffer()
            // decodeAudioData detaches the array buffer; pass a copy to be
            // safe across browsers that complain.
            return await ctx.decodeAudioData(arrayBuffer.slice(0))
          } catch {
            return null
          }
        } finally {
          ttsLimiter.release()
        }
      })()

      return {
        cancel: () => {
          cancelled = true
          try { ctrl.abort() } catch { /* noop */ }
        },
        play: async () => {
          if (cancelled) return
          if (!enabledRef.current) {
            // Still wait briefly so playback pacing isn't broken when user
            // toggles TTS off mid-game.
            return
          }
          let buffer: AudioBuffer | null
          try {
            buffer = await bufferPromise
          } catch {
            buffer = null
          }
          if (cancelled || !enabledRef.current) return
          if (!buffer) {
            const fallbackMs = Math.min(6000, Math.max(1500, text.length * 60))
            await new Promise(resolve => setTimeout(resolve, fallbackMs))
            return
          }

          const ctx = getContext()
          if (!ctx) return
          if (ctx.state === 'suspended') {
            // iOS WebKit can leave resume() pending forever when no user
            // gesture is on the stack. Race it with a short timeout so the
            // playback queue never hangs — worst case we try to start the
            // source while suspended and move on via the onended timeout.
            await Promise.race([
              ctx.resume().catch(() => {}),
              new Promise<void>(resolve => setTimeout(resolve, 500)),
            ])
          }

          // Stop any currently playing source before starting a new one.
          stopCurrent()

          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          currentSourceRef.current = source

          return new Promise<void>(resolve => {
            let settled = false
            // Hard timeout: if onended never fires (suspended context, iOS
            // quirks, mid-play page visibility changes), fall back to the
            // buffer's own duration + 500ms slack so the game advances.
            const timeoutMs = Math.ceil((buffer.duration + 0.5) * 1000)
            const settle = () => {
              if (settled) return
              settled = true
              clearTimeout(timer)
              if (currentSourceRef.current === source) {
                currentSourceRef.current = null
              }
              try { source.disconnect() } catch { /* noop */ }
              resolve()
            }
            const timer = setTimeout(settle, timeoutMs)
            source.onended = settle
            try {
              source.start(0)
            } catch {
              settle()
            }
          })
        },
      }
    },
    [supported, getContext, stopCurrent],
  )

  const speak = useCallback(
    (text: string, modelSlug: ModelSlug, gameLanguage?: VoiceLang): Promise<void> =>
      prepare(text, modelSlug, gameLanguage).play(),
    [prepare],
  )

  return { supported, enabled, setEnabled, speak, prepare, cancel }
}
