'use client'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, Detective, Sparkle, Shuffle, Play, MagicWand, CaretRight, Timer,
} from '@phosphor-icons/react'
import { Avatar } from './Avatar'
import { LangSwitcher } from './LangSwitcher'
import { ROSTER } from '@/lib/game/roster'
import { WORD_PAIRS } from '@/data/word-pairs'
import { providerBg } from '@/lib/provider-colors'
import { useLang, type Lang } from '@/lib/i18n'
import type { GameConfig } from '@/lib/game/types'

const PLACEHOLDERS: Record<Lang, { civilian: string; undercover: string }> = {
  en: { civilian: 'apple',   undercover: 'pear' },
  zh: { civilian: '苹果',     undercover: '梨' },
  ja: { civilian: 'りんご',   undercover: '梨' },
  ko: { civilian: '사과',     undercover: '배' },
  es: { civilian: 'manzana', undercover: 'pera' },
  fr: { civilian: 'pomme',   undercover: 'poire' },
  de: { civilian: 'Apfel',   undercover: 'Birne' },
  ru: { civilian: 'яблоко',  undercover: 'груша' },
}

interface Quota {
  play: { remaining: number; limit: number; resetAt: number }
  gen: { remaining: number; limit: number; resetAt: number }
  enforced: boolean
}

export function SetupScreen({ onStart }: { onStart: (config: GameConfig) => void }) {
  const { lang, t } = useLang()
  const [civilianWord, setCivilianWord] = useState('')
  const [undercoverWord, setUndercoverWord] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState<string | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)

  // Pre-fetch remaining quota so we can disable the start button and warn
  // the user upfront instead of letting them hit a 429 surprise.
  useEffect(() => {
    let cancelled = false
    fetch('/api/quota', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!cancelled && data) setQuota(data as Quota)
      })
      .catch(() => { /* offline or transient — silently skip */ })
    return () => { cancelled = true }
  }, [])

  const playRemaining = quota?.play.remaining ?? null
  const genRemaining = quota?.gen.remaining ?? null
  const playExhausted = quota?.enforced === true && playRemaining === 0
  const genExhausted = quota?.enforced === true && genRemaining === 0

  const inputValid =
    civilianWord.trim().length > 0 &&
    undercoverWord.trim().length > 0 &&
    civilianWord.trim() !== undercoverWord.trim() &&
    civilianWord.length <= 30 &&
    undercoverWord.length <= 30
  const valid = inputValid && !playExhausted

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
      // Refresh the quota counter so the remaining badge ticks down live.
      fetch('/api/quota', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => { if (d) setQuota(d as Quota) })
        .catch(() => { /* ignore */ })
    } catch (err) {
      setGenError(err instanceof Error ? err.message : String(err))
    } finally {
      setGenerating(false)
    }
  }

  const ph = PLACEHOLDERS[lang]

  // Split the rules template into pre / different / mid / undercover / post so
  // we can render the {different} and {undercover} pieces as colored <span>s
  // regardless of word order across languages.
  const rulesTemplate = t('setup.rules', {
    different: '\u0000DIFF\u0000',
    undercover: '\u0000UNDER\u0000',
  })
  const rulesNodes = rulesTemplate.split(/(\u0000DIFF\u0000|\u0000UNDER\u0000)/).map((piece, i) => {
    if (piece === '\u0000DIFF\u0000') {
      return (
        <span key={i} className="font-bold" style={{ color: 'var(--reigns-red)' }}>
          {t('setup.rules.different')}
        </span>
      )
    }
    if (piece === '\u0000UNDER\u0000') {
      return (
        <span key={i} className="font-bold" style={{ color: 'var(--reigns-red)' }}>
          {t('setup.rules.undercover')}
        </span>
      )
    }
    return <span key={i}>{piece}</span>
  })

  return (
    <div
      className="min-h-screen md:h-screen flex flex-col overflow-x-hidden"
      style={{ background: 'var(--reigns-bg)', color: 'var(--reigns-ink)' }}
    >
      {/* Dark accent banner — lang switcher lives here top-right. */}
      <header
        className="shrink-0 px-4 md:px-8 py-3 md:py-5 flex items-center gap-3"
        style={{
          background: 'var(--reigns-accent-strip)',
          color: '#F5EDDB',
          borderBottom: '3px solid var(--reigns-ink)',
        }}
      >
        <Detective
          weight="fill"
          size={24}
          className="md:hidden"
          style={{ color: 'var(--reigns-gold)' }}
        />
        <Detective
          weight="fill"
          size={28}
          className="hidden md:block"
          style={{ color: 'var(--reigns-gold)' }}
        />
        <div className="flex-1 min-w-0">
          <div className="font-heading font-black tracking-[0.3em] text-lg md:text-xl">
            {t('app.title')}
          </div>
          <div className="text-[10px] md:text-xs font-mono opacity-80 truncate">
            {t('app.tagline')}
          </div>
        </div>
        <LangSwitcher variant="dark" />
      </header>

      {/* Two-column body (desktop) / single stack (mobile) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[minmax(420px,45%)_1fr] min-h-0 overflow-y-auto md:overflow-hidden">
        {/* LEFT — word setup */}
        <div
          className="border-b lg:border-b-0 lg:border-r px-5 md:px-8 py-5 md:py-8 flex flex-col gap-5 md:gap-7"
          style={{ borderColor: 'var(--reigns-border)' }}
        >
          <SectionHeader icon={<MagicWand weight="fill" size={14} />} text={t('setup.secret_words')} />

          {/* Inputs */}
          <div className="space-y-3 md:space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <Shield weight="fill" size={14} style={{ color: 'var(--reigns-green)' }} />
                <label
                  className="text-xs font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--reigns-ink-soft)' }}
                >
                  {t('setup.civilian_word')}
                </label>
              </div>
              <input
                value={civilianWord}
                onChange={e => setCivilianWord(e.target.value)}
                placeholder={ph.civilian}
                maxLength={30}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-base md:text-lg font-sans outline-none focus:ring-2 focus:ring-offset-2"
                style={{
                  background: '#FAF2DF',
                  border: '2px solid var(--reigns-ink)',
                  color: 'var(--reigns-ink)',
                  boxShadow: '3px 3px 0 0 var(--reigns-ink)',
                }}
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-1.5 md:mb-2">
                <Detective weight="fill" size={14} style={{ color: 'var(--reigns-red)' }} />
                <label
                  className="text-xs font-mono font-bold uppercase tracking-[0.18em]"
                  style={{ color: 'var(--reigns-ink-soft)' }}
                >
                  {t('setup.undercover_word')}
                </label>
              </div>
              <input
                value={undercoverWord}
                onChange={e => setUndercoverWord(e.target.value)}
                placeholder={ph.undercover}
                maxLength={30}
                className="w-full px-3 md:px-4 py-2.5 md:py-3 rounded-lg text-base md:text-lg font-sans outline-none focus:ring-2 focus:ring-offset-2"
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
          <div className="space-y-2 md:space-y-3">
            <SectionHeader
              icon={<Sparkle weight="fill" size={14} />}
              text={t('setup.let_ai_pick')}
            />
            <button
              onClick={generate}
              disabled={generating || genExhausted}
              className="pixel-btn pixel-btn-primary w-full py-2.5 md:py-3 text-xs md:text-sm"
            >
              {generating ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Shuffle weight="fill" size={16} />
                  </motion.span>
                  {t('setup.generating')}
                </>
              ) : (
                <>
                  <Sparkle weight="fill" size={16} />
                  {t('setup.generate_with_ai')}
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
            {genRemaining != null && quota?.enforced && (
              <div
                className="text-[10px] font-mono flex items-center gap-1.5"
                style={{ color: genExhausted ? 'var(--reigns-red)' : 'var(--reigns-ink-soft)' }}
              >
                <Timer weight="fill" size={11} />
                {t('setup.gen_remaining', { remaining: genRemaining, limit: quota.gen.limit })}
              </div>
            )}
          </div>

          {/* Presets — filtered by the global `lang` from the header. */}
          <div>
            <SectionHeader
              icon={<Shuffle weight="fill" size={14} />}
              text={t('setup.or_preset')}
            />
            <div className="mt-2 md:mt-3 flex flex-wrap gap-1.5 md:gap-2">
              {WORD_PAIRS.filter(p => p.language === lang).map(p => (
                <button
                  key={`${p.civilian}-${p.undercover}`}
                  onClick={() => {
                    setCivilianWord(p.civilian)
                    setUndercoverWord(p.undercover)
                  }}
                  className="text-[11px] md:text-xs px-2 md:px-2.5 py-1 md:py-1.5 rounded transition-colors font-mono font-bold"
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
          <div className="mt-auto pt-3 md:pt-4">
            <button
              className="pixel-btn pixel-btn-danger w-full py-3 md:py-4 text-sm md:text-base"
              disabled={!valid}
              onClick={() =>
                onStart({
                  civilianWord: civilianWord.trim(),
                  undercoverWord: undercoverWord.trim(),
                })
              }
            >
              <Play weight="fill" size={18} />
              {playExhausted ? t('setup.quota_used_up') : t('setup.start')}
              <CaretRight weight="fill" size={16} />
            </button>
            <div
              className="text-[10px] text-center mt-2 font-mono flex items-center justify-center gap-1.5"
              style={{
                color: playExhausted ? 'var(--reigns-red)' : 'var(--reigns-ink-faint)',
              }}
            >
              {playRemaining != null && quota?.enforced ? (
                <>
                  <Timer weight="fill" size={11} />
                  {t('setup.play_remaining', {
                    remaining: playRemaining,
                    limit: quota.play.limit,
                  })}
                </>
              ) : (
                t('setup.caption')
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — roster showcase (hidden on mobile to keep a no-scroll feel) */}
        <div
          className="hidden lg:flex px-8 py-8 flex-col gap-5"
          style={{ background: 'var(--reigns-bg-strong)' }}
        >
          <SectionHeader
            icon={<Detective weight="fill" size={14} />}
            text={t('setup.contestants')}
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
            {rulesNodes}
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
