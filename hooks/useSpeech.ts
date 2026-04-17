'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  VoiceRegistry,
  detectTextLanguage,
  isSpeechSupported,
  loadVoices,
} from '@/lib/voices'
import type { ModelSlug } from '@/lib/game/types'

const RATE = 1.1          // slightly faster than default
const PITCH = 1.0
const VOLUME = 1.0

export interface SpeechController {
  supported: boolean
  enabled: boolean
  setEnabled: (on: boolean) => void
  /**
   * Speak `text` with the voice assigned to `modelSlug`. Returns a Promise
   * that resolves when speech ends (or immediately if disabled/unsupported
   * or text is empty).
   */
  speak: (text: string, modelSlug: ModelSlug) => Promise<void>
  /** Cancel any in-flight speech immediately. */
  cancel: () => void
}

/**
 * localStorage key for the user's TTS preference.
 */
const STORAGE_KEY = 'whospy:tts-enabled'

function loadInitialEnabled(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === null) return true  // default ON
    return stored === '1'
  } catch {
    return true
  }
}

export function useSpeech(): SpeechController {
  const supported = isSpeechSupported()
  const [enabled, setEnabledState] = useState<boolean>(loadInitialEnabled)
  const registryRef = useRef<VoiceRegistry | null>(null)
  const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Load voices once (they may arrive asynchronously).
  useEffect(() => {
    if (!supported) return
    let cancelled = false
    loadVoices().then(voices => {
      if (cancelled) return
      registryRef.current = new VoiceRegistry(voices)
    })
    return () => { cancelled = true }
  }, [supported])

  // Cancel any pending speech on unmount.
  useEffect(() => {
    return () => {
      if (supported) {
        try { window.speechSynthesis.cancel() } catch { /* noop */ }
      }
    }
  }, [supported])

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on)
    try {
      window.localStorage.setItem(STORAGE_KEY, on ? '1' : '0')
    } catch { /* noop */ }
    if (!on && supported) {
      try { window.speechSynthesis.cancel() } catch { /* noop */ }
    }
  }, [supported])

  // Track enabled in a ref so the stable `speak` closure sees the latest value.
  const enabledRef = useRef(enabled)
  useEffect(() => { enabledRef.current = enabled }, [enabled])

  const cancel = useCallback(() => {
    if (!supported) return
    try { window.speechSynthesis.cancel() } catch { /* noop */ }
  }, [supported])

  const speak = useCallback(
    (text: string, modelSlug: ModelSlug): Promise<void> => {
      if (!supported || !enabledRef.current || !text.trim()) {
        return Promise.resolve()
      }
      const registry = registryRef.current
      const lang = detectTextLanguage(text)

      return new Promise<void>(resolve => {
        const utterance = new SpeechSynthesisUtterance(text)
        const voice = registry?.voiceFor(modelSlug, lang) ?? null
        if (voice) {
          utterance.voice = voice
          utterance.lang = voice.lang
        } else {
          // Best-effort lang hint so the TTS engine picks a sensible default.
          utterance.lang = lang === 'zh' ? 'zh-CN' : lang === 'ja' ? 'ja-JP' : 'en-US'
        }
        utterance.rate = RATE
        utterance.pitch = PITCH
        utterance.volume = VOLUME

        let settled = false
        const done = () => {
          if (settled) return
          settled = true
          currentUtteranceRef.current = null
          resolve()
        }
        utterance.onend = done
        utterance.onerror = done

        currentUtteranceRef.current = utterance
        try {
          window.speechSynthesis.speak(utterance)
        } catch {
          done()
        }
      })
    },
    [supported],
  )

  return { supported, enabled, setEnabled, speak, cancel }
}
