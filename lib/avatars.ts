import type { ModelSlug } from './game/types'

export function providerOf(slug: ModelSlug): string {
  return slug.split('/')[0]
}

export function avatarPath(slug: ModelSlug): string {
  return `/avatars/${providerOf(slug)}.png`
}

export function providerInitial(slug: ModelSlug): string {
  const map: Record<string, string> = {
    openai: 'O', anthropic: 'A', google: 'G',
    deepseek: 'D', xai: 'X', alibaba: 'Q',
  }
  return map[providerOf(slug)] ?? '?'
}

export function providerColor(slug: ModelSlug): string {
  const map: Record<string, string> = {
    openai: 'bg-emerald-700',
    anthropic: 'bg-orange-700',
    google: 'bg-blue-700',
    deepseek: 'bg-indigo-700',
    xai: 'bg-zinc-700',
    alibaba: 'bg-purple-700',
  }
  return map[providerOf(slug)] ?? 'bg-zinc-700'
}
