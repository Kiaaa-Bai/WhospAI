/**
 * Reigns-style provider signature colors. Each of the 6 AI providers gets
 * a distinct warm/muted color used as the card background in seats and
 * main-stage focus. Aligned with each provider's brand hue but muted to
 * sit on the warm parchment palette.
 */
import { providerOf } from './avatars'
import type { ModelSlug, Role } from './game/types'

const PROVIDER_BG: Record<string, string> = {
  openai:    'var(--reigns-openai)',
  anthropic: 'var(--reigns-anthropic)',
  google:    'var(--reigns-google)',
  deepseek:  'var(--reigns-deepseek)',
  xai:       'var(--reigns-xai)',
  alibaba:   'var(--reigns-alibaba)',
}

export function providerBg(slug: ModelSlug): string {
  return PROVIDER_BG[providerOf(slug)] ?? '#888'
}

/** Card interior fill per role — saturated green/red. */
export function roleFill(role: Role): string {
  return role === 'undercover' ? 'var(--reigns-red)' : 'var(--reigns-green)'
}

/** Cream text color used on role-filled cards. */
export const CARD_TEXT = '#F5EDDB'
