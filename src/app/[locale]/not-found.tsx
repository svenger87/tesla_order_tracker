import { NotFoundCard } from '@/components/NotFoundCard'

/**
 * Answers a `notFound()` thrown anywhere inside the locale segment.
 *
 * Unknown addresses do not arrive here — they match the catch-all route, which
 * renders the same card directly so that its `noindex` is kept. This boundary
 * covers the other case: a page that exists but decides its content does not.
 */
export default function NotFound() {
  return <NotFoundCard />
}
