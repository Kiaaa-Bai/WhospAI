// app/api/generate-words/route.ts
import { z } from 'zod'
import { generateText, Output } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 30

const RequestSchema = z.object({
  language: z.enum(['en', 'zh', 'ja', 'ko', 'es', 'fr', 'de', 'ru']),
})

const LANGUAGE_INFO: Record<
  z.infer<typeof RequestSchema>['language'],
  { name: string; rule: string; examples: string }
> = {
  en: {
    name: 'English',
    rule: 'Both words MUST be written in English.',
    examples: 'apple / pear · piano / guitar · subway / train · dolphin / shark',
  },
  zh: {
    name: 'Chinese',
    rule: 'Both words MUST be written in Chinese characters.',
    examples: '苹果 / 梨 · 钢琴 / 吉他 · 地铁 / 火车 · 海豚 / 鲨鱼',
  },
  ja: {
    name: 'Japanese',
    rule: 'Both words MUST be written in Japanese (hiragana, katakana, or kanji as natural).',
    examples: 'りんご / 梨 · ピアノ / ギター · 地下鉄 / 電車 · イルカ / サメ',
  },
  ko: {
    name: 'Korean',
    rule: 'Both words MUST be written in Korean Hangul.',
    examples: '사과 / 배 · 피아노 / 기타 · 지하철 / 기차 · 돌고래 / 상어',
  },
  es: {
    name: 'Spanish',
    rule: 'Both words MUST be written in Spanish.',
    examples: 'manzana / pera · piano / guitarra · metro / tren · delfín / tiburón',
  },
  fr: {
    name: 'French',
    rule: 'Both words MUST be written in French.',
    examples: 'pomme / poire · piano / guitare · métro / train · dauphin / requin',
  },
  de: {
    name: 'German',
    rule: 'Both words MUST be written in German.',
    examples: 'Apfel / Birne · Klavier / Gitarre · U-Bahn / Zug · Delfin / Hai',
  },
  ru: {
    name: 'Russian',
    rule: 'Both words MUST be written in Russian (Cyrillic).',
    examples: 'яблоко / груша · пианино / гитара · метро / поезд · дельфин / акула',
  },
}

const WordPairSchema = z.object({
  civilian: z.string().min(1).max(30),
  undercover: z.string().min(1).max(30),
})

/**
 * Categories the model can be asked to draw from. Injecting a random
 * category per call is the single biggest lever for variety — without it,
 * LLMs converge on the same handful of "obvious" pairs every time even at
 * temperature 1.0.
 */
const CATEGORIES = [
  'foods and drinks',
  'fruits and vegetables',
  'animals (land, sea, or flying)',
  'musical instruments',
  'sports and games',
  'vehicles and transportation',
  'tools and utensils',
  'clothing and accessories',
  'household appliances',
  'furniture',
  'buildings and public places',
  'natural geography (mountains, rivers, biomes)',
  'weather and natural phenomena',
  'stationery and office supplies',
  'electronics and gadgets',
  'body parts',
  'professions and occupations',
  'toys and childhood objects',
  'desserts and snacks',
  'plants, flowers, and trees',
  'cooking ingredients and spices',
  'footwear',
  'drinks and beverages',
  'containers (boxes, bottles, bags)',
  'celebrations and holiday items',
] as const

function buildPrompt(
  language: z.infer<typeof RequestSchema>['language'],
  category: string,
  nonce: string,
): string {
  const info = LANGUAGE_INFO[language]

  return `Generate a word pair for the social deduction game "Who is the Spy".

RULES:
- One "civilian" word (given to the majority) and one "undercover" word
  (given to the minority).
- Both words must be SIMPLE nouns (concrete objects, animals, foods, places,
  activities). No abstract concepts, no adjectives, no verbs.
- They must be RELATED but DISTINCT — similar enough that players might
  confuse them during descriptions, but different enough that careful
  listening can tell them apart.
- Good examples (${info.name}): ${info.examples}
- NEVER pick two synonyms or identical words.
- Each word must be 1–8 characters.
- Language: ${info.name}. ${info.rule}

VARIETY REQUIREMENT:
- Pick your pair from this category: ${category}.
- Do NOT reuse any of the example pairs listed above; think of something fresh.
- Variety seed: ${nonce} (use this to diversify — do not output it).

Output JSON with exactly the two words. Pick something unexpected — avoid
cliché pairs. Be creative but keep it recognizable.`
}

export async function POST(req: Request) {
  let parsed
  try {
    parsed = RequestSchema.parse(await req.json())
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)]
  const nonce = Math.random().toString(36).slice(2, 10)

  try {
    const { output } = await generateText({
      model: 'deepseek/deepseek-v3',
      prompt: buildPrompt(parsed.language, category, nonce),
      temperature: 1.0,        // crank variety so repeated clicks give new pairs
      abortSignal: AbortSignal.timeout(15_000),
      output: Output.object({ schema: WordPairSchema }),
    })

    if (output.civilian.trim() === output.undercover.trim()) {
      return new Response(
        JSON.stringify({ error: 'Generated words were identical; try again' }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      )
    }

    return new Response(
      JSON.stringify({ civilian: output.civilian.trim(), undercover: output.undercover.trim() }),
      { headers: { 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('[generate-words] failed', err)
    return new Response(
      JSON.stringify({ error: `Generation failed: ${String(err)}` }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
