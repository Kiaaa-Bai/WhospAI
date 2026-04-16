// app/page.tsx
'use client'
import { useState } from 'react'
import { useGameSSE } from '@/hooks/useGameSSE'
import { useGameReducer } from '@/hooks/useGameReducer'

export default function Home() {
  const [state, dispatch] = useGameReducer()
  const { start, status, error } = useGameSSE(e => dispatch(e))

  const [civilianWord, setCivilianWord] = useState('apple')
  const [undercoverWord, setUndercoverWord] = useState('pear')

  return (
    <main className="p-8 font-mono text-sm max-w-4xl mx-auto">
      <h1 className="text-2xl mb-4">Whospy (dev)</h1>

      {state.phase === 'setup' && status !== 'streaming' && (
        <div className="space-y-2">
          <div>
            <label className="block">Civilian word</label>
            <input className="border px-2 py-1" value={civilianWord} onChange={e => setCivilianWord(e.target.value)} />
          </div>
          <div>
            <label className="block">Undercover word</label>
            <input className="border px-2 py-1" value={undercoverWord} onChange={e => setUndercoverWord(e.target.value)} />
          </div>
          <button
            className="bg-blue-600 text-white px-3 py-1"
            onClick={() => start({ civilianWord, undercoverWord })}
          >
            Start
          </button>
        </div>
      )}

      {status === 'streaming' && <p>Streaming…</p>}
      {error && <pre className="text-red-600">{error}</pre>}

      {state.players.length > 0 && (
        <section className="mt-6">
          <h2 className="font-bold">Players</h2>
          <ul>
            {state.players.map(p => (
              <li key={p.id} className={p.eliminated ? 'line-through opacity-50' : ''}>
                {p.id} · {p.displayName} · {p.role} · word="{p.word}"
                {state.currentSpeech[p.id] && <>: "{state.currentSpeech[p.id]}"</>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6">
        <h2 className="font-bold">Round {state.round} · Phase: {state.phase}</h2>
      </section>

      {state.result && (
        <section className="mt-6 p-4 bg-green-100">
          <h2 className="font-bold">Game Over</h2>
          <p>Winner: {state.result.winner} · Rounds: {state.result.rounds}</p>
        </section>
      )}

      <details className="mt-6">
        <summary>Raw history ({state.history.length} eliminations)</summary>
        <pre className="text-xs">{JSON.stringify(state.history, null, 2)}</pre>
      </details>
    </main>
  )
}
