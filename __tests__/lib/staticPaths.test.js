jest.mock('@/lib/cache/cache_manager', () => ({
  getOrSetDataWithCache: jest.fn()
}))

jest.mock('@/lib/db/SiteDataApi', () => ({
  fetchGlobalAllData: jest.fn()
}))

jest.mock('@/lib/build/prefetch', () => ({
  getPriorityPages: jest.fn(),
  prefetchAllBlockMaps: jest.fn()
}))

jest.mock('@/lib/utils/buildMode', () => ({
  isExport: jest.fn()
}))

const { getOrSetDataWithCache } = require('@/lib/cache/cache_manager')
const { fetchGlobalAllData } = require('@/lib/db/SiteDataApi')
const { getPriorityPages, prefetchAllBlockMaps } = require('@/lib/build/prefetch')
const { isExport } = require('@/lib/utils/buildMode')

describe('staticPaths build helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    getOrSetDataWithCache.mockImplementation((_key, loader) => loader())
  })

  it('shares Feishu allPages lookups across UI locales', async () => {
    const previousCms = process.env.CMS_PROVIDER
    process.env.CMS_PROVIDER = 'feishu'
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [{ id: '1', slug: 'hello', type: 'Post', status: 'Published' }]
    })
    getPriorityPages.mockReturnValue([])

    try {
      await jest.isolateModulesAsync(async () => {
        const { getSharedAllPages } = require('@/lib/build/staticPaths')

        const zh = await getSharedAllPages({ from: 'slug-paths', locale: 'zh-CN' })
        const en = await getSharedAllPages({ from: 'slug-paths', locale: 'en' })

        expect(zh).toEqual(en)
        expect(fetchGlobalAllData).toHaveBeenCalledTimes(1)
        expect(getOrSetDataWithCache).toHaveBeenCalledTimes(1)
      })
    } finally {
      if (previousCms === undefined) delete process.env.CMS_PROVIDER
      else process.env.CMS_PROVIDER = previousCms
    }
  })

  it('shares allPages lookups within a process', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [{ id: '1', slug: 'hello', type: 'Post', status: 'Published' }]
    })
    getPriorityPages.mockReturnValue([])

    await jest.isolateModulesAsync(async () => {
      const { getSharedAllPages } = require('@/lib/build/staticPaths')

      const first = await getSharedAllPages({ from: 'slug-paths' })
      const second = await getSharedAllPages({ from: 'slug-paths' })

      expect(first).toEqual(second)
      expect(fetchGlobalAllData).toHaveBeenCalledTimes(1)
      expect(getOrSetDataWithCache).toHaveBeenCalledTimes(1)
    })
  })

  it('does not keep a rejected allPages lookup pinned in process memory', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData
      .mockRejectedValueOnce(new Error('notion unavailable'))
      .mockResolvedValueOnce({
        allPages: [
          { id: '1', slug: 'hello', type: 'Post', status: 'Published' }
        ]
      })
    getPriorityPages.mockReturnValue([])

    await jest.isolateModulesAsync(async () => {
      const { getSharedAllPages } = require('@/lib/build/staticPaths')

      await expect(getSharedAllPages({ from: 'slug-paths' })).rejects.toThrow(
        'notion unavailable'
      )
      await expect(getSharedAllPages({ from: 'slug-paths' })).resolves.toEqual([
        { id: '1', slug: 'hello', type: 'Post', status: 'Published' }
      ])

      expect(fetchGlobalAllData).toHaveBeenCalledTimes(2)
      expect(getOrSetDataWithCache).toHaveBeenCalledTimes(2)
    })
  })

  it('prefetches once per route call in export mode and returns all matching paths', async () => {
    isExport.mockReturnValue(true)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
      ]
    })

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: page => !page.slug.includes('/'),
        mapPageToParams: page => ({ params: { prefix: page.slug } })
      })

      expect(prefetchAllBlockMaps).toHaveBeenCalledWith([
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
      ])
      expect(result).toEqual({
        paths: [{ params: { prefix: 'about' } }],
        fallback: false
      })
    })
  })

  it('skips prerender paths for standalone docker builds', async () => {
    const previous = process.env.NEXT_BUILD_STANDALONE
    process.env.NEXT_BUILD_STANDALONE = 'true'

    try {
      await jest.isolateModulesAsync(async () => {
        const { getStaticPathsBase } = require('@/lib/build/staticPaths')

        const result = await getStaticPathsBase({
          filterFn: () => true,
          mapPageToParams: page => ({ params: { prefix: page.slug } })
        })

        expect(result).toEqual({ paths: [], fallback: 'blocking' })
        expect(fetchGlobalAllData).not.toHaveBeenCalled()
      })
    } finally {
      if (previous === undefined) delete process.env.NEXT_BUILD_STANDALONE
      else process.env.NEXT_BUILD_STANDALONE = previous
    }
  })

  it('uses priority pages in ISR mode', async () => {
    isExport.mockReturnValue(false)
    fetchGlobalAllData.mockResolvedValue({
      allPages: [
        { id: '1', slug: 'about', type: 'Page', status: 'Published' },
        { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
      ]
    })
    getPriorityPages.mockReturnValue([
      { id: '2', slug: 'post/hello', type: 'Post', status: 'Published' }
    ])

    await jest.isolateModulesAsync(async () => {
      const { getStaticPathsBase } = require('@/lib/build/staticPaths')

      const result = await getStaticPathsBase({
        filterFn: page => page.slug.includes('/'),
        mapPageToParams: page => ({
          params: {
            prefix: page.slug.split('/')[0],
            slug: page.slug.split('/')[1]
          }
        })
      })

      expect(prefetchAllBlockMaps).not.toHaveBeenCalled()
      expect(result).toEqual({
        paths: [{ params: { prefix: 'post', slug: 'hello' } }],
        fallback: 'blocking'
      })
    })
  })
})
