import cache from 'memory-cache'
import BLOG from '@/blog.config'

const defaultCacheTime = () =>
  Number(BLOG.NEXT_REVALIDATE_SECOND) > 0
    ? Number(BLOG.NEXT_REVALIDATE_SECOND)
    : (BLOG.isProd ? 10 * 60 : 120 * 60)

export async function getCache(key, options) {
  return await cache.get(key)
}

export async function setCache(key, data, customCacheTime) {
  const duration =
    Number.isFinite(customCacheTime) && customCacheTime > 0
      ? customCacheTime
      : defaultCacheTime()
  await cache.put(key, data, duration * 1000)
}

export async function delCache(key) {
  await cache.del(key)
}

export function cleanCache() {
  cache.clear()
}

export default { getCache, setCache, delCache, cleanCache }
