'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Avatar } from './Avatar'
import { providerBg } from '@/lib/provider-colors'
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
            className="absolute left-0 right-0 top-0 h-1/2"
            style={{
              background: 'var(--reigns-accent-strip)',
              borderBottom: '3px solid var(--reigns-ink)',
            }}
            initial={{ y: '-100%' }}
            animate={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          />
          <motion.div
            className="absolute left-0 right-0 bottom-0 h-1/2"
            style={{
              background: 'var(--reigns-accent-strip)',
              borderTop: '3px solid var(--reigns-ink)',
            }}
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
      <div
        className="font-heading text-6xl md:text-7xl font-black tracking-[0.14em]"
        style={{ color: '#F5EDDB' }}
      >
        {item.title}
      </div>
      {item.subtitle && (
        <div
          className="mt-4 font-mono text-lg font-bold tracking-wider"
          style={{
            color:
              item.accent === 'undercover'
                ? 'var(--reigns-red)'
                : item.accent === 'civilian'
                  ? 'var(--reigns-green)'
                  : '#E5DCCA',
          }}
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
      <div className="flex items-end justify-center gap-5">
        {item.alive!.map(p => (
          <div key={p.id} className="flex flex-col items-center gap-2">
            <div
              className="rounded-lg p-2 flex items-center justify-center"
              style={{
                background: providerBg(p.modelSlug),
                border: '3px solid var(--reigns-ink)',
                boxShadow: '4px 4px 0 0 var(--reigns-ink)',
              }}
            >
              <Avatar modelSlug={p.modelSlug} size={72} />
            </div>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-sm font-bold"
              style={{
                background: 'var(--reigns-gold)',
                color: 'var(--reigns-ink)',
                border: '2px solid var(--reigns-ink)',
              }}
            >
              {p.position}
            </div>
          </div>
        ))}
      </div>
      <div
        className="font-heading text-5xl md:text-6xl font-black tracking-[0.12em]"
        style={{ color: '#F5EDDB' }}
      >
        {item.title}
      </div>
      {item.subtitle && (
        <div
          className="font-mono text-lg font-bold tracking-[0.25em] uppercase"
          style={{ color: 'var(--reigns-gold)' }}
        >
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
          className="p-4 rounded-xl flex items-center justify-center"
          style={{
            background: providerBg(elim.modelSlug),
            border: '3px solid var(--reigns-ink)',
            boxShadow: '6px 6px 0 0 var(--reigns-ink)',
          }}
        >
          <Avatar modelSlug={elim.modelSlug} size={180} />
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
        className="font-heading text-5xl md:text-6xl font-black tracking-[0.1em]"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.7 }}
        style={{ color: '#F5EDDB' }}
      >
        {elim.displayName.toUpperCase()}
      </motion.div>
      <motion.div
        className="font-mono text-2xl font-bold tracking-[0.2em]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.85 }}
        style={{
          color: elim.role === 'undercover' ? 'var(--reigns-red)' : 'var(--reigns-green)',
        }}
      >
        ELIMINATED · {elim.role.toUpperCase()}
      </motion.div>
    </div>
  )
}
