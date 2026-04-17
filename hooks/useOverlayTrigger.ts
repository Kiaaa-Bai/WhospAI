'use client'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from './useGameReducer'

export interface OverlayItem {
  id: string
  title: string
  subtitle?: string
  accent?: 'civilian' | 'undercover' | null
}

const OVERLAY_DURATION_MS = 2000
const QUEUE_GAP_MS = 80

/**
 * Watches game state for milestone transitions (game-start, round-start,
 * phase switches, eliminations) and emits a one-at-a-time overlay item.
 *
 * Multiple transitions that happen within a tick are queued and played in
 * sequence. The playback controller pauses for OVERLAY_DURATION_MS after
 * dispatching the same trigger events so this hook's visual timing stays
 * in sync with the drain loop.
 */
export function useOverlayTrigger(state: GameState): OverlayItem | null {
  const [current, setCurrent] = useState<OverlayItem | null>(null)
  const queueRef = useRef<OverlayItem[]>([])
  const busyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const prevRef = useRef<{
    phase: GameState['phase']
    round: number
    historyLen: number
    hasStart: boolean
  }>({
    phase: 'setup', round: 0, historyLen: 0, hasStart: false,
  })

  // Cleanup timers on unmount.
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (gapTimerRef.current) clearTimeout(gapTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const prev = prevRef.current
    const hasStart = state.players.length > 0
    const items: OverlayItem[] = []

    // Game-start (first time players appear).
    if (!prev.hasStart && hasStart) {
      items.push({
        id: `start-${Date.now()}`,
        title: 'GAME START',
        subtitle: '6 AIs · 1 undercover',
      })
    }

    // Round change.
    if (state.round > 0 && state.round !== prev.round) {
      const alive = state.players.filter(p => !p.eliminated).length
      items.push({
        id: `round-${state.round}`,
        title: `ROUND ${state.round}`,
        subtitle: `Alive: ${alive}`,
      })
    }

    // Phase change (skip setup and over — over has its own GameOverOverlay).
    if (state.phase !== prev.phase && ['describe', 'vote', 'tiebreak'].includes(state.phase)) {
      const titles: Record<string, string> = {
        describe: 'DESCRIBE PHASE',
        vote: 'VOTE PHASE',
        tiebreak: 'TIEBREAK',
      }
      items.push({
        id: `phase-${state.phase}-${state.round}`,
        title: titles[state.phase],
      })
    }

    // Elimination / no-elimination (history grew).
    if (state.history.length > prev.historyLen) {
      const latest = state.history[state.history.length - 1]
      if (latest.eliminatedId) {
        const p = state.players.find(pp => pp.id === latest.eliminatedId)
        const role = latest.role
        items.push({
          id: `elim-${state.round}-${latest.eliminatedId}`,
          title: `${(p?.displayName ?? latest.eliminatedId).toUpperCase()} OUT`,
          subtitle: role ? role.toUpperCase() : undefined,
          accent: role ?? null,
        })
      } else {
        items.push({
          id: `noelim-${state.round}-${state.history.length}`,
          title: 'NO ELIMINATION',
          subtitle: 'Vote was tied',
        })
      }
    }

    if (items.length > 0) {
      queueRef.current.push(...items)
      pump()
    }

    prevRef.current = {
      phase: state.phase,
      round: state.round,
      historyLen: state.history.length,
      hasStart,
    }
  }, [state])

  const pump = () => {
    if (busyRef.current) return
    const next = queueRef.current.shift()
    if (!next) return
    busyRef.current = true
    setCurrent(next)
    timerRef.current = setTimeout(() => {
      setCurrent(null)
      timerRef.current = null
      // Small gap so exit animation plays, then try the next item.
      gapTimerRef.current = setTimeout(() => {
        busyRef.current = false
        gapTimerRef.current = null
        pump()
      }, QUEUE_GAP_MS)
    }, OVERLAY_DURATION_MS)
  }

  return current
}
