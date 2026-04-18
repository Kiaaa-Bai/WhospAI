'use client'
import { FilmSlate, HandPointing, HourglassMedium, Scales, Skull } from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import type { GameState } from '@/hooks/useGameReducer'
import type { Player, Statement, Vote } from '@/lib/game/types'

interface RowKey {
  round: number
  tiebreak: boolean
}

/**
 * Renders a 6-column × N-row grid (one column per player, one row per
 * round-or-tiebreak). All cells in a row share the same height because
 * they're laid out in a single CSS grid (auto-rows align via grid).
 *
 * Tiebreak rounds get their own row distinct from the normal round, so a
 * player who spoke twice (initial + tiebreak revision) shows BOTH cells.
 */
export function HistoryStrip({ state }: { state: GameState }) {
  const allEntries: Array<Statement | Vote> = [...state.statements, ...state.votes]
  const rowSet = new Map<string, RowKey>()
  for (const entry of allEntries) {
    const tiebreak = !!entry.tiebreak
    const key = `${entry.round}-${tiebreak ? 't' : 'r'}`
    if (!rowSet.has(key)) rowSet.set(key, { round: entry.round, tiebreak })
  }
  const rows = Array.from(rowSet.values()).sort(
    (a, b) => a.round - b.round || (a.tiebreak ? 1 : 0) - (b.tiebreak ? 1 : 0),
  )

  if (rows.length === 0) {
    return (
      <div
        className="col-span-6 text-[10px] font-mono leading-tight rounded px-2 py-1.5 italic text-center"
        style={{
          background: 'rgba(0,0,0,0.05)',
          border: '2px dashed var(--reigns-border-soft)',
          color: 'var(--reigns-ink-faint)',
        }}
      >
        no rounds yet
      </div>
    )
  }

  const currentRound = state.round
  const describeOngoing = state.phase === 'describe' || state.phase === 'tiebreak'

  return (
    <>
      {rows.flatMap(row =>
        state.players.map(p => (
          <Cell
            key={`${row.round}-${row.tiebreak}-${p.id}`}
            player={p}
            row={row}
            state={state}
            currentRound={currentRound}
            describeOngoing={describeOngoing}
          />
        )),
      )}
    </>
  )
}

function Cell({
  player,
  row,
  state,
  currentRound,
  describeOngoing,
}: {
  player: Player
  row: RowKey
  state: GameState
  currentRound: number
  describeOngoing: boolean
}) {
  const stmt = state.statements.find(
    s => s.playerId === player.id && s.round === row.round && !!s.tiebreak === row.tiebreak,
  )
  const vote = state.votes.find(
    v => v.voterId === player.id && v.round === row.round && !!v.tiebreak === row.tiebreak,
  )
  const target = vote?.targetId
    ? state.players.find(pp => pp.id === vote.targetId)
    : null

  const eliminatedBefore =
    player.eliminated &&
    typeof player.eliminatedRound === 'number' &&
    player.eliminatedRound < row.round

  const phaseOpenForThisRow =
    row.round === currentRound &&
    describeOngoing &&
    (row.tiebreak ? state.phase === 'tiebreak' : state.phase === 'describe')

  let statementCell: React.ReactNode
  if (eliminatedBefore) {
    statementCell = <Skull weight="fill" size={12} style={{ color: 'var(--reigns-ink-faint)' }} className="inline" />
  } else if (stmt) {
    statementCell = stmt.text
  } else if (phaseOpenForThisRow) {
    statementCell = <span className="text-zinc-700">&nbsp;</span>
  } else if (row.tiebreak) {
    // Tiebreak rows only have content for tied players — others stay blank.
    statementCell = <span className="text-zinc-700">&nbsp;</span>
  } else {
    statementCell = (
      <HourglassMedium weight="fill" size={12} style={{ color: 'var(--reigns-ink-faint)' }} className="inline" />
    )
  }

  let voteCell: React.ReactNode = null
  if (!eliminatedBefore) {
    if (vote && target) {
      voteCell = (
        <>
          <HandPointing weight="fill" size={12} />
          <Avatar modelSlug={target.modelSlug} size={18} />
        </>
      )
    } else if (vote && vote.targetId === null) {
      voteCell = <HourglassMedium weight="fill" size={12} style={{ color: 'var(--reigns-ink-faint)' }} />
    }
  }

  const LabelIcon = row.tiebreak ? Scales : FilmSlate

  return (
    <div
      className="text-[11px] leading-tight rounded px-2 py-1.5 flex flex-col"
      style={{
        background: '#FAF2DF',
        border: '2px solid var(--reigns-border-soft)',
      }}
    >
      <div
        className="flex items-center gap-1 text-[10px] font-mono font-bold"
        style={{ color: row.tiebreak ? 'var(--reigns-gold)' : 'var(--reigns-ink-faint)' }}
      >
        <LabelIcon weight="fill" size={11} />
        <span>{row.round}</span>
      </div>
      <div
        className="flex-1 break-words whitespace-normal min-h-[16px]"
        style={{ color: 'var(--reigns-ink)' }}
      >
        {statementCell}
      </div>
      <div
        className="flex items-center gap-1 min-h-[20px] mt-0.5"
        style={{ color: 'var(--reigns-gold)' }}
      >
        {voteCell}
      </div>
    </div>
  )
}
