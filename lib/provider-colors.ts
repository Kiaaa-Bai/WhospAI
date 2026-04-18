/**
 * Reigns-style provider signature colors. Each of the 6 AI providers gets
 * a distinct warm/muted color used as the card background in seats and
 * main-stage focus. Aligned with each provider's brand hue but muted to
 * sit on the warm parchment palette.
 */
import { providerOf } from './avatars'
import type { ModelSlug, Role } from './game/types'

const PROVIDER_COLORS: Record<string, { bg: string; ring: string }> = {
  openai:    { bg: 'var(--reigns-openai)',    ring: '#6DAB89' },
  anthropic: { bg: 'var(--reigns-anthropic)', ring: '#E99A5F' },
  google:    { bg: 'var(--reigns-google)',    ring: '#6C99CA' },
  deepseek:  { bg: 'var(--reigns-deepseek)',  ring: '#9778BF' },
  xai:       { bg: 'var(--reigns-xai)',       ring: '#5C5854' },
  alibaba:   { bg: 'var(--reigns-alibaba)',   ring: '#EDBA65' },
}

export function providerBg(slug: ModelSlug): string {
  return PROVIDER_COLORS[providerOf(slug)]?.bg ?? '#888'
}

export function providerRing(slug: ModelSlug): string {
  return PROVIDER_COLORS[providerOf(slug)]?.ring ?? '#AAA'
}

/**
 * Role-based fill color for card interiors. Matches the civilian / undercover
 * green / red used elsewhere in the app so all role-coloring is consistent.
 */
export function roleFill(role: Role): string {
  return role === 'undercover' ? 'var(--reigns-red)' : 'var(--reigns-green)'
}

/**
 * Cream text color used on top of role-filled cards — tested against both the
 * green and red fills for legibility.
 */
export const CARD_TEXT = '#F5EDDB'
