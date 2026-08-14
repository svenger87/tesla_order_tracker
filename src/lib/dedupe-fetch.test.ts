import { describe, it, expect, beforeEach } from 'vitest'
import { dedupedJson, __resetDedupeCache } from './dedupe-fetch'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('dedupedJson', () => {
  beforeEach(() => {
    __resetDedupeCache()
  })

  it('makes one request when several callers ask for the same url at once', async () => {
    let calls = 0
    const gate = deferred<string[]>()
    const fetcher = () => {
      calls++
      return gate.promise
    }

    const a = dedupedJson<string[]>('/api/options', fetcher)
    const b = dedupedJson<string[]>('/api/options', fetcher)
    const c = dedupedJson<string[]>('/api/options', fetcher)

    gate.resolve(['x'])

    expect(await a).toEqual(['x'])
    expect(await b).toEqual(['x'])
    expect(await c).toEqual(['x'])
    expect(calls).toBe(1)
  })

  it('keeps different urls apart', async () => {
    const seen: string[] = []
    const fetcher = (url: string) => {
      seen.push(url)
      return Promise.resolve([url])
    }

    await Promise.all([
      dedupedJson('/api/options', fetcher),
      dedupedJson('/api/options?vehicleType=Model+Y', fetcher),
    ])

    expect(seen).toEqual(['/api/options', '/api/options?vehicleType=Model+Y'])
  })

  it('asks again once the first request has settled', async () => {
    let calls = 0
    const fetcher = () => {
      calls++
      return Promise.resolve(['x'])
    }

    await dedupedJson('/api/options', fetcher)
    await dedupedJson('/api/options', fetcher)

    // Deduplication is only about requests in flight together. Holding the
    // resolved value would keep showing an admin's own option edits as absent.
    expect(calls).toBe(2)
  })

  it('gives every waiter the same failure', async () => {
    const gate = deferred<string[]>()
    const fetcher = () => gate.promise

    const a = dedupedJson('/api/options', fetcher)
    const b = dedupedJson('/api/options', fetcher)
    gate.reject(new Error('offline'))

    await expect(a).rejects.toThrow('offline')
    await expect(b).rejects.toThrow('offline')
  })

  it('does not wedge on a failure — the next caller tries again', async () => {
    let calls = 0
    const fetcher = () => {
      calls++
      return calls === 1 ? Promise.reject(new Error('offline')) : Promise.resolve(['ok'])
    }

    await expect(dedupedJson('/api/options', fetcher)).rejects.toThrow('offline')
    await expect(dedupedJson('/api/options', fetcher)).resolves.toEqual(['ok'])
    expect(calls).toBe(2)
  })
})
