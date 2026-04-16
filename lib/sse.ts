import type { GameEvent } from './game/types'

export function createSSEStream(
  runner: (emit: (event: GameEvent) => void) => Promise<unknown>,
): Response {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: GameEvent) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          /* stream may be closed */
        }
      }

      try {
        await runner(emit)
      } catch (err) {
        emit({ type: 'error', message: String(err) })
      } finally {
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
