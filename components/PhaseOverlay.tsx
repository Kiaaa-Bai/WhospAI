'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from './Avatar'
import type { OverlayItem, OverlayState } from '@/hooks/useOverlayTrigger'

interface Props {
  state: OverlayState | null
}

/**
 * Curtain-style full-screen overlay.
 *
 * The curtain drops once at the start of a batch and rises once at the end.
 * Between items in the batch the text content crossfades (curtain stays down).
 */
export function PhaseOverlay({ state }: Props) {
  const item = state ? state.items[state.currentIndex] : null

  return (
    <AnimatePresence>
      {state && item && (
        <motion.div
          key="curtain"
          className="fixed inset-0 z-40 pointer-events-none"
        >
          {/* Top curtain */}
          <motion.div
            className="absolute left-0 right-0 top-0 h-1/2 bg-zinc-950 border-b border-zinc-800"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
          {/* Bottom curtain */}
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-1/2 bg-zinc-950 border-t border-zinc-800"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />

          {/* Content — crossfades as currentIndex changes */}
          <div className="absolute inset-0 flex items-center justify-center px-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{
                  opacity: { duration: 0.25 },
                  y: { duration: 0.3, ease: 'easeOut' },
                }}
                className="w-full max-w-5xl"
              >
                <OverlayContent item={item} />
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function OverlayContent({ item }: { item: OverlayItem }) {
  if (item.kind === 'elimination' && item.eliminated) {
    return (
      <div className="flex flex-col items-center text-center gap-5">
        <Avatar modelSlug={item.eliminated.modelSlug} size={180} />
        <div className="text-5xl md:text-6xl font-black tracking-[0.1em] text-zinc-50">
          {item.eliminated.displayName.toUpperCase()}
        </div>
        <div
          className={`text-2xl font-bold tracking-[0.2em] ${
            item.eliminated.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'
          }`}
        >
          ELIMINATED · {item.eliminated.role.toUpperCase()}
        </div>
      </div>
    )
  }

  if (item.kind === 'round-start' && item.alive) {
    return (
      <div className="flex flex-col items-center text-center gap-6">
        <div className="flex items-end gap-5">
          {item.alive.map(p => (
            <div key={p.id} className="flex flex-col items-center gap-2">
              <Avatar modelSlug={p.modelSlug} size={72} />
              <div className="text-xs text-zinc-400 font-mono">{p.id}</div>
            </div>
          ))}
        </div>
        <div className="text-5xl md:text-6xl font-black tracking-[0.12em] text-zinc-50">
          {item.title}
        </div>
        {item.subtitle && (
          <div className="text-lg tracking-wider text-zinc-400">{item.subtitle}</div>
        )}
      </div>
    )
  }

  // Default text kind
  return (
    <div className="text-center">
      <div className="text-6xl md:text-7xl font-black tracking-[0.14em] text-zinc-50">
        {item.title}
      </div>
      {item.subtitle && (
        <div
          className={`mt-4 text-lg tracking-wider ${
            item.accent === 'undercover'
              ? 'text-red-300 font-bold'
              : item.accent === 'civilian'
                ? 'text-emerald-300 font-bold'
                : 'text-zinc-400'
          }`}
        >
          {item.subtitle}
        </div>
      )}
    </div>
  )
}
