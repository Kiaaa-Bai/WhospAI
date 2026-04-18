'use client'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Detective, Sparkle, Shuffle, Play, MagicWand, CaretRight,
} from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { ROSTER } from '@/lib/game/roster'
import { WORD_PAIRS } from '@/data/word-pairs'
import { providerBg } from '@/lib/provider-colors'
import type { GameConfig } from '@/lib/game/types'

type Lang = 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru'

const LANGUAGES: Array<{ code: Lang; label: string; placeholderCivilian: string; placeholderUndercover: string }> = [
  { code: 'en', label: 'EN', placeholderCivilian: 'apple',  placeholderUndercover: 'pear' },
  { code: 'zh', label: '中',  placeholderCivilian: '苹果',   placeholderUndercover: '梨' },
  { code: 'ja', label: '日',  placeholderCivilian: 'りんご', placeholderUndercover: '梨' },
  { code: 'ko', label: '한',  placeholderCivilian: '사과',   placeholderUndercover: '배' },
  { code: 'es', label: 'ES', placeholderCivilian: 'manzana', placeholderUndercover: 'pera' },
  { code: 'fr', label: 'FR', placeholderCivilian: 'pomme',  placeholderUndercover: 'poire' },
  { code: 'de', label: 'DE', placeholderCivilian: 'Apfel',  placeholderUndercover: 'Birne' },
  { code: 'ru', label: 'RU', placeholderCivilian: 'яблоко', placeholderUndercover: 'груша' },
]

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
    <div
      className="min-h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'var(--reigns-bg)', color: 'var(--reigns-ink)' }}
    >
      {/* Dark accent banner */}
      <header
        className="shrink-0 px-8 py-5 flex items-center gap-3"
        style={{
          background: 'var(--reigns-accent-strip)',
          color: '#F5EDDB',
          borderBottom: '3px solid var(--reigns-ink)',
        }}
      >
        <Detective weight="fill" size={28} style={{ color: 'var(--reigns-gold)' }} />
        <div>
          <div className="font-heading font-black tracking-[0.3em] text-xl">WHOSPY</div>
          <div className="text-xs font-mono opacity-80">
            Watch 6 AI models play Who is the Spy
          </div>
        </div>
      </header>

      {/* Two-column body */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(420px,45%)_1fr] min-h-0">
        {/* LEFT — word setup */}
        <div
          className="border-b lg:border-b-0 lg:border-r px-8 py-8 flex flex-col gap-7"
          style={{ borderColor: 'var(--reigns-border)' }}
        >
          <SectionHeader icon={<MagicWand weight="fill" size={14} />} text="Secret Words" />

          {/* Inputs */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Shield weight="fill" size={14} style={{ color: 'var(--reigns-green)' }} />
                <label
                  className="text-xs font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--reigns-ink-soft)' }}
                >
                  Civilian word
                </label>
              </div>
              <input
                value={civilianWord}
                onChange={e => setCivilianWord(e.target.value)}
                placeholder={LANGUAGES.find(l => l.code === lang)!.placeholderCivilian}
                maxLength={30}
                className="w-full px-4 py-3 rounded-lg text-lg font-sans outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: '#FAF2DF',
                  border: '2px solid var(--reigns-ink)',
                  color: 'var(--reigns-ink)',
                  boxShadow: '3px 3px 0 0 var(--reigns-ink)',
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Detective weight="fill" size={14} style={{ color: 'var(--reigns-red)' }} />
                <label
                  className="text-xs font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--reigns-ink-soft)' }}
                >
                  Undercover word
                </label>
              </div>
              <input
                value={undercoverWord}
                onChange={e => setUndercoverWord(e.target.value)}
                placeholder={LANGUAGES.find(l => l.code === lang)!.placeholderUndercover}
                maxLength={30}
                className="w-full px-4 py-3 rounded-lg text-lg font-sans outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: '#FAF2DF',
                  border: '2px solid var(--reigns-ink)',
                  color: 'var(--reigns-ink)',
                  boxShadow: '3px 3px 0 0 var(--reigns-ink)',
                }}
              />
            </div>
          </div>

          {/* AI Generate */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <SectionHeader
                icon={<Sparkle weight="fill" size={14} />}
                text="Let AI Pick"
                compact
              />
              <div
                className="flex items-center gap-0.5 rounded p-0.5 flex-wrap shrink-0"
                style={{
                  background: 'var(--reigns-bg-soft)',
                  border: '2px solid var(--reigns-border)',
                }}
              >
                <LangToggle value={lang} onChange={setLang} />
              </div>
            </div>
            <button
              onClick={generate}
              disabled={generating}
              className="pixel-btn pixel-btn-primary w-full py-3 text-sm"
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Shuffle weight="fill" size={16} />
                  </motion.span>
                  GENERATING…
                </>
              ) : (
                <>
                  <Sparkle weight="fill" size={16} />
                  GENERATE WITH AI
                </>
              )}
            </button>
            {genError && (
              <div
                className="text-xs rounded px-3 py-2"
                style={{
                  background: '#F5D9D5',
                  border: '2px solid var(--reigns-red)',
                  color: '#6B1C18',
                }}
              >
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
                  className="text-xs px-2.5 py-1.5 rounded transition-colors font-mono font-bold"
                  style={{
                    background: 'var(--reigns-bg-soft)',
                    border: '2px solid var(--reigns-border-soft)',
                    color: 'var(--reigns-ink)',
                  }}
                >
                  {p.civilian} / {p.undercover}
                </button>
              ))}
            </div>
          </div>

          {/* Start */}
          <div className="mt-auto pt-4">
            <button
              className="pixel-btn pixel-btn-danger w-full py-4 text-base"
              disabled={!valid}
              onClick={() =>
                onStart({
                  civilianWord: civilianWord.trim(),
                  undercoverWord: undercoverWord.trim(),
                })
              }
            >
              <Play weight="fill" size={18} />
              START THE GAME
              <CaretRight weight="fill" size={16} />
            </button>
            <div
              className="text-[10px] text-center mt-2 font-mono"
              style={{ color: 'var(--reigns-ink-faint)' }}
            >
              6 AIs · 1 undercover · you watch and judge
            </div>
          </div>
        </div>

        {/* RIGHT — roster showcase */}
        <div
          className="px-8 py-8 flex flex-col gap-5"
          style={{ background: 'var(--reigns-bg-strong)' }}
        >
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
                className="relative flex flex-col items-center gap-2 p-4 rounded-lg"
                style={{
                  background: providerBg(r.modelSlug),
                  border: '2px solid var(--reigns-ink)',
                  boxShadow: '4px 4px 0 0 var(--reigns-ink)',
                }}
              >
                <Avatar modelSlug={r.modelSlug} size={72} className="drop-shadow-md" />
                <div
                  className="ink-chip justify-center mt-1"
                  style={{ padding: '4px 8px', fontSize: 11 }}
                >
                  {r.displayName}
                </div>
              </motion.div>
            ))}
          </div>

          <div
            className="mt-auto pt-4 text-xs leading-relaxed font-mono"
            style={{
              color: 'var(--reigns-ink)',
              borderTop: '2px solid var(--reigns-border-soft)',
            }}
          >
            Each AI gets a secret word. One gets a{' '}
            <span className="font-bold" style={{ color: 'var(--reigns-red)' }}>
              different
            </span>{' '}
            word — the{' '}
            <span className="font-bold" style={{ color: 'var(--reigns-red)' }}>
              undercover
            </span>
            . They describe their word in short phrases without saying it, then vote to eliminate
            the one that sounds off. Civilians win if they catch the spy before the final two.
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
    <div
      className={`flex items-center gap-2 ${compact ? '' : 'mb-0'}`}
      style={{ color: 'var(--reigns-ink-soft)' }}
    >
      <span style={{ color: 'var(--reigns-ink)' }}>{icon}</span>
      <span className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] shrink-0">
        {text}
      </span>
      <div className="flex-1 h-0.5 ml-1" style={{ background: 'var(--reigns-border-soft)' }} />
    </div>
  )
}

function LangToggle({ value, onChange }: { value: Lang; onChange: (v: Lang) => void }) {
  return (
    <>
      {LANGUAGES.map(l => (
        <button
          key={l.code}
          onClick={() => onChange(l.code)}
          className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-colors"
          style={
            value === l.code
              ? { background: 'var(--reigns-ink)', color: '#F5EDDB' }
              : { background: 'transparent', color: 'var(--reigns-ink-faint)' }
          }
        >
          {l.label}
        </button>
      ))}
    </>
  )
}
