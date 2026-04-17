'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { voiceFor } from '@/lib/voices'
import type { ModelSlug } from '@/lib/game/types'

const STORAGE_KEY = 'whospy:tts-enabled'

export interface SpeechController {
  /**
   * True when TTS playback is available. Currently tied to whether the
   * environment supports `Audio` + `fetch` — true in all modern browsers.
   */
  supported: boolean
  enabled: boolean
  setEnabled: (on: boolean) => void
  /**
   * Speak `text` using the Edge TTS voice mapped to `modelSlug`. Returns a
   * Promise that resolves when playback ends (or immediately if disabled /
   * empty / aborted / errors out).
   */
  speak: (text: string, modelSlug: ModelSlug) => Promise<void>
  /** Cancel any in-flight speech and abort any pending fetch. */
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

export function useSpeech(): SpeechController {
  const supported = typeof window !== 'undefined' && 'Audio' in window
  const [enabled, setEnabledState] = useState<boolean>(loadInitialEnabled)
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  // Active playback state so we can cancel cleanly.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const urlRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

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
    if (abortRef.current) {
      try { abortRef.current.abort() } catch { /* noop */ }
      abortRef.current = null
    }
  }, [])

  const cancel = useCallback(() => {
    cleanup()
  }, [cleanup])

  // Stop on unmount.
  useEffect(() => {
    return () => { cleanup() }
  }, [cleanup])

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch { /* noop */ }
    if (!on) cleanup()
  }, [cleanup])

  const speak = useCallback(
    async (text: string, modelSlug: ModelSlug): Promise<void> => {
      if (!supported || !enabledRef.current || !text.trim()) return

      // If a previous utterance is still playing, stop it.
      cleanup()

      const voice = voiceFor(modelSlug, text)
      const ctrl = new AbortController()
      abortRef.current = ctrl

      // Fetch MP3 with one retry to smooth over transient Edge TTS hiccups.
      const fetchAudio = async (): Promise<Blob | null> => {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice }),
            signal: ctrl.signal,
          })
          if (!res.ok) return null
          return await res.blob()
        } catch {
          return null
        }
      }
      let blob = await fetchAudio()
      if (!blob && !ctrl.signal.aborted) {
        await new Promise(r => setTimeout(r, 300))
        blob = await fetchAudio()
      }
      if (!blob) {
        // Fallback: hold the turn for a duration proportional to text length
        // so the player doesn't lose their beat when TTS fails.
        const fallbackMs = Math.min(6000, Math.max(1500, text.length * 60))
        await new Promise(r => setTimeout(r, fallbackMs))
        return
      }

      if (abortRef.current !== ctrl) return  // another call superseded this one

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
        audio.onpause = () => {
          // Pause on cancel: the audio element is paused and src cleared.
          if (!audioRef.current) done()
        }
        audio.play().catch(done)
      })
    },
    [supported, cleanup],
  )

  return { supported, enabled, setEnabled, speak, cancel }
}
