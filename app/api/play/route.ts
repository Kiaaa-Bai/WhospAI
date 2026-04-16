import { z } from 'zod'
import { createSSEStream } from '@/lib/sse'
import { runGame } from '@/lib/game/engine'
import { createRealLLM } from '@/lib/game/llm'

export const runtime = 'nodejs'
export const maxDuration = 300

const WordSchema = z.string().trim().min(1).max(30)
const ConfigSchema = z.object({
  civilianWord: WordSchema,
  undercoverWord: WordSchema,
}).refine(d => d.civilianWord !== d.undercoverWord, {
  message: 'Words must differ',
})

export async function POST(req: Request) {
  let config
  try {
    config = ConfigSchema.parse(await req.json())
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const llm = createRealLLM()
  return createSSEStream(emit => runGame(config, emit, llm))
}
