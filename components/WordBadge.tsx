import type { Role } from '@/lib/game/types'

export function WordBadge({ word, role }: { word: string; role: Role }) {
  const color = role === 'undercover'
    ? 'bg-red-950 text-red-200 border-red-800'
    : 'bg-emerald-950 text-emerald-200 border-emerald-800'
  const dot = role === 'undercover' ? 'bg-red-400' : 'bg-emerald-400'

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs border ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      <span className="font-medium">{word}</span>
    </div>
  )
}
