import BLOG from '@/blog.config'
import { getOrSetDataWithCache } from '@/lib/cache/cache_manager'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { getPriorityPages, prefetchAllBlockMaps } from '@/lib/build/prefetch'
import { isExport } from '@/lib/utils/buildMode'

const inProcessAllPagesPromises = new Map()

export function skipBuildPrerender() {
  const v = String(process.env.SKIP_BUILD_PRERENDER || '').trim().toLowerCase()
  if (v === '1' || v === 'true' || v === 'yes') return true
  return process.env.NEXT_BUILD_STANDALONE === 'true'
}

function isFeishuCms() {
  return (
    String(process.env.CMS_PROVIDER || BLOG.CMS_PROVIDER || 'feishu').toLowerCase() ===
    'feishu'
  )
}

function getStaticPathsCacheKey({ pageId = BLOG.NOTION_PAGE_ID, locale }) {
  const safePageId = String(pageId || BLOG.NOTION_PAGE_ID).replace(
    /[^a-z0-9,_:-]/gi,
    '_'
  )
  const safeLocale = isFeishuCms()
    ? 'feishu'
    : String(locale || 'default').replace(/[^a-z0-9_-]/gi, '_')
  return `build_static_paths_all_pages_${safeLocale}_${safePageId}`
}

export function getSharedAllPages({
  from = 'slug-paths',
  pageId = BLOG.NOTION_PAGE_ID,
  locale
} = {}) {
  const cacheKey = getStaticPathsCacheKey({ pageId, locale })

  if (!inProcessAllPagesPromises.has(cacheKey)) {
    const promise = getOrSetDataWithCache(cacheKey, async () => {
      const { allPages = [] } = await fetchGlobalAllData({
        pageId,
        from,
        locale
      })
      return Array.isArray(allPages) ? allPages : []
    })
    promise.catch(() => {
      inProcessAllPagesPromises.delete(cacheKey)
    })
    inProcessAllPagesPromises.set(cacheKey, promise)
  }

  return inProcessAllPagesPromises.get(cacheKey)
}

export async function getStaticPathsBase({
  filterFn = () => true,
  mapPageToParams,
  from = 'slug-paths',
  pageId = BLOG.NOTION_PAGE_ID,
  locale
}) {
  if (skipBuildPrerender()) {
    return { paths: [], fallback: 'blocking' }
  }

  const allPages = await getSharedAllPages({ from, pageId, locale })

  if (isExport()) {
    await prefetchAllBlockMaps(allPages)
    return {
      paths: allPages.filter(filterFn).map(mapPageToParams),
      fallback: false
    }
  }

  const priorityPages = getPriorityPages(allPages) || []
  return {
    paths: priorityPages.filter(filterFn).map(mapPageToParams),
    fallback: 'blocking'
  }
}
