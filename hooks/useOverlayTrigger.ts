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
  // Round-start / phase-start ordered roster.
  alive?: Array<{ id: PlayerId; displayName: string; modelSlug: ModelSlug; position: number }>
}

export interface OverlayState {
  items: OverlayItem[]
  currentIndex: number
}

const HOLD_MS = 1500
const CROSSFADE_MS = 400
const ITEM_TOTAL_MS = HOLD_MS + CROSSFADE_MS

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

    // ROUND N + DESCRIBE PHASE + speaking order. Driven on round change so
    // it fires once per round (state.order is hoisted into the playback
    // batch so it's already set by this render).
    if (state.round > 0 && state.round !== prev.round) {
      const order: PlayerId[] = state.order.length
        ? state.order
        : state.players.filter(p => !p.eliminated).map(p => p.id)
      items.push({
        id: `round-${state.round}-describe`,
        kind: 'round-start',
        title: `ROUND ${state.round}`,
        subtitle: 'DESCRIBE PHASE',
        alive: buildOrderedAlive(order, state.players),
      })
    }

    if (state.phase !== prev.phase) {
      if (state.phase === 'vote') {
        // Vote order is alive-by-id (the engine doesn't shuffle the vote loop).
        const order: PlayerId[] = state.players
          .filter(p => !p.eliminated)
          .map(p => p.id)
        items.push({
          id: `round-${state.round}-vote`,
          kind: 'round-start',
          title: `ROUND ${state.round}`,
          subtitle: 'VOTE PHASE',
          alive: buildOrderedAlive(order, state.players),
        })
      } else if (state.phase === 'tiebreak') {
        const tiedOrder: PlayerId[] = state.tiedPlayers.length
          ? state.tiedPlayers
          : state.players.filter(p => !p.eliminated).map(p => p.id)
        items.push({
          id: `round-${state.round}-tiebreak`,
          kind: 'round-start',
          title: 'TIEBREAK',
          subtitle: `ROUND ${state.round}`,
          alive: buildOrderedAlive(tiedOrder, state.players),
        })
      }
      // Skip 'describe' phase overlay — round-start already covers it.
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
            eliminated: { displayName: p.displayName, modelSlug: p.modelSlug, role },
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
        setOverlay(prev => prev ? { ...prev, items: [...prev.items, ...items] } : prev)
      } else {
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
      if (next >= prev.items.length) return null
      scheduleAdvance()
      return { ...prev, currentIndex: next }
    })
  }

  return overlay
}

function buildOrderedAlive(
  order: PlayerId[],
  players: Player[],
): Array<{ id: PlayerId; displayName: string; modelSlug: ModelSlug; position: number }> {
  return order
    .map((id, idx) => {
      const player = players.find(p => p.id === id)
      if (!player) return null
      return {
        id: player.id,
        displayName: player.displayName,
        modelSlug: player.modelSlug,
        position: idx + 1,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
}
