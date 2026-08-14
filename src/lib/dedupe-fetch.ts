type Fetcher = (url: string) => Promise<unknown>

/**
 * Requests currently in flight, keyed by url.
 *
 * Only in-flight requests live here. Resolved payloads are deliberately not
 * kept: the admin option editor writes through the same endpoint, and a held
 * value would show every other component the configuration as it was before
 * the edit.
 */
const inFlight = new Map<string, Promise<unknown>>()

const defaultFetcher: Fetcher = async (url) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Request failed: ${res.status}`)
  return res.json()
}

/**
 * Fetch JSON, collapsing callers that ask for the same url at the same moment.
 *
 * Six components call useOptions, and each one used to open its own request on
 * mount — four full copies of the same list on a single page load, because a
 * browser does not merge concurrent requests to one url, it races them.
 */
export function dedupedJson<T>(url: string, fetcher: Fetcher = defaultFetcher): Promise<T> {
  const existing = inFlight.get(url)
  if (existing) return existing as Promise<T>

  const request = fetcher(url).finally(() => {
    inFlight.delete(url)
  })

  inFlight.set(url, request)
  return request as Promise<T>
}

/** Test seam — drops any in-flight entries so cases cannot bleed into each other. */
export function __resetDedupeCache() {
  inFlight.clear()
}
