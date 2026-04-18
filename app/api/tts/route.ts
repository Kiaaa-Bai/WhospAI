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

  const tts = new MsEdgeTTS()
  try {
    // Opus in WebM — higher audio quality per bit than MP3, and fewer
    // decode-time glitches because the codec is newer and the Edge TTS
    // stream is natively Opus. All modern browsers support <audio> playback
    // and Web Audio API decodeAudioData for webm/opus.
    await tts.setMetadata(voice, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS)
  } catch (err) {
    console.error('[tts] setMetadata failed', { voice, err })
    return new Response(JSON.stringify({ error: `TTS init failed: ${String(err)}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { audioStream } = tts.toStream(text)

  // Stream MP3 bytes to the client as they arrive. Convert Node Readable →
  // Web ReadableStream so Next.js can return it.
  const webStream = Readable.toWeb(audioStream) as unknown as ReadableStream<Uint8Array>

  // Close the TTS WebSocket once the stream ends or the client disconnects.
  audioStream.on('end', () => {
    try { tts.close() } catch { /* noop */ }
  })
  audioStream.on('error', () => {
    try { tts.close() } catch { /* noop */ }
  })

  return new Response(webStream, {
    headers: {
      'Content-Type': 'audio/webm',
      'Cache-Control': 'no-store',
    },
  })
}
