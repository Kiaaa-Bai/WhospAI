'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from './Avatar'
import type { OverlayItem, OverlayState } from '@/hooks/useOverlayTrigger'

interface Props {
  state: OverlayState | null
}

export function PhaseOverlay({ state }: Props) {
  const item = state ? state.items[state.currentIndex] : null

  return (
    <AnimatePresence>
      {state && item && (
        <motion.div
          key="curtain"
          className="fixed inset-0 z-40 pointer-events-none"
        >
          <motion.div
            className="absolute left-0 right-0 top-0 h-1/2 bg-zinc-950 border-b border-zinc-800"
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-1/2 bg-zinc-950 border-t border-zinc-800"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />

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
    return <EliminationContent item={item} />
  }

  if (item.kind === 'round-start' && item.alive) {
    return <RoundStartContent item={item} />
  }

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

function RoundStartContent({ item }: { item: OverlayItem }) {
  return (
    <div className="flex flex-col items-center text-center gap-6">
      <div className="flex items-end justify-center gap-6">
        {item.alive!.map(p => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <Avatar modelSlug={p.modelSlug} size={84} />
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-sm font-bold text-zinc-200">
              {p.position}
            </div>
            <div className="text-[10px] text-zinc-400 font-mono">{p.id}</div>
          </div>
        ))}
      </div>
      <div className="text-5xl md:text-6xl font-black tracking-[0.12em] text-zinc-50">
        {item.title}
      </div>
      {item.subtitle && (
        <div className="text-lg tracking-[0.2em] text-zinc-400 font-semibold uppercase">
          {item.subtitle}
        </div>
      )}
    </div>
  )
}

/**
 * Restrained elimination sequence — quick shake, then a static red X
 * fades in over a graying avatar. No flash, no cracks, no slam.
 *
 * Timeline (ms):
 *   0-250    avatar enter
 *   250-450  shake (4 quick swings)
 *   450-650  avatar grayscales + red X fades in
 */
function EliminationContent({ item }: { item: OverlayItem }) {
  const elim = item.eliminated!
  const accentColor = elim.role === 'undercover' ? 'text-red-300' : 'text-emerald-300'

  return (
    <div className="flex flex-col items-center text-center gap-5">
      <div className="relative">
        {/* Avatar: shake then desaturate */}
        <motion.div
          initial={{ filter: 'grayscale(0)' }}
          animate={{
            x: [0, -10, 10, -8, 8, -4, 4, 0],
            filter: [
              'grayscale(0)',
              'grayscale(0)',
              'grayscale(0)',
              'grayscale(0)',
              'grayscale(0.5)',
              'grayscale(1)',
              'grayscale(1)',
            ],
          }}
          transition={{
            x: { duration: 0.4, delay: 0.25, ease: 'easeInOut' },
            filter: { duration: 0.4, delay: 0.45 },
          }}
        >
          <Avatar modelSlug={elim.modelSlug} size={200} />
        </motion.div>

        {/* Static red X — fades in */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.55, ease: 'easeOut' }}
        >
          <span className="text-red-500 font-black text-[10rem] leading-none drop-shadow-[0_0_18px_rgba(239,68,68,0.5)]">
            ✕
          </span>
        </motion.div>
      </div>

      <motion.div
        className="text-5xl md:text-6xl font-black tracking-[0.1em] text-zinc-50"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
      >
        {elim.displayName.toUpperCase()}
      </motion.div>
      <motion.div
        className={`text-2xl font-bold tracking-[0.2em] ${accentColor}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.85 }}
      >
        ELIMINATED · {elim.role.toUpperCase()}
      </motion.div>
    </div>
  )
}
