/**
 * Voice selection for TTS playback.
 *
 * Browsers expose a list of system voices via `speechSynthesis.getVoices()`.
 * We assign a DISTINCT voice to each provider (stable mapping) and use the
 * voice matching the secret word's language when speaking.
 */
import type { ModelSlug } from './game/types'
import { providerOf } from './avatars'

export type Lang = 'en' | 'zh' | 'ja' | 'other'

const PROVIDER_ORDER = [
  'openai',
  'anthropic',
  'google',
  'deepseek',
  'xai',
  'alibaba',
] as const

type ProviderName = (typeof PROVIDER_ORDER)[number]

/**
 * Returns true when the SpeechSynthesis API is available in this environment.
 */
export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function matchesLang(voice: SpeechSynthesisVoice, lang: Lang): boolean {
  const l = voice.lang.toLowerCase()
  switch (lang) {
    case 'zh': return l.startsWith('zh') || l.startsWith('cmn') || l.startsWith('yue')
    case 'en': return l.startsWith('en')
    case 'ja': return l.startsWith('ja')
    case 'other': return true
  }
}

/**
 * Build a per-provider voice map for a given language. Picks `n` distinct
 * voices that match the language (by `voice.lang`), then distributes them
 * round-robin across the 6 providers so each provider gets a stable voice.
 *
 * If no voices match the language, falls back to any available voice.
 * If the browser has no voices at all, returns an empty map.
 */
function buildVoiceMap(
  voices: SpeechSynthesisVoice[],
  lang: Lang,
): Map<ProviderName, SpeechSynthesisVoice> {
  const map = new Map<ProviderName, SpeechSynthesisVoice>()
  if (voices.length === 0) return map

  let pool = voices.filter(v => matchesLang(v, lang))
  if (pool.length === 0) pool = voices.slice()

  // Prefer local voices over network ones for latency.
  pool.sort((a, b) => Number(b.localService) - Number(a.localService))

  // Dedupe by name (some systems expose duplicates with different URIs).
  const seen = new Set<string>()
  const uniquePool: SpeechSynthesisVoice[] = []
  for (const v of pool) {
    if (seen.has(v.name)) continue
    seen.add(v.name)
    uniquePool.push(v)
  }

  PROVIDER_ORDER.forEach((provider, idx) => {
    if (uniquePool.length === 0) return
    map.set(provider, uniquePool[idx % uniquePool.length])
  })

  return map
}

/**
 * Waits for voices to be loaded. On Chrome the list is populated
 * asynchronously — `voiceschanged` fires once. Resolves with whatever
 * is available (possibly empty) after ~500ms worst-case.
 */
export async function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return []
  const synth = window.speechSynthesis
  const immediate = synth.getVoices()
  if (immediate.length > 0) return immediate

  return new Promise<SpeechSynthesisVoice[]>(resolve => {
    const timer = setTimeout(() => {
      synth.removeEventListener('voiceschanged', handler)
      resolve(synth.getVoices())
    }, 500)
    const handler = () => {
      clearTimeout(timer)
      synth.removeEventListener('voiceschanged', handler)
      resolve(synth.getVoices())
    }
    synth.addEventListener('voiceschanged', handler)
  })
}

export class VoiceRegistry {
  private maps: Partial<Record<Lang, Map<ProviderName, SpeechSynthesisVoice>>> = {}

  constructor(voices: SpeechSynthesisVoice[]) {
    this.maps.en = buildVoiceMap(voices, 'en')
    this.maps.zh = buildVoiceMap(voices, 'zh')
    this.maps.ja = buildVoiceMap(voices, 'ja')
    this.maps.other = buildVoiceMap(voices, 'other')
  }

  voiceFor(modelSlug: ModelSlug, lang: Lang): SpeechSynthesisVoice | null {
    const provider = providerOf(modelSlug) as ProviderName
    const map = this.maps[lang] ?? this.maps.other
    if (!map) return null
    return map.get(provider) ?? null
  }
}

/**
 * Detect language of a piece of text — used to pick a voice.
 * Matches the detection in prompts.ts, kept private to avoid a cycle.
 */
export function detectTextLanguage(text: string): Lang {
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'
  if (/[\uac00-\ud7af]/.test(text)) return 'other' // Korean → fall back
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh'
  if (/[a-z]/i.test(text)) return 'en'
  return 'other'
}
