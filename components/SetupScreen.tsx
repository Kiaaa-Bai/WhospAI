'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Detective, Sparkle, Shuffle, Play, MagicWand, CaretRight,
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from './Avatar'
import { ROSTER } from '@/lib/game/roster'
import { WORD_PAIRS } from '@/data/word-pairs'
import type { GameConfig } from '@/lib/game/types'

type Lang = 'en' | 'zh'

export function SetupScreen({ onStart }: { onStart: (config: GameConfig) => void }) {
  const [civilianWord, setCivilianWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')
  const [lang, setLang] = useState<Lang>('en')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)

  const valid =
    civilianWord.trim().length > 0 &&
    undercoverWord.trim().length > 0 &&
    civilianWord.trim() !== undercoverWord.trim() &&
    civilianWord.length <= 30 &&
    undercoverWord.length <= 30

  async function generate() {
    setGenerating(true)
    setGenError(null)
    try {
      const res = await fetch('/api/generate-words', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(body.error ?? 'Generation failed')
      }
      const data = await res.json()
      setCivilianWord(data.civilian)
      setUndercoverWord(data.undercover)
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Top banner */}
      <header className="shrink-0 border-b border-zinc-800 px-8 py-5 flex items-center gap-3">
        <Detective weight="fill" size={28} className="text-amber-400" />
        <div>
          <div className="font-black tracking-[0.2em] text-xl">WHOSPY</div>
          <div className="text-xs text-zinc-500">Watch 6 AI models play Who is the Spy</div>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(420px,45%)_1fr] min-h-0">
        {/* LEFT — word setup */}
        <div className="border-b lg:border-b-0 lg:border-r border-zinc-800 px-8 py-8 flex flex-col gap-8">
          <SectionHeader icon={<MagicWand weight="fill" size={14} />} text="Secret Words" />

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield weight="fill" size={14} className="text-emerald-400" />
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Civilian word
                </label>
              </div>
              <Input
                value={civilianWord}
                onChange={e => setCivilianWord(e.target.value)}
                placeholder={lang === 'zh' ? '苹果' : 'apple'}
                maxLength={30}
                className="text-lg"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Detective weight="fill" size={14} className="text-red-400" />
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
                  Undercover word
                </label>
              </div>
              <Input
                value={undercoverWord}
                onChange={e => setUndercoverWord(e.target.value)}
                placeholder={lang === 'zh' ? '梨' : 'pear'}
                maxLength={30}
                className="text-lg"
              />
            </div>
          </div>

          {/* AI Generate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <SectionHeader
                icon={<Sparkle weight="fill" size={14} />}
                text="Let AI Pick"
                compact
              />
              <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded p-0.5 ml-3">
                <LangToggle value={lang} onChange={setLang} />
              </div>
            </div>
            <button
              onClick={generate}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-500/5 border border-amber-500/40 text-amber-200 hover:from-amber-500/25 hover:to-amber-500/10 hover:border-amber-500/60 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Shuffle weight="fill" size={18} />
                  </motion.span>
                  <span className="font-semibold tracking-wider">GENERATING…</span>
                </>
              ) : (
                <>
                  <Sparkle weight="fill" size={18} />
                  <span className="font-semibold tracking-wider">GENERATE WITH AI</span>
                </>
              )}
            </button>
            {genError && (
              <div className="text-xs text-red-300 bg-red-950/30 border border-red-900/50 rounded px-3 py-2">
                {genError}
              </div>
            )}
          </div>

          {/* Presets */}
          <div>
            <SectionHeader
              icon={<Shuffle weight="fill" size={14} />}
              text="Or Pick a Preset"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {WORD_PAIRS.map(p => (
                <button
                  key={`${p.civilian}-${p.undercover}`}
                  onClick={() => {
                    setCivilianWord(p.civilian)
                    setUndercoverWord(p.undercover)
                  }}
                  className="text-xs px-2.5 py-1.5 rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 transition-colors"
                >
                  {p.civilian} / {p.undercover}
                </button>
              ))}
            </div>
          </div>

          {/* Start */}
          <div className="mt-auto pt-4">
            <Button
              className="w-full h-14 text-base tracking-[0.2em] font-bold"
              size="lg"
              disabled={!valid}
              onClick={() =>
                onStart({
                  civilianWord: civilianWord.trim(),
                  undercoverWord: undercoverWord.trim(),
                })
              }
            >
              <Play weight="fill" size={18} className="mr-1.5" />
              START THE GAME
              <CaretRight weight="fill" size={16} className="ml-1" />
            </Button>
            <div className="text-[10px] text-zinc-600 text-center mt-2">
              6 AIs · 1 undercover · you watch and judge
            </div>
          </div>
        </div>

        {/* RIGHT — roster showcase */}
        <div className="px-8 py-8 bg-zinc-950/80 flex flex-col gap-5">
          <SectionHeader
            icon={<Detective weight="fill" size={14} />}
            text="Tonight's Contestants"
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 content-start">
            {ROSTER.map((r, i) => (
              <motion.div
                key={r.modelSlug}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <Avatar modelSlug={r.modelSlug} size={72} />
                <div className="text-sm font-bold text-zinc-100 text-center">
                  {r.displayName}
                </div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  {r.modelSlug.split('/')[0]}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-auto pt-4 border-t border-zinc-800 text-xs text-zinc-500 leading-relaxed">
            Each AI gets a secret word. One gets a{' '}
            <span className="text-red-300 font-semibold">different</span> word — the{' '}
            <span className="text-red-300 font-semibold">undercover</span>. They describe their
            word in short phrases without saying it, then vote to eliminate the one that sounds
            off. Civilians win if they catch the spy before the final two players.
          </div>
        </div>
      </div>
    </div>
  )
}

function SectionHeader({
  icon,
  text,
  compact,
}: {
  icon: React.ReactNode
  text: string
  compact?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 text-zinc-500 ${compact ? '' : 'mb-0'}`}>
      <span className="text-zinc-400">{icon}</span>
      <span className="text-[11px] font-bold uppercase tracking-[0.2em] shrink-0">{text}</span>
      <div className="flex-1 h-px bg-zinc-800 ml-1" />
    </div>
  )
}

function LangToggle({ value, onChange }: { value: Lang; onChange: (v: Lang) => void }) {
  return (
    <>
      {(['en', 'zh'] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors ${
            value === l ? 'bg-zinc-700 text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
          }`}
        >
          {l}
        </button>
      ))}
    </>
  )
}
