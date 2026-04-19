'use client'
import { motion } from 'framer-motion'
import { ProviderAvatar } from './ProviderAvatar'
import type { ModelSlug } from '@/lib/game/types'

interface Props {
  text?: string
  targetModelSlug?: ModelSlug
  active?: boolean              // typewriter cursor
  ellipsis?: boolean            // show animated "…" instead of text
  size?: 'sm' | 'lg' | 'xl'
  /** When true the bubble fills its container's width. */
  fullWidth?: boolean
}

/**
 * Picks a Tailwind text-size class so longer statements still fit a
 * fixed-height bubble.
 */
function autoTextSize(text: string, size: 'sm' | 'lg' | 'xl'): string {
  const len = text.length
  if (size === 'xl') {
    if (len <= 30) return 'text-5xl'
    if (len <= 60) return 'text-4xl'
    if (len <= 120) return 'text-3xl'
    if (len <= 220) return 'text-2xl'
    if (len <= 360) return 'text-xl'
    return 'text-lg'
  }
  if (size === 'lg') {
    if (len <= 30) return 'text-2xl'
    if (len <= 80) return 'text-xl'
    return 'text-lg'
  }
  // sm
  if (len <= 24) return 'text-base'
  if (len <= 60) return 'text-sm'
  return 'text-xs'
}

function bubbleHeight(size: 'sm' | 'lg' | 'xl'): string {
  if (size === 'xl') return 'h-44'   // 176px
  if (size === 'lg') return 'h-32'   // 128px
  return 'h-20'                       // 80px
}

function Ellipsis({ size }: { size: 'sm' | 'lg' | 'xl' }) {
  const dotSize = size === 'xl' ? 'w-3 h-3' : size === 'lg' ? 'w-2 h-2' : 'w-1.5 h-1.5'
  const gap = size === 'xl' ? 'gap-3' : 'gap-1.5'
  return (
    <div className={`flex items-center justify-center ${gap}`}>
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className={`${dotSize} rounded-full`}
          style={{ background: 'var(--reigns-ink-faint)' }}
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

export function ThoughtBubble({
  text,
  targetModelSlug,
  active,
  ellipsis,
  size = 'sm',
  fullWidth = false,
}: Props) {
  const isAvatar = !!targetModelSlug
  const showEllipsis = ellipsis && !isAvatar && !text

  // Compute padding + text size — always render the bubble shell so
  // height stays fixed across content changes.
  let textSize = ''
  let padding: string
  if (isAvatar) {
    padding = size === 'xl' ? 'p-3' : size === 'lg' ? 'p-2' : 'p-1.5'
  } else if (showEllipsis) {
    padding = ''
  } else {
    textSize = autoTextSize(text ?? '', size)
    padding =
      size === 'xl'
        ? `px-8 py-4 ${textSize} font-semibold leading-snug text-center`
        : size === 'lg'
          ? `px-5 py-3 ${textSize} font-medium`
          : `px-3 py-2 ${textSize} font-medium leading-tight`
  }

  const widthClass = fullWidth ? 'w-full' : size === 'xl' ? 'max-w-3xl' : ''
  const height = bubbleHeight(size)
  const bubble =
    `relative flex items-center justify-center rounded-2xl ${padding} ${widthClass} ${height}`

  const avatarSize = size === 'xl' ? 96 : size === 'lg' ? 56 : 32
  const cursorClass = size === 'xl' ? 'w-1.5 h-10' : size === 'lg' ? 'w-1 h-5' : 'w-0.5 h-3'

  return (
    <div
      className={bubble}
      style={{
        background: '#FAF2DF',
        border: '2px solid var(--reigns-ink)',
        color: 'var(--reigns-ink)',
        boxShadow: '3px 3px 0 0 var(--reigns-ink)',
      }}
    >
      {isAvatar ? (
        <ProviderAvatar
          modelSlug={targetModelSlug!}
          size={avatarSize}
          padding={size === 'xl' ? 8 : size === 'lg' ? 5 : 3}
          outline={size === 'sm' ? 2 : 3}
        />
      ) : showEllipsis ? (
        <Ellipsis size={size} />
      ) : (
        <span className="whitespace-pre-wrap break-words text-center">{text}</span>
      )}
      {active && !isAvatar && !showEllipsis && (
        <motion.span
          className={`inline-block align-middle bg-zinc-500 ml-0.5 ${cursorClass}`}
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
      )}
      <span
        className={
          `absolute left-1/2 -translate-x-1/2 rotate-45 ` +
          (size === 'xl'
            ? '-bottom-2 w-4 h-4'
            : size === 'lg'
              ? '-bottom-1.5 w-3.5 h-3.5'
              : '-bottom-1.5 w-3 h-3')
        }
        style={{
          background: '#FAF2DF',
          borderRight: '2px solid var(--reigns-ink)',
          borderBottom: '2px solid var(--reigns-ink)',
        }}
      />
    </div>
  )
}
