// scripts/dev-engine.ts
import 'dotenv/config'
import { runGame } from '@/lib/game/engine'
import { createRealLLM } from '@/lib/game/llm'
import type { GameEvent } from '@/lib/game/types'

function formatEvent(e: GameEvent): string {
  switch (e.type) {
    case 'game-start':
      return `\n=== GAME START ===\n` + e.players.map(p =>
        `  ${p.id} [${p.role.padEnd(10)}] ${p.displayName.padEnd(20)} word="${p.word}"`,
      ).join('\n') + '\n'
    case 'round-start':     return `\n--- Round ${e.round} ---`
    case 'round-order':     return `  Speaking order: ${e.order.join(' -> ')}`
    case 'phase':           return `  [phase: ${e.phase}]`
    case 'speak-start':     return `  ${e.playerId} speaks...`
    case 'speak-token':     { process.stdout.write(e.delta); return '' }
    case 'think-token':     return ''
    case 'speak-end':       return `\n    (reasoning: ${e.reasoning.slice(0, 100)}...)`
    case 'speak-error':     return `  ${e.playerId} failed: ${e.reason}`
    case 'vote-start':      return `  ${e.playerId} votes...`
    case 'vote-cast':       return `    ${e.vote.voterId} -> ${e.vote.targetId ?? 'ABSTAIN'} (${e.vote.reasoning.slice(0, 80)}...)`
    case 'elimination':     return `  >>> ELIMINATED: ${e.playerId}`
    case 'tie':             return `  TIE: ${e.tiedPlayers.join(', ')}`
    case 'no-elimination':  return `  (no elimination this round)`
    case 'game-over':
      return `\n=== GAME OVER ===\n  Winner: ${e.result.winner}\n  Rounds: ${e.result.rounds}\n`
    case 'error':           return `  ERROR: ${e.message}`
  }
}

async function main() {
  const llm = createRealLLM()
  await runGame(
    { civilianWord: 'apple', undercoverWord: 'pear' },
    (e) => {
      const line = formatEvent(e)
      if (line) console.log(line)
    },
    llm,
  )
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
