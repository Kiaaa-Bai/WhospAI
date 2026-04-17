'use client'
import { useEffect, useRef, useState } from 'react'
import type { GameState } from './useGameReducer'
import type { ModelSlug, Player, PlayerId } from '@/lib/game/types'

export type OverlayKind = 'text' | 'elimination' | 'round-start'

export interface OverlayItem {
  id: string
  kind: OverlayKind
  title: string
  subtitle?: string
  accent?: 'civilian' | 'undercover' | null
  // Elimination only
  eliminated?: {
    displayName: string
    modelSlug: ModelSlug
    role: 'civilian' | 'undercover'
  }
  // Round-start only
  alive?: Array<{ id: PlayerId; displayName: string; modelSlug: ModelSlug }>
}

export interface OverlayState {
  items: OverlayItem[]
  currentIndex: number
}

const HOLD_MS = 1500              // time each text is held at full opacity
const CROSSFADE_MS = 400           // text-to-text crossfade duration
const ITEM_TOTAL_MS = HOLD_MS + CROSSFADE_MS   // 1900ms per item before advancing

/**
 * Watches state for milestone transitions and emits a batched overlay:
 * the curtain drops once, text crossfades between items, curtain rises once.
 * Multiple triggers fired in quick succession are appended to the same batch.
 */
export function useOverlayTrigger(state: GameState): OverlayState | null {
  const [overlay, setOverlay] = useState<OverlayState | null>(null)
  const overlayRef = useRef<OverlayState | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { overlayRef.current = overlay }, [overlay])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const prevRef = useRef<{
    phase: GameState['phase']
    round: number
    historyLen: number
    hasStart: boolean
  }>({
    phase: 'setup', round: 0, historyLen: 0, hasStart: false,
  })

  useEffect(() => {
    const prev = prevRef.current
    const hasStart = state.players.length > 0
    const items: OverlayItem[] = []

    if (!prev.hasStart && hasStart) {
      items.push({
        id: `start-${Date.now()}`,
        kind: 'text',
        title: 'GAME START',
        subtitle: '6 AIs · 1 undercover',
      })
    }

    if (state.round > 0 && state.round !== prev.round) {
      const alive = state.players.filter(p => !p.eliminated)
      items.push({
        id: `round-${state.round}`,
        kind: 'round-start',
        title: `ROUND ${state.round}`,
        subtitle: `Alive: ${alive.length}`,
        alive: alive.map((p: Player) => ({
          id: p.id,
          displayName: p.displayName,
          modelSlug: p.modelSlug,
        })),
      })
    }

    if (state.phase !== prev.phase && ['describe', 'vote', 'tiebreak'].includes(state.phase)) {
      const titles: Record<string, string> = {
        describe: 'DESCRIBE PHASE',
        vote: 'VOTE PHASE',
        tiebreak: 'TIEBREAK',
      }
      items.push({
        id: `phase-${state.phase}-${state.round}`,
        kind: 'text',
        title: titles[state.phase],
      })
    }

    if (state.history.length > prev.historyLen) {
      const latest = state.history[state.history.length - 1]
      if (latest.eliminatedId) {
        const p = state.players.find(pp => pp.id === latest.eliminatedId)
        const role = latest.role
        if (p && role) {
          items.push({
            id: `elim-${state.round}-${latest.eliminatedId}`,
            kind: 'elimination',
            title: `${p.displayName.toUpperCase()} OUT`,
            subtitle: role.toUpperCase(),
            accent: role,
            eliminated: {
              displayName: p.displayName,
              modelSlug: p.modelSlug,
              role,
            },
          })
        }
      } else {
        items.push({
          id: `noelim-${state.round}-${state.history.length}`,
          kind: 'text',
          title: 'NO ELIMINATION',
          subtitle: 'Vote was tied',
        })
      }
    }

    if (items.length > 0) {
      if (overlayRef.current) {
        // Append to current batch.
        setOverlay(prev => prev ? { ...prev, items: [...prev.items, ...items] } : prev)
      } else {
        // Start a new batch; schedule advance.
        setOverlay({ items, currentIndex: 0 })
        scheduleAdvance()
      }
    }

    prevRef.current = {
      phase: state.phase,
      round: state.round,
      historyLen: state.history.length,
      hasStart,
    }

  }, [state])

  function scheduleAdvance() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(advance, ITEM_TOTAL_MS)
  }

  function advance() {
    setOverlay(prev => {
      if (!prev) return null
      const next = prev.currentIndex + 1
      if (next >= prev.items.length) {
        // Curtain goes up.
        return null
      }
      // Schedule next advance.
      scheduleAdvance()
      return { ...prev, currentIndex: next }
    })
  }

  return overlay
}
