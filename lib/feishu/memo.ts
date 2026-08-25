/**
 * Process-local async memo + in-flight dedupe with TTL.
 * Critical for Vercel SSG: many getStaticProps share one Node process.
 * Default TTL: 300 seconds (5 minutes) aligned with default NEXT_REVALIDATE_SECOND.
 */

type Entry<T> = { value?: T; error?: unknown; promise?: Promise<T>; expiresAt?: number }

const stores = new Map<string, Map<string, Entry<any>>>()

function store(namespace: string): Map<string, Entry<any>> {
  let s = stores.get(namespace)
  if (!s) {
    s = new Map()
    stores.set(namespace, s)
  }
  return s
}

export async function memoAsync<T>(
  namespace: string,
  key: string,
  loader: () => Promise<T>,
  ttlMs = 300_000
): Promise<T> {
  if (!key || process.env.ENABLE_CACHE === 'false' || process.env.ENABLE_CACHE === '0') {
    return loader()
  }
  const s = store(namespace)
  const hit = s.get(key)
  if (hit) {
    if (Object.prototype.hasOwnProperty.call(hit, 'value')) {
      if (!hit.expiresAt || hit.expiresAt > Date.now()) {
        return hit.value as T
      }
      s.delete(key)
    } else if (Object.prototype.hasOwnProperty.call(hit, 'error')) {
      throw hit.error
    } else if (hit.promise) {
      return hit.promise as Promise<T>
    }
  }
  const entry: Entry<T> = {}
  entry.promise = (async () => {
    try {
      const value = await loader()
      entry.value = value
      entry.expiresAt = Date.now() + ttlMs
      delete entry.promise
      return value
    } catch (error) {
      entry.error = error
      delete entry.promise
      // allow retry later for transient failures
      s.delete(key)
      throw error
    }
  })()
  s.set(key, entry)
  return entry.promise
}

export function clearMemo(namespace?: string) {
  if (namespace) stores.delete(namespace)
  else stores.clear()
}
