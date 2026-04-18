// app/api/generate-words/route.ts
import { z } from 'zod'
import { generateText, Output } from 'ai'

export const runtime = 'nodejs'
export const maxDuration = 30

const RequestSchema = z.object({
  language: z.enum(['en', 'zh']),
})

const WordPairSchema = z.object({
  civilian: z.string().min(1).max(30),
  undercover: z.string().min(1).max(30),
})

function buildPrompt(language: 'en' | 'zh'): string {
  const langLabel = language === 'zh' ? 'Chinese' : 'English'
  const langRule =
    language === 'zh'
      ? 'Both words MUST be written in Chinese characters.'
      : 'Both words MUST be written in English.'

  return `Generate a word pair for the social deduction game "Who is the Spy".

RULES:
- One "civilian" word (given to the majority) and one "undercover" word
  (given to the minority).
- Both words must be SIMPLE nouns (concrete objects, animals, foods, places,
  activities). No abstract concepts, no adjectives, no verbs.
- They must be RELATED but DISTINCT — similar enough that players might
  confuse them during descriptions, but different enough that careful
  listening can tell them apart.
- Good examples (en): apple / pear · piano / guitar · subway / train · dolphin / shark
- Good examples (zh): 苹果 / 梨 · 钢琴 / 吉他 · 地铁 / 火车 · 海豚 / 鲨鱼
- NEVER pick two synonyms or identical words.
- Each word must be 1–8 characters.
- Language: ${langLabel}. ${langRule}

Output JSON with exactly the two words. Pick something unexpected — avoid
cliché pairs like apple/banana. Be creative but keep it recognizable.`
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

  try {
    const { output } = await generateText({
      model: 'deepseek/deepseek-v3',
      prompt: buildPrompt(parsed.language),
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
