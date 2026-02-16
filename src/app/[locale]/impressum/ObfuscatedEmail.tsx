'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

export function ObfuscatedEmail({ user, domain }: { user: string; domain: string }) {
  const t = useTranslations('impressum')
  const [revealed, setRevealed] = useState(false)
  const email = `${user}@${domain}`

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"
      >
        {t('revealEmail')}
      </button>
    )
  }

  return (
    <a
      href={`mailto:${email}`}
      className="underline underline-offset-4 hover:text-foreground transition-colors"
    >
      {email}
    </a>
  )
}
