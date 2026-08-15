import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'
import { NotFoundCard } from '@/components/NotFoundCard'

/**
 * Catches every address under a locale that no other route claims.
 *
 * Without it an unknown path matches nothing inside this segment, so the miss is
 * handled above the locale layout — outside the translation provider and outside
 * the site frame — which is why a wrong URL used to land on Next's bare English
 * default, on a white ground regardless of theme, with no way back.
 *
 * It renders the card itself rather than calling `notFound()`: throwing hands the
 * render to the not-found boundary, and the boundary drops this route's metadata
 * with it, taking the `noindex` below along. Since matching means the response
 * carries 200 rather than a 404 either way, that `noindex` is what stops a search
 * engine from treating every mistyped URL as a real page.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function CatchAllNotFound({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return <NotFoundCard />
}
