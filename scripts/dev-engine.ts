// scripts/dev-engine.ts
import { runGame } from '@/lib/game/engine'
import { createMockLLM, mockKey } from '@/lib/game/mock-llm'
import type { GameEvent } from '@/lib/game/types'

function buildScript() {
  const describes: Record<string, { reasoning: string; statement: string }> = {}
  const votes: Record<string, { reasoning: string; targetPlayerId: string }> = {}

  const statements: Record<string, string> = {
    p1: 'Often red in color.',
    p2: 'Crunchy when bitten.',
    p3: 'Typically green or yellow.',
    p4: 'Newton had one fall on him.',
    p5: 'A tech company uses it as logo.',
    p6: 'Ripens in autumn.',
  }

  for (const id of ['p1','p2','p3','p4','p5','p6']) {
    for (let r = 1; r <= 6; r++) {
      describes[mockKey(id as any, r)] = {
        reasoning: `I suspect p3 because their description (green/yellow) doesn't match mine.`,
        statement: statements[id],
      }
      votes[mockKey(id as any, r)] = {
        reasoning: `p3 says green/yellow, I say red. Suspicious.`,
        targetPlayerId: id === 'p3' ? 'p1' : 'p3',
      }
    }
  }

  return { describes, votes }
}

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
    case 'speak-token':     return ''
    case 'speak-end':       return `    "${e.statement.text}"\n    (reasoning: ${e.reasoning.slice(0, 80)}...)`
    case 'speak-error':     return `  ${e.playerId} failed: ${e.reason}`
    case 'vote-start':      return `  ${e.playerId} votes...`
    case 'vote-cast':       return `    ${e.vote.voterId} -> ${e.vote.targetId ?? 'ABSTAIN'} (${e.vote.reasoning.slice(0, 60)}...)`
    case 'elimination':     return `  >>> ELIMINATED: ${e.playerId}`
    case 'tie':             return `  TIE: ${e.tiedPlayers.join(', ')}`
    case 'no-elimination':  return `  (no elimination this round)`
    case 'game-over':
      return `\n=== GAME OVER ===\n  Winner: ${e.result.winner}\n  Rounds: ${e.result.rounds}\n`
    case 'error':           return `  ERROR: ${e.message}`
  }
}

async function main() {
  const llm = createMockLLM(buildScript())
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
