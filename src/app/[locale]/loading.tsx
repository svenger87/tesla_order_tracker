import { useTranslations } from 'next-intl'

/**
 * Shown while a page in this segment renders on the server.
 *
 * Worth having because the overview is not instant: it renders the whole order
 * list per request, which measures around half a second on the live data — long
 * enough that navigating to it from another page left a blank stretch under the
 * header.
 *
 * Deliberately neutral rather than a skeleton of the overview: this boundary
 * covers the imprint and the API docs too, and a fake table flashing before a
 * legal text reads worse than a plain wait. The header and footer stay put
 * either way, so the page never looks empty.
 */
export default function Loading() {
  const t = useTranslations('common')

  return (
    <div className="flex items-center justify-center px-4 py-24" role="status" aria-busy="true">
      {/* motion-reduce drops the spin for anyone who asked for less movement;
          the shape still reads as "busy" without it. */}
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />
      <span className="sr-only">{t('loading')}</span>
    </div>
  )
}
