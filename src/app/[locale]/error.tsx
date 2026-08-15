'use client'

import { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertTriangle, Home, RotateCw } from 'lucide-react'

/**
 * Shown when a page in this locale segment throws while rendering.
 *
 * There was no boundary at all before, so a failure fell through to Next's
 * unstyled default — no theme, no language, no way back, and no way to retry
 * short of reloading by hand.
 *
 * `reset()` re-renders the segment, which is worth offering first: most of what
 * can fail here is a request that may simply succeed on a second attempt.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('errors')

  useEffect(() => {
    // The digest is the only handle on the server-side stack, which is not sent
    // to the browser — without logging it here a report is untraceable.
    console.error('Page render failed:', error.digest ?? error.message, error)
  }, [error])

  return (
    <div className="flex items-center justify-center px-4 py-16 sm:py-24">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="rounded-full bg-destructive/10 p-4">
            <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden />
          </span>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">{t('pageErrorTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('pageErrorBody')}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button onClick={reset}>
              <RotateCw className="h-4 w-4" />
              {t('retry')}
            </Button>
            <Button asChild variant="outline">
              <Link href="/">
                <Home className="h-4 w-4" />
                {t('backHome')}
              </Link>
            </Button>
          </div>

          {error.digest && (
            // Gives the visitor something concrete to quote in a bug report.
            <p className="font-mono text-[11px] text-muted-foreground/70">{error.digest}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
