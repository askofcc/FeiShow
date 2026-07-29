/**
 * Process-local async memo + in-flight dedupe.
 * Critical for Vercel SSG: many getStaticProps share one Node process.
 */

type Entry<T> = { value?: T; error?: unknown; promise?: Promise<T> }

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
  loader: () => Promise<T>
): Promise<T> {
  if (!key) return loader()
  const s = store(namespace)
  const hit = s.get(key)
  if (hit) {
    if (Object.prototype.hasOwnProperty.call(hit, 'value')) return hit.value as T
    if (Object.prototype.hasOwnProperty.call(hit, 'error')) throw hit.error
    if (hit.promise) return hit.promise as Promise<T>
  }
  const entry: Entry<T> = {}
  entry.promise = (async () => {
    try {
      const value = await loader()
      entry.value = value
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
