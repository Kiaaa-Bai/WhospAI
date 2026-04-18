'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceFor } from '@/lib/voices'
import type { ModelSlug } from '@/lib/game/types'

const STORAGE_KEY = 'whospy:tts-enabled'
const RETRY_DELAYS = [0, 300, 800]

export interface PreparedSpeech {
  play: () => Promise<void>
  cancel: () => void
}

export interface SpeechController {
  supported: boolean
  enabled: boolean
  setEnabled: (on: boolean) => void
  speak: (text: string, modelSlug: ModelSlug) => Promise<void>
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

export function useSpeech(): SpeechController {
  const supported = isWebAudioSupported()
  const [enabled, setEnabledState] = useState<boolean>(loadInitialEnabled)
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const audioContextRef = useRef<AudioContext | null>(null)
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null)

  const getContext = useCallback((): AudioContext | null => {
    if (!supported) return null
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = createAudioContext()
      } catch {
        return null
      }
    }
    return audioContextRef.current
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
      stopCurrent()
      const ctx = audioContextRef.current
      if (ctx) {
        try { ctx.close() } catch { /* noop */ }
        audioContextRef.current = null
      }
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
    (text: string, modelSlug: ModelSlug): PreparedSpeech => {
      const noop: PreparedSpeech = {
        play: () => Promise.resolve(),
        cancel: () => {},
      }
      if (!supported || !text.trim()) return noop

      const voice = voiceFor(modelSlug, text)
      const ctrl = new AbortController()
      const blobPromise = fetchBlobWithRetry(text, voice, ctrl.signal)
      let cancelled = false
      // Decode the audio in parallel with the fetch so play() has a buffer
      // ready immediately when the time comes.
      const bufferPromise: Promise<AudioBuffer | null> = blobPromise.then(async blob => {
        if (cancelled || !blob) return null
        const ctx = getContext()
        if (!ctx) return null
        try {
          const arrayBuffer = await blob.arrayBuffer()
          // decodeAudioData detaches the array buffer; pass a copy to be safe
          // across browsers that complain.
          return await ctx.decodeAudioData(arrayBuffer.slice(0))
        } catch {
          return null
        }
      })

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
            try { await ctx.resume() } catch { /* noop */ }
          }

          // Stop any currently playing source before starting a new one.
          stopCurrent()

          const source = ctx.createBufferSource()
          source.buffer = buffer
          source.connect(ctx.destination)
          currentSourceRef.current = source

          return new Promise<void>(resolve => {
            let settled = false
            source.onended = () => {
              if (settled) return
              settled = true
              if (currentSourceRef.current === source) {
                currentSourceRef.current = null
              }
              try { source.disconnect() } catch { /* noop */ }
              resolve()
            }
            try {
              source.start(0)
            } catch {
              if (!settled) {
                settled = true
                resolve()
              }
            }
          })
        },
      }
    },
    [supported, getContext, stopCurrent],
  )

  const speak = useCallback(
    (text: string, modelSlug: ModelSlug): Promise<void> => prepare(text, modelSlug).play(),
    [prepare],
  )

  return { supported, enabled, setEnabled, speak, prepare, cancel }
}
