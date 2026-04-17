// lib/game/phases.ts
import type { Emit, Player, PlayerId, Statement, Vote } from './types'
import type { LLM } from './llm'
import type { RoundContext } from './prompts'
import { buildSystemPrompt, buildDescribePrompt, buildVotePrompt } from './prompts'
import { resolveVotes } from './scoring'
import type { VoteResolution } from './scoring'

const DESCRIBE_TIMEOUT_MS = 20_000
const VOTE_TIMEOUT_MS = 15_000
const RATE_LIMIT_BACKOFF_MS = 3_000

function isRateLimitError(err: unknown): boolean {
  const msg = String(err).toLowerCase()
  return msg.includes('ratelimit') || msg.includes('rate_limit') || msg.includes('rate limit') || msg.includes('429')
}

async function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
      onReasoningToken: (delta) => {
        emit({ type: 'think-token', playerId: player.id, delta })
      },
      signal: AbortSignal.timeout(DESCRIBE_TIMEOUT_MS),
    })

    const statement: Statement = {
      playerId: player.id,
      round: ctx.round,
      text: out.statement,
    }
    emit({ type: 'speak-end', statement, reasoning: out.summary })
    return statement
  }

  try {
    return await attempt()
  } catch (firstErr) {
    console.error(`[describe] ${player.modelSlug} first attempt failed:`, String(firstErr))
    if (isRateLimitError(firstErr)) await wait(RATE_LIMIT_BACKOFF_MS)
    try {
      return await attempt()
    } catch (err) {
      console.error(`[describe] ${player.modelSlug} second attempt failed:`, String(err))
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
      reasoning: out.summary,
    }
  }

  let vote: Vote
  try {
    vote = await attempt()
    if (vote.targetId === null) {
      try { vote = await attempt() } catch { /* keep null */ }
    }
  } catch (firstErr) {
    if (isRateLimitError(firstErr)) await wait(RATE_LIMIT_BACKOFF_MS)
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

/**
 * Tiebreak: tied players give ONE more statement and ALL alive players revote.
 * If still tied, returns no-elimination. Otherwise returns the new elimination.
 */
export async function runTiebreak(
  tiedIds: PlayerId[],
  players: Player[],
  round: number,
  emit: Emit,
  llm: LLM,
): Promise<VoteResolution | { kind: 'no-elimination' }> {
  emit({ type: 'phase', phase: 'tiebreak' })

  const alivePlayers = players.filter(p => !p.eliminated)
  const tiedPlayers = alivePlayers.filter(p => tiedIds.includes(p.id))

  // collect prior round statements for context
  const ctx: RoundContext = { players, statements: [], round }

  // tied players give one more statement
  for (const p of tiedPlayers) {
    const stmt = await runDescribe(p, ctx, emit, llm)
    if (stmt) ctx.statements.push(stmt)
  }

  // only NON-TIED alive players vote; tied players cannot vote
  const voters = alivePlayers.filter(p => !tiedIds.includes(p.id))
  const votes: Vote[] = []
  for (const voter of voters) {
    // restrict valid targets to only tied players
    const restrictedCtx: RoundContext = {
      ...ctx,
      players: players.map(p =>
        tiedIds.includes(p.id) || p.id === voter.id ? p : { ...p, eliminated: true }
      ),
    }
    const vote = await runVote(voter, restrictedCtx, emit, llm)
    if (vote) votes.push(vote)
  }

  const resolution = resolveVotes(votes, alivePlayers.filter(p => tiedIds.includes(p.id)))

  if (resolution.kind === 'elimination') {
    emit({ type: 'elimination', playerId: resolution.targetId, tally: resolution.tally })
    return resolution
  }

  emit({ type: 'no-elimination' })
  return { kind: 'no-elimination' }
}
