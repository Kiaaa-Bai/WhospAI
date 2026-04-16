'use client'
import { motion, AnimatePresence } from 'framer-motion'

export function SpeechBubble({
  text,
  active,
}: {
  text: string
  active: boolean
}) {
  if (!text && !active) return null

  return (
    <AnimatePresence>
      <motion.div
        key="bubble"
        initial={{ opacity: 0, scale: 0.9, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="relative mt-2 px-3 py-2 rounded-xl text-sm bg-zinc-800 text-zinc-100 border border-zinc-700"
      >
        <span>{text}</span>
        {active && (
          <motion.span
            className="inline-block w-1.5 h-4 ml-0.5 bg-zinc-400 align-middle"
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
