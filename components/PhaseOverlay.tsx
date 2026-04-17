'use client'
import { AnimatePresence, motion } from 'framer-motion'
import type { OverlayItem } from '@/hooks/useOverlayTrigger'

interface Props {
  item: OverlayItem | null
}

/**
 * Curtain-style full-screen overlay. Two dark bars slide in from top and
 * bottom, meet in the middle, hold with text, then slide back out.
 *
 * Timing (total ~2s):
 *  - 0.0–0.4s: curtains close
 *  - 0.4–1.6s: text held at full opacity
 *  - 1.6–2.0s: curtains open (via AnimatePresence exit)
 */
export function PhaseOverlay({ item }: Props) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          key={item.id}
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

          {/* Text — appears after curtains meet */}
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{
              opacity: { duration: 0.25, delay: 0.35 },
              scale: { duration: 0.4, delay: 0.35, ease: [0.34, 1.56, 0.64, 1] },
            }}
          >
            <div className="text-6xl md:text-7xl font-black tracking-[0.12em] text-zinc-50">
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
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
