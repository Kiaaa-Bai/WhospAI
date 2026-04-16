'use client'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import type { GameResult } from '@/lib/game/types'
import { ROSTER } from '@/lib/game/roster'

export function GameOverOverlay({
  result,
  onPlayAgain,
}: {
  result: GameResult
  onPlayAgain: () => void
}) {
  const title = result.winner === 'civilians' ? 'Civilians win!' : 'Undercover wins!'
  const color = result.winner === 'civilians' ? 'text-emerald-300' : 'text-red-300'

  const displayName = (slug: string) =>
    ROSTER.find(r => r.modelSlug === slug)?.displayName ?? slug

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
    >
      <motion.div
        initial={{ scale: 0.9, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        className="max-w-md w-full p-6 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100"
      >
        <h2 className={`text-3xl font-bold ${color}`}>{title}</h2>
        <p className="mt-1 text-zinc-400 text-sm">{result.rounds} rounds played.</p>

        <div className="mt-4 space-y-1 text-sm">
          {result.players.map((p, i) => (
            <div key={i} className="flex items-center justify-between">
              <span>{displayName(p.modelSlug)}</span>
              <span className="text-zinc-500">
                {p.role}
                {p.eliminated ? ` \u00B7 out R${p.eliminatedRound}` : ' \u00B7 survived'}
              </span>
            </div>
          ))}
        </div>

        <Button className="mt-6 w-full" onClick={onPlayAgain}>Play again</Button>
      </motion.div>
    </motion.div>
  )
}
