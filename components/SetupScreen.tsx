'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ROSTER } from '@/lib/game/roster'
import { WORD_PAIRS } from '@/data/word-pairs'
import type { GameConfig } from '@/lib/game/types'

export function SetupScreen({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [civilianWord, setCivilianWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')

  const valid =
    civilianWord.trim().length > 0 &&
    undercoverWord.trim().length > 0 &&
    civilianWord.trim() !== undercoverWord.trim() &&
    civilianWord.length <= 30 &&
    undercoverWord.length <= 30

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-zinc-950 to-zinc-900 text-zinc-100">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight">Whospy</h1>
          <p className="mt-2 text-zinc-400">Watch 6 AIs play &quot;Who is the Spy&quot;</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm block mb-1 text-zinc-300">Civilian word</label>
            <Input
              value={civilianWord}
              onChange={e => setCivilianWord(e.target.value)}
              placeholder="e.g., apple"
              maxLength={30}
            />
          </div>
          <div>
            <label className="text-sm block mb-1 text-zinc-300">Undercover word</label>
            <Input
              value={undercoverWord}
              onChange={e => setUndercoverWord(e.target.value)}
              placeholder="e.g., pear"
              maxLength={30}
            />
          </div>
        </div>

        <div>
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Or try a preset</div>
          <div className="flex flex-wrap gap-2">
            {WORD_PAIRS.map(p => (
              <button
                key={`${p.civilian}-${p.undercover}`}
                onClick={() => {
                  setCivilianWord(p.civilian)
                  setUndercoverWord(p.undercover)
                }}
                className="text-xs px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300 transition-colors"
              >
                {p.civilian} / {p.undercover}
              </button>
            ))}
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          disabled={!valid}
          onClick={() => onStart({ civilianWord: civilianWord.trim(), undercoverWord: undercoverWord.trim() })}
        >
          Start the game
        </Button>

        <div className="pt-4 border-t border-zinc-800">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Tonight&apos;s roster</div>
          <ul className="text-sm text-zinc-400 grid grid-cols-2 gap-x-4 gap-y-1">
            {ROSTER.map(r => <li key={r.modelSlug}>&bull; {r.displayName}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}
