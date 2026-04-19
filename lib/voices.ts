/**
 * Voice mapping for Edge TTS playback.
 *
 * Edge's TTS endpoint (what `msedge-tts` connects to) exposes a strict
 * subset of the full Azure Speech catalog. Always verify voices are in
 * the live subset — `pnpm exec tsx scripts/list-voices.mjs` prints the
 * current list. Voices in Azure but not Edge return HTTP 200 with 0
 * audio bytes.
 *
 * Per-language availability (as of 2026-04-19):
 *   en: 17 voices           → per-provider
 *   zh: 6 standard + 2 dialect → per-provider
 *   ja: 2 voices             → per-provider, but 6 providers share 2 voices
 *   es: 7 voices             → per-provider
 *   fr: 9 voices             → per-provider
 *   de: 6 voices             → per-provider (exactly enough)
 *   ko: 3 voices             → single shared voice (too few for variety)
 *   ru: 2 voices             → single shared voice (too few for variety)
 */
import type { ModelSlug } from './game/types'
import { providerOf } from './avatars'

export type Lang =
  | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru' | 'other'

type Provider = 'openai' | 'anthropic' | 'google' | 'deepseek' | 'xai' | 'alibaba'

/**
 * Per-provider voice table for languages with enough Edge TTS voices
 * that each of our 6 providers can get a distinct character. ja has only
 * 2 voices so it alternates Keita/Nanami across providers.
 */
const PER_PROVIDER: Partial<Record<Lang, Record<Provider, string>>> = {
  en: {
    openai:    'en-US-AriaNeural',
    anthropic: 'en-US-GuyNeural',
    google:    'en-US-JennyNeural',
    deepseek:  'en-US-BrianNeural',
    xai:       'en-US-ChristopherNeural',
    alibaba:   'en-US-EmmaNeural',
  },
  zh: {
    openai:    'zh-CN-XiaoxiaoNeural',
    anthropic: 'zh-CN-YunyangNeural',
    google:    'zh-CN-XiaoyiNeural',
    deepseek:  'zh-CN-YunxiNeural',
    xai:       'zh-CN-YunjianNeural',
    alibaba:   'zh-CN-YunxiaNeural',
  },
  ja: {
    // Only Keita (M) and Nanami (F) exist — alternate for a little variety.
    openai:    'ja-JP-NanamiNeural',
    anthropic: 'ja-JP-KeitaNeural',
    google:    'ja-JP-NanamiNeural',
    deepseek:  'ja-JP-KeitaNeural',
    xai:       'ja-JP-KeitaNeural',
    alibaba:   'ja-JP-NanamiNeural',
  },
  es: {
    openai:    'es-ES-ElviraNeural',
    anthropic: 'es-ES-AlvaroNeural',
    google:    'es-MX-DaliaNeural',
    deepseek:  'es-US-AlonsoNeural',
    xai:       'es-MX-JorgeNeural',
    alibaba:   'es-US-PalomaNeural',
  },
  fr: {
    openai:    'fr-FR-DeniseNeural',
    anthropic: 'fr-FR-HenriNeural',
    google:    'fr-FR-EloiseNeural',
    deepseek:  'fr-FR-RemyMultilingualNeural',
    xai:       'fr-CA-ThierryNeural',
    alibaba:   'fr-FR-VivienneMultilingualNeural',
  },
  de: {
    openai:    'de-DE-KatjaNeural',
    anthropic: 'de-DE-ConradNeural',
    google:    'de-DE-AmalaNeural',
    deepseek:  'de-DE-FlorianMultilingualNeural',
    xai:       'de-DE-KillianNeural',
    alibaba:   'de-DE-SeraphinaMultilingualNeural',
  },
}

/**
 * Languages with fewer than 6 voices on Edge TTS — all providers share
 * a single voice. Less "character" per model, but matching the remote
 * reality instead of pretending.
 */
const SHARED: Partial<Record<Lang, string>> = {
  ko: 'ko-KR-SunHiNeural',
  ru: 'ru-RU-DmitryNeural',
}

const ENGLISH_POOL = PER_PROVIDER.en!

/**
 * Infer language from text by character range. Works for scripts with
 * distinct Unicode blocks (CJK, Hangul, Cyrillic, kana). Latin-alphabet
 * languages (es/fr/de) all look like 'en' and must be disambiguated by
 * the caller-provided `gameLanguage`.
 */
export function detectTextLanguage(text: string): Lang {
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'        // hiragana / katakana
  if (/[\uac00-\ud7af]/.test(text)) return 'ko'                     // hangul
  if (/[\u0400-\u04ff]/.test(text)) return 'ru'                     // cyrillic
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh'        // CJK ideographs
  if (/[a-z]/i.test(text)) return 'en'                              // latin
  return 'other'
}

/**
 * Pick the Edge TTS voice for a player's speech.
 *
 * `gameLanguage` — when provided — overrides character-based detection
 * for Latin-alphabet cases (es/fr/de). CJK/Hangul/Cyrillic detection is
 * trusted either way so that a stray English word mid-game still reads
 * in an English voice.
 */
export function voiceFor(
  modelSlug: ModelSlug,
  text: string,
  gameLanguage?: Lang,
): string {
  const provider = providerOf(modelSlug) as Provider
  let lang = detectTextLanguage(text)

  if (gameLanguage && lang === 'en'
      && (gameLanguage === 'es' || gameLanguage === 'fr' || gameLanguage === 'de')) {
    lang = gameLanguage
  }

  const perProvider = PER_PROVIDER[lang]
  if (perProvider) return perProvider[provider] ?? ENGLISH_POOL[provider]

  const shared = SHARED[lang]
  if (shared) return shared

  return ENGLISH_POOL[provider] ?? 'en-US-AriaNeural'
}

/**
 * "I vote for {name}." localized into the game's language.
 * Short TTS clip played after a vote is committed. Requires explicit
 * `gameLanguage` because the voter's own word isn't enough to
 * distinguish es/fr/de (all Latin).
 */
export function voteAnnouncementText(
  targetName: string,
  gameLanguage: Lang,
): string {
  switch (gameLanguage) {
    case 'zh': return `我投票给 ${targetName}。`
    case 'ja': return `${targetName} に投票します。`
    case 'ko': return `${targetName}에게 투표합니다.`
    case 'es': return `Voto por ${targetName}.`
    case 'fr': return `Je vote pour ${targetName}.`
    case 'de': return `Ich stimme für ${targetName}.`
    case 'ru': return `Я голосую за ${targetName}.`
    default:   return `I vote for ${targetName}.`
  }
}
