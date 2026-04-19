// app/api/tts/route.ts
import { z } from 'zod'
import { Readable } from 'node:stream'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

export const runtime = 'nodejs'
export const maxDuration = 30

const RequestSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  voice: z.string().regex(/^[a-zA-Z]{2,4}-[a-zA-Z]{2,4}-[A-Za-z0-9]+(Neural|Multilingual)?$/, 'invalid voice name'),
})

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

  const { text, voice } = parsed

  // Breadcrumb: log every request with a small fingerprint. Lets us
  // correlate "this model went silent" with the exact voice + text length
  // in Vercel runtime logs.
  const startedAt = Date.now()
  const textPreview = text.slice(0, 40).replace(/\s+/g, ' ')
  console.log(
    `[tts] req voice=${voice} len=${text.length} preview="${textPreview}${text.length > 40 ? '…' : ''}"`,
  )

  const tts = new MsEdgeTTS()
  try {
    // MP3, not Opus/WebM. iOS WebKit's decodeAudioData cannot decode
    // Opus-in-WebM — the promise rejects silently and audio never plays
    // (observed on iPhone Chrome, which is WebKit under the hood). MP3 is
    // the universally-supported decodeAudioData format. We already fully
    // decode the blob before play via Web Audio, so MP3 vs Opus has no
    // buffer-underrun tradeoff here.
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3)
  } catch (err) {
    console.error('[tts] setMetadata failed', { voice, textLen: text.length, err: String(err) })
    return new Response(JSON.stringify({ error: `TTS init failed: ${String(err)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { audioStream } = tts.toStream(text)

  // Track whether any bytes actually flowed through. An Edge TTS silent
  // failure manifests as an immediate 'end' with zero bytes — very useful
  // to distinguish from genuine long-tail successes.
  let bytesSeen = 0
  audioStream.on('data', (chunk: Buffer) => {
    bytesSeen += chunk.length
  })

  // Stream bytes to the client as they arrive. Convert Node Readable → Web
  // ReadableStream so Next.js can return it.
  const webStream = Readable.toWeb(audioStream) as unknown as ReadableStream<Uint8Array>

  audioStream.on('end', () => {
    const ms = Date.now() - startedAt
    if (bytesSeen === 0) {
      console.error(
        `[tts] empty-stream voice=${voice} len=${text.length} ms=${ms} — Edge TTS returned zero bytes`,
      )
    } else {
      console.log(`[tts] ok voice=${voice} len=${text.length} bytes=${bytesSeen} ms=${ms}`)
    }
    try { tts.close() } catch { /* noop */ }
  })
  audioStream.on('error', (err: Error) => {
    const ms = Date.now() - startedAt
    console.error(
      `[tts] stream-error voice=${voice} len=${text.length} bytes=${bytesSeen} ms=${ms} err=${String(err)}`,
    )
    try { tts.close() } catch { /* noop */ }
  })

  return new Response(webStream, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'no-store',
    },
  })
}
