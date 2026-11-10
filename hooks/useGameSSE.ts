// hooks/useGameSSE.ts
'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { GameConfig, GameEvent } from '@/lib/game/types'

export type SSEStatus = 'idle' | 'streaming' | 'done' | 'error'

export interface UseGameSSEReturn {
  status: SSEStatus
  error: string | null
  start: (config: GameConfig) => Promise<void>
}

export function useGameSSE(onEvent?: (e: GameEvent) => void): UseGameSSEReturn {
  const [status, setStatus] = useState<SSEStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Stop reading the stream when the viewer unmounts (user exits mid-game).
  // Otherwise the old game's events keep arriving and keep preloading TTS
  // audio that nobody will hear, competing with the next game's audio.
  useEffect(() => () => abortRef.current?.abort(), [])

  const start = useCallback(async (config: GameConfig) => {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setError(null)
    setStatus('streaming')

    try {
      const res = await fetch('/api/play', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: ctrl.signal,
      })

      if (!res.ok) {
        const body = await res.text()
        throw new Error(`HTTP ${res.status}: ${body}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })

        let idx: number
        while ((idx = buf.indexOf('\n\n')) !== -1) {
          const chunk = buf.slice(0, idx)
          buf = buf.slice(idx + 2)

          if (chunk.startsWith('data: ')) {
            const raw = chunk.slice(6)
            try {
              const event = JSON.parse(raw) as GameEvent
              onEvent?.(event)
            } catch { /* malformed chunk, skip */ }
          }
        }
      }

      setStatus('done')
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return
      setError(String(err))
      setStatus('error')
    }
  }, [onEvent])

  return { status, error, start }
}
