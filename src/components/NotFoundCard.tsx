import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Compass, Home } from 'lucide-react'

/**
 * What a visitor sees at an address that does not exist.
 *
 * Shared by two callers that need it for different reasons: the catch-all route,
 * which renders it directly so its `noindex` survives, and `not-found.tsx`, which
 * answers a `notFound()` thrown anywhere else in the locale segment.
 *
 * The order detail page already answers its own miss well — "no order under that
 * name", with a way onward — so this keeps the same shape rather than inventing a
 * second voice for the same situation.
 */
export function NotFoundCard() {
  const t = useTranslations('errors')

  return (
    <div className="flex items-center justify-center px-4 py-16 sm:py-24">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
          <span className="rounded-full bg-muted p-4">
            <Compass className="h-7 w-7 text-muted-foreground" aria-hidden />
          </span>

          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold">{t('pageNotFoundTitle')}</h1>
            <p className="text-sm text-muted-foreground">{t('pageNotFoundBody')}</p>
          </div>

          {/* One way out, not two: the overview is the only destination that
              helps here, and the search lives on it. A second button pointing at
              the same place would be padding. */}
          <Button asChild>
            <Link href="/">
              <Home className="h-4 w-4" />
              {t('backHome')}
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
