'use client'
import { motion } from 'framer-motion'
import { Avatar } from './Avatar'
import type { ModelSlug } from '@/lib/game/types'

interface Props {
  text?: string
  targetModelSlug?: ModelSlug
  active?: boolean
  size?: 'sm' | 'lg'
}

export function ThoughtBubble({ text, targetModelSlug, active, size = 'sm' }: Props) {
  if (!text && !targetModelSlug && !active) return null

  const isLarge = size === 'lg'
  const isAvatar = !!targetModelSlug
  const padding = isAvatar
    ? (isLarge ? 'p-2' : 'p-1.5')
    : (isLarge ? 'px-4 py-3 text-base max-w-md' : 'px-2 py-1 text-xs max-w-[140px]')
  const bubble = `relative bg-white text-zinc-900 rounded-2xl border border-zinc-300 ${padding}`

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={bubble}
    >
      {targetModelSlug ? (
        <Avatar modelSlug={targetModelSlug} size={isLarge ? 56 : 32} />
      ) : (
        <span className="whitespace-pre-wrap break-words">{text}</span>
      )}
      {active && (
        <motion.span
          className={`inline-block align-middle bg-zinc-500 ml-0.5 ${isLarge ? 'w-1 h-5' : 'w-0.5 h-3'}`}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-zinc-300 rotate-45" />
    </motion.div>
  )
}
