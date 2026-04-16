'use client'
import { useState } from 'react'
import { SetupScreen } from '@/components/SetupScreen'
import { GameViewer } from '@/components/GameViewer'
import type { GameConfig } from '@/lib/game/types'

export default function Home() {
  const [config, setConfig] = useState<GameConfig | null>(null)

  if (!config) return <SetupScreen onStart={setConfig} />
  return <GameViewer config={config} onExit={() => setConfig(null)} />
}
