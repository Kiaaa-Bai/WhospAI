'use client'
import { motion } from 'framer-motion'
import { Avatar } from './Avatar'
import type { ModelSlug } from '@/lib/game/types'

interface Props {
  text?: string
  targetModelSlug?: ModelSlug
  active?: boolean
  size?: 'sm' | 'lg' | 'xl'
  /** When true the bubble stretches to its container's width. */
  fullWidth?: boolean
}

/**
 * Returns a Tailwind text-size class sized down as `text` gets longer so
 * the MainStage bubble stays legible whether it's a 3-word quip or a full
 * paragraph.
 */
function autoTextSize(text: string): string {
  const len = text.length
  if (len <= 30) return 'text-5xl'
  if (len <= 60) return 'text-4xl'
  if (len <= 120) return 'text-3xl'
  if (len <= 220) return 'text-2xl'
  return 'text-xl'
}

export function ThoughtBubble({
  text,
  targetModelSlug,
  active,
  size = 'sm',
  fullWidth = false,
}: Props) {
  if (!text && !targetModelSlug && !active) return null

  const isAvatar = !!targetModelSlug
  const isXL = size === 'xl'
  const isLarge = size === 'lg'

  let padding: string
  let textSize = ''
  if (isAvatar) {
    padding = isXL ? 'p-3' : isLarge ? 'p-2' : 'p-1.5'
  } else if (isXL) {
    textSize = autoTextSize(text ?? '')
    padding = `px-8 py-6 ${textSize} font-semibold leading-snug`
  } else if (isLarge) {
    padding = 'px-5 py-3 text-xl max-w-md font-medium'
  } else {
    padding = 'px-3 py-2 text-sm max-w-[180px] font-medium'
  }

  const widthClass = fullWidth
    ? 'w-full'
    : isXL
      ? 'max-w-3xl'
      : ''

  const bubble = `relative bg-white text-zinc-900 rounded-2xl border border-zinc-300 ${padding} ${widthClass}`

  const avatarSize = isXL ? 84 : isLarge ? 56 : 32
  const cursorClass = isXL
    ? 'w-1.5 h-10'
    : isLarge
      ? 'w-1 h-5'
      : 'w-0.5 h-3'

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className={bubble}
    >
      {targetModelSlug ? (
        <div className="flex items-center justify-center">
          <Avatar modelSlug={targetModelSlug} size={avatarSize} />
        </div>
      ) : (
        <span className="whitespace-pre-wrap break-words">{text}</span>
      )}
      {active && (
        <motion.span
          className={`inline-block align-middle bg-zinc-500 ml-0.5 ${cursorClass}`}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
      <span className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-white border-r border-b border-zinc-300 rotate-45" />
    </motion.div>
  )
}
