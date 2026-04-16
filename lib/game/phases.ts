// lib/game/phases.ts
import type { Emit, Player, PlayerId, Statement, Vote } from './types'
import type { LLM } from './llm'
import type { RoundContext } from './prompts'
import { buildSystemPrompt, buildDescribePrompt, buildVotePrompt } from './prompts'

const DESCRIBE_TIMEOUT_MS = 30_000
const VOTE_TIMEOUT_MS = 20_000

export async function runDescribe(
  player: Player,
  ctx: RoundContext,
  emit: Emit,
  llm: LLM,
): Promise<Statement | null> {
  emit({ type: 'speak-start', playerId: player.id })

  const system = buildSystemPrompt(player)
  const prompt = buildDescribePrompt(player, ctx)

  const attempt = async (): Promise<Statement> => {
    let accumulated = ''
    const out = await llm.describe({
      modelSlug: player.modelSlug,
      system,
      prompt,
      onToken: (delta) => {
        accumulated += delta
        emit({ type: 'speak-token', playerId: player.id, delta })
      },
      signal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS),
    })

    const statement: Statement = {
      playerId: player.id,
      round: ctx.round,
      text: out.statement,
    }
    emit({ type: 'speak-end', statement, reasoning: out.reasoning })
    return statement
  }

  try {
    return await attempt()
  } catch {
    try {
      return await attempt()
    } catch (err) {
      emit({ type: 'speak-error', playerId: player.id, reason: String(err) })
      return null
    }
  }
}

export async function runVote(
  voter: Player,
  ctx: RoundContext,
  emit: Emit,
  llm: LLM,
): Promise<Vote | null> {
  emit({ type: 'vote-start', playerId: voter.id })

  const system = buildSystemPrompt(voter)
  const prompt = buildVotePrompt(voter, ctx)
  const aliveIds = new Set(
    ctx.players.filter(p => !p.eliminated && p.id !== voter.id).map(p => p.id),
  )

  const attempt = async (): Promise<Vote> => {
    const out = await llm.vote({
      modelSlug: voter.modelSlug,
      system,
      prompt,
      signal: AbortSignal.timeout(VOTE_TIMEOUT_MS),
    })

    const target = out.targetPlayerId as PlayerId
    const validTarget = aliveIds.has(target) ? target : null

    return {
      voterId: voter.id,
      targetId: validTarget,
      round: ctx.round,
      reasoning: out.reasoning,
    }
  }

  let vote: Vote
  try {
    vote = await attempt()
    if (vote.targetId === null) {
      try { vote = await attempt() } catch { /* keep null */ }
    }
  } catch {
    try {
      vote = await attempt()
    } catch (err) {
      vote = {
        voterId: voter.id,
        targetId: null,
        round: ctx.round,
        reasoning: `(failed: ${String(err)})`,
      }
    }
  }

  emit({ type: 'vote-cast', vote })
  return vote
}
