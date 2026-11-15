'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  // resolvedTheme, not theme: with the system default `theme` is "system",
  // which showed the moon on a dark OS and took two clicks to switch.
  const { resolvedTheme, setTheme } = useTheme()
  const tn = useTranslations('nav')
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9" aria-label={tn('toggleTheme')}>
        <Sun className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-yellow-500" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only">{tn('toggleTheme')}</span>
    </Button>
  )
}
