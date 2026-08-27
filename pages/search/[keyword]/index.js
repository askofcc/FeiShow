import BLOG from '@/blog.config'
import { getDataFromCache } from '@/lib/cache/cache_manager'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { getPageBlockCacheKey } from '@/lib/db/notion/getPostBlocks'

const Index = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props.NOTION_CONFIG)
  return <DynamicLayout theme={theme} layoutName='LayoutSearch' {...props} />
}

/**
 * 服务端搜索
 * @param {*} param0
 * @returns
 */
export async function getStaticProps({ params: { keyword }, locale }) {
  const props = await fetchGlobalAllData({
    from: 'search-props',
    locale
  })
  const { allPages } = props
  const allPosts = allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  props.posts = await filterByMemCache(allPosts, keyword)
  props.postCount = props.posts.length
  delete props.allPages
  const POST_LIST_STYLE = siteConfig(
    'POST_LIST_STYLE',
    'Page',
    props?.NOTION_CONFIG
  )
  const POSTS_PER_PAGE = siteConfig('POSTS_PER_PAGE', 12, props?.NOTION_CONFIG)

  // 处理分页
  if (POST_LIST_STYLE === 'scroll') {
    // 滚动列表默认给前端返回所有数据
  } else if (POST_LIST_STYLE) {
    props.posts = props.posts?.slice(0, POSTS_PER_PAGE)
  }
  props.keyword = keyword
  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
          'NEXT_REVALIDATE_SECOND',
          BLOG.NEXT_REVALIDATE_SECOND,
          props.NOTION_CONFIG
        )
  }
}

export function getStaticPaths() {
  return {
    paths: [],
    fallback: true
  }
}

/**
 * 在内存缓存中进行全文索引
 * @param {*} allPosts
 * @param keyword 关键词
 * @returns
 */
async function filterByMemCache(allPosts, keyword) {
  const filterPosts = []
  if (!allPosts || !Array.isArray(allPosts)) {
    return filterPosts
  }
  if (keyword) {
    keyword = keyword.trim().toLowerCase()
  }
  if (!keyword) {
    return allPosts
  }
  for (const post of allPosts) {
    const cacheKey = getPageBlockCacheKey(post.id, post.lastEditedDate)
    const page = await getDataFromCache(cacheKey, true)
    const tagContent = post?.tags
      ? Array.isArray(post.tags)
        ? post.tags.join(' ')
        : String(post.tags)
      : ''
    const categoryContent = post?.category
      ? Array.isArray(post.category)
        ? post.category.join(' ')
        : String(post.category)
      : ''
    const articleInfo =
      (post.title || '') +
      (post.summary || '') +
      tagContent +
      categoryContent
    let hit = articleInfo.toLowerCase().indexOf(keyword) > -1
    const contentText = getPageContentText(post, page)
    const contentChunks = Array.isArray(contentText)
      ? contentText
      : typeof contentText === 'string' && contentText.length > 0
        ? [contentText]
        : []
    if (post.summary && !contentChunks.includes(post.summary)) {
      contentChunks.unshift(post.summary)
    }

    post.results = []
    let hitCount = 0
    for (let i = 0; i < contentChunks.length; i++) {
      const c = contentChunks[i]
      if (!c || typeof c !== 'string') {
        continue
      }
      const index = c.toLowerCase().indexOf(keyword)
      if (index > -1) {
        hit = true
        hitCount += 1
        const start = Math.max(0, index - 40)
        const end = Math.min(c.length, index + keyword.length + 60)
        const snippet =
          (start > 0 ? '...' : '') +
          c.slice(start, end) +
          (end < c.length ? '...' : '')
        post.results.push(snippet)
      } else {
        if (hitCount > 0 && ((post.results.length - 1) / hitCount < 3 || i === 0)) {
          post.results.push(c.slice(0, 100))
        }
      }
    }
    if (hit) {
      filterPosts.push(post)
    }
  }
  return filterPosts
}

export default Index
