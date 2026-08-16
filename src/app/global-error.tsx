'use client'

/**
 * Last resort: the root layout itself failed.
 *
 * This one replaces the whole document, so it has to bring its own <html> and
 * <body>. It also cannot use next-intl — the provider lives inside the layout
 * that just failed — so it is English only, which is the one place in this app
 * where that is unavoidable rather than an oversight.
 *
 * Styling is inline for the same reason: if the stylesheet is what went
 * missing, classes would leave an unreadable page behind.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
          background: '#fafafa',
          color: '#171717',
        }}
      >
        <main style={{ maxWidth: '26rem', padding: '2rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', margin: '0 0 .5rem' }}>Something went wrong</h1>
          <p style={{ fontSize: '.875rem', lineHeight: 1.5, color: '#525252', margin: '0 0 1.5rem' }}>
            The page could not be loaded. Trying again often does the trick.
          </p>
          <button
            onClick={reset}
            style={{
              font: 'inherit',
              fontSize: '.875rem',
              padding: '.5rem 1rem',
              borderRadius: '.5rem',
              border: 'none',
              background: '#171717',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ marginTop: '1.5rem', fontFamily: 'ui-monospace, monospace', fontSize: '.6875rem', color: '#a3a3a3' }}>
              {error.digest}
            </p>
          )}
        </main>
      </body>
    </html>
  )
}
