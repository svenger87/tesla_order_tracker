// Fire-and-forget server-side event tracking via Umami's /api/send endpoint

const UMAMI_HOST = process.env.UMAMI_HOST || 'http://umami:3000'
const WEBSITE_ID = process.env.UMAMI_WEBSITE_ID

interface TrackEventOptions {
  name: string            // Event name, e.g. "tost-api-create-order"
  url?: string            // The API path, e.g. "/api/v1/tost/orders"
  data?: Record<string, string | number | boolean | null>  // Custom properties
}

export function trackApiEvent({ name, url, data }: TrackEventOptions) {
  if (!WEBSITE_ID) return

  // Fire and forget — never block the API response
  fetch(`${UMAMI_HOST}/api/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      payload: {
        website: WEBSITE_ID,
        name,
        url: url || '/api',
        hostname: 'tff-order-stats.de',
        language: 'en',
        data,
      },
      type: 'event',
    }),
  }).catch(() => {
    // Silently ignore tracking failures
  })
}
