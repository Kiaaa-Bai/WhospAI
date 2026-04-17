'use client'
import { useState } from 'react'
import { avatarPath, providerInitial, providerColor } from '@/lib/avatars'
import type { ModelSlug } from '@/lib/game/types'

interface Props {
  modelSlug: ModelSlug
  size?: number
  className?: string
}

export function Avatar({ modelSlug, size = 48, className = '' }: Props) {
  const [failed, setFailed] = useState(false)
  const style = { width: size, height: size }

  if (failed) {
    return (
      <div
        style={style}
        className={`rounded-full flex items-center justify-center text-white font-bold ${providerColor(modelSlug)} ${className}`}
      >
        {providerInitial(modelSlug)}
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarPath(modelSlug)}
      alt=""
      style={style}
      onError={() => setFailed(true)}
      className={`rounded-full object-cover bg-zinc-800 ${className}`}
    />
  )
}
