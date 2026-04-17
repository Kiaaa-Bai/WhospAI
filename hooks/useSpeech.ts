'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceFor } from '@/lib/voices'
import type { ModelSlug } from '@/lib/game/types'

const STORAGE_KEY = 'whospy:tts-enabled'
const RETRY_DELAYS = [0, 300, 800] // up to 3 attempts (first immediate)

export interface PreparedSpeech {
  /** Start playback. Resolves when the audio finishes (or times out). */
  play: () => Promise<void>
  /** Abort fetch/playback. */
  cancel: () => void
}

export interface SpeechController {
  supported: boolean
  enabled: boolean
  setEnabled: (on: boolean) => void
  /** Speak immediately. Shortcut for `prepare(...).play()`. */
  speak: (text: string, modelSlug: ModelSlug) => Promise<void>
  /**
   * Pre-load audio in the background. The returned handle's `play()` uses
   * the pre-loaded blob (if ready) or waits for the fetch to finish.
   * This lets callers kick off TTS fetches ahead of the moment they want
   * playback, overlapping network latency with other work.
   */
  prepare: (text: string, modelSlug: ModelSlug) => PreparedSpeech
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
      if (res.ok) return await res.blob()
    } catch {
      /* try again */
    }
  }
  return null
}

export function useSpeech(): SpeechController {
  const supported = typeof window !== 'undefined' && 'Audio' in window
  const [enabled, setEnabledState] = useState<boolean>(loadInitialEnabled)
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (audioRef.current) {
      try { audioRef.current.pause() } catch { /* noop */ }
      audioRef.current.src = ''
      audioRef.current = null
    }
    if (urlRef.current) {
      try { URL.revokeObjectURL(urlRef.current) } catch { /* noop */ }
      urlRef.current = null
    }
  }, [])

  const cancel = useCallback(() => cleanup(), [cleanup])

  useEffect(() => {
    return () => cleanup()
  }, [cleanup])

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch { /* noop */ }
    if (!on) cleanup()
  }, [cleanup])

  const prepare = useCallback(
    (text: string, modelSlug: ModelSlug): PreparedSpeech => {
      const noop: PreparedSpeech = {
        play: () => Promise.resolve(),
        cancel: () => {},
      }
      if (!supported || !text.trim()) return noop

      const voice = voiceFor(modelSlug, text)
      const ctrl = new AbortController()
      // Kick off the fetch immediately so it can overlap with whatever is
      // currently playing. If TTS gets disabled before play() is called,
      // the blob is just discarded.
      const blobPromise = fetchBlobWithRetry(text, voice, ctrl.signal)
      let cancelled = false

      return {
        cancel: () => {
          cancelled = true
          try { ctrl.abort() } catch { /* noop */ }
        },
        play: async () => {
          if (cancelled) return
          if (!enabledRef.current) {
            // User disabled TTS — still wait out the fetch / return quickly.
            return
          }
          let blob: Blob | null
          try {
            blob = await blobPromise
          } catch {
            blob = null
          }
          if (cancelled || !enabledRef.current) return
          if (!blob) {
            // All retries failed — hold the turn for a duration proportional
            // to text length so the pacing isn't broken.
            const fallbackMs = Math.min(6000, Math.max(1500, text.length * 60))
            await new Promise(resolve => setTimeout(resolve, fallbackMs))
            return
          }

          cleanup()
          const url = URL.createObjectURL(blob)
          urlRef.current = url
          const audio = new Audio(url)
          audio.volume = 1
          audioRef.current = audio

          return new Promise<void>(resolve => {
            let settled = false
            const done = () => {
              if (settled) return
              settled = true
              if (audioRef.current === audio) audioRef.current = null
              if (urlRef.current === url) {
                try { URL.revokeObjectURL(url) } catch { /* noop */ }
                urlRef.current = null
              }
              resolve()
            }
            audio.onended = done
            audio.onerror = done
            audio.play().catch(done)
          })
        },
      }
    },
    [supported, cleanup],
  )

  const speak = useCallback(
    (text: string, modelSlug: ModelSlug): Promise<void> => {
      const prepared = prepare(text, modelSlug)
      return prepared.play()
    },
    [prepare],
  )

  return { supported, enabled, setEnabled, speak, prepare, cancel }
}
