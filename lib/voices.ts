/**
 * Voice mapping for Edge TTS playback.
 *
 * Each provider gets a stable English voice and a stable Chinese voice.
 * When speaking, the voice is picked based on the language of the text
 * (inferred from characters). Japanese has a small shared fallback set.
 */
import type { ModelSlug } from './game/types'
import { providerOf } from './avatars'

export type Lang = 'en' | 'zh' | 'ja' | 'other'

type ProviderVoices = {
  en: string
  zh: string
  ja: string
}

// Edge TTS "ShortName" values. Full catalog:
// https://speech.microsoft.com/portal/voicegallery
//
// NOTE: Microsoft silently deprecates voices — a retired voice doesn't 4xx,
// it returns HTTP 200 with zero audio bytes. Two previously-used voices
// (zh-CN-XiaohanNeural, zh-CN-XiaomengNeural) were dropped in late 2024,
// which manifested as xai/alibaba going mute in Chinese games. If a new
// voice goes silent in future, check whether it was retired at
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
const VOICES: Record<string, ProviderVoices> = {
  openai:    { en: 'en-US-AriaNeural',         zh: 'zh-CN-XiaoxiaoNeural', ja: 'ja-JP-NanamiNeural' },
  anthropic: { en: 'en-US-GuyNeural',          zh: 'zh-CN-YunyangNeural',  ja: 'ja-JP-KeitaNeural'  },
  google:    { en: 'en-US-JennyNeural',        zh: 'zh-CN-XiaoyiNeural',   ja: 'ja-JP-NanamiNeural' },
  deepseek:  { en: 'en-US-BrianNeural',        zh: 'zh-CN-YunxiNeural',    ja: 'ja-JP-KeitaNeural'  },
  xai:       { en: 'en-US-ChristopherNeural',  zh: 'zh-CN-YunzeNeural',    ja: 'ja-JP-KeitaNeural'  },
  alibaba:   { en: 'en-US-EmmaNeural',         zh: 'zh-CN-XiaochenNeural', ja: 'ja-JP-NanamiNeural' },
}

const FALLBACK: ProviderVoices = {
  en: 'en-US-AriaNeural',
  zh: 'zh-CN-XiaoxiaoNeural',
  ja: 'ja-JP-NanamiNeural',
}

export function detectTextLanguage(text: string): Lang {
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja'
  if (/[\uac00-\ud7af]/.test(text)) return 'other'
  if (/[\u4e00-\u9fff\u3400-\u4dbf]/.test(text)) return 'zh'
  if (/[a-z]/i.test(text)) return 'en'
  return 'other'
}

export function voiceFor(modelSlug: ModelSlug, text: string): string {
  const provider = providerOf(modelSlug)
  const lang = detectTextLanguage(text)
  const entry = VOICES[provider] ?? FALLBACK
  if (lang === 'ja') return entry.ja
  if (lang === 'zh') return entry.zh
  // en or other → use English voice
  return entry.en
}
