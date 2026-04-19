'use client'
import { Avatar } from './Avatar'
import { providerBg } from '@/lib/provider-colors'
import type { ModelSlug } from '@/lib/game/types'

interface Props {
  modelSlug: ModelSlug
  /** Avatar image size in px. */
  size: number
  /** Padding in px between the avatar and the colored disc edge. */
  padding?: number
  /** Outline thickness in px (black ink ring around the disc). */
  outline?: number
  /** Whether to render the ink offset drop-shadow. */
  shadow?: boolean
  /** When provided, adds a role-color ring + glow around the disc — used
   *  to mark the active speaker. */
  activeGlow?: string
  className?: string
  dim?: boolean
}

/**
 * Round avatar seated inside a provider-colored disc with a black ink
 * outline. This is the canonical way a contestant's brand identity is
 * expressed across the app — seats, focus stage, bucket cards, game-over
 * roster, round-start/elimination overlays.
 */
export function ProviderAvatar({
  modelSlug,
  size,
  padding = 6,
  outline = 3,
  shadow = true,
  activeGlow,
  className,
  dim,
}: Props) {
  const discSize = size + padding * 2

  const shadows: string[] = []
  if (activeGlow) {
    shadows.push(`0 0 0 3px ${activeGlow}`)
    shadows.push(`0 0 10px ${activeGlow}`)
  }
  if (shadow) shadows.push('3px 3px 0 0 var(--reigns-ink)')

  return (
    <div
      className={`rounded-full flex items-center justify-center shrink-0 ${className ?? ''}`}
      style={{
        width: discSize,
        height: discSize,
        background: providerBg(modelSlug),
        border: `${outline}px solid var(--reigns-ink)`,
        boxShadow: shadows.length ? shadows.join(', ') : undefined,
        opacity: dim ? 0.55 : 1,
      }}
    >
      <Avatar
        modelSlug={modelSlug}
        size={size}
        className={dim ? 'grayscale' : ''}
      />
    </div>
  )
}
