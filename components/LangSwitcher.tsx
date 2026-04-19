'use client'
import { useEffect, useRef, useState } from 'react'
import { CaretDown, Globe } from '@phosphor-icons/react'
import { LANG_LIST, useLang } from '@/lib/i18n'

interface Props {
  /** `dark` renders on the dark header strip; `light` on the parchment. */
  variant?: 'dark' | 'light'
}

/**
 * Compact language picker — shows a Globe icon + current code, opens a
 * dropdown of all 8 supported languages. One control, shared state, drives
 * all i18n + AI word-gen + preset-list filtering.
 */
export function LangSwitcher({ variant = 'dark' }: Props) {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [open])

  const current = LANG_LIST.find(l => l.code === lang) ?? LANG_LIST[0]

  const triggerBg =
    variant === 'dark' ? 'rgba(0,0,0,0.25)' : 'var(--reigns-bg-soft)'
  const triggerBorder =
    variant === 'dark' ? 'rgba(245,237,219,0.35)' : 'var(--reigns-border)'
  const triggerColor = variant === 'dark' ? '#F5EDDB' : 'var(--reigns-ink)'

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 font-mono font-bold text-xs px-2.5 py-1.5 rounded transition-colors"
        style={{
          background: triggerBg,
          border: `2px solid ${triggerBorder}`,
          color: triggerColor,
          minWidth: 68,
        }}
        aria-label="Change language"
      >
        <Globe weight="fill" size={14} />
        <span className="tracking-wider">{current.label}</span>
        <CaretDown weight="fill" size={10} />
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 rounded z-50 overflow-hidden"
          style={{
            background: '#FAF2DF',
            border: '2px solid var(--reigns-ink)',
            boxShadow: '3px 3px 0 0 var(--reigns-ink)',
            minWidth: 140,
          }}
        >
          {LANG_LIST.map(l => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code)
                setOpen(false)
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left font-mono text-xs transition-colors"
              style={{
                background: l.code === lang ? 'var(--reigns-bg-strong)' : 'transparent',
                color: 'var(--reigns-ink)',
                fontWeight: l.code === lang ? 700 : 500,
              }}
            >
              <span>{l.name}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded"
                style={{
                  background: l.code === lang ? 'var(--reigns-ink)' : 'var(--reigns-border-soft)',
                  color: l.code === lang ? '#F5EDDB' : 'var(--reigns-ink-soft)',
                }}
              >
                {l.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
