'use client'

import { useState } from 'react'

export function ObfuscatedEmail({ user, domain }: { user: string; domain: string }) {
  const [revealed, setRevealed] = useState(false)
  const email = `${user}@${domain}`

  if (!revealed) {
    return (
      <button
        onClick={() => setRevealed(true)}
        className="underline underline-offset-4 hover:text-foreground transition-colors cursor-pointer"
      >
        [Klicken zum Anzeigen]
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
