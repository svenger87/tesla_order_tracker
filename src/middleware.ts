import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware({
  ...routing,
  localeDetection: false
});

export const config = {
  // Allow dots in /track/ paths (e.g. /track/sven.7687) while still
  // excluding static files (.css, .js, .ico, .webp, etc.)
  matcher: ['/((?!api|trpc|_next|_vercel|.*\\.(?:css|js|json|ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot|map|txt|xml)$).*)']
};
