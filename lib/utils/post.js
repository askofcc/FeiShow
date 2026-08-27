/**
 * 文章相关工具
 * 此处只能放客户端支持的代码
 */
import BLOG from '@/blog.config'
import { isHttpLink } from '.'
import { siteConfig } from '@/lib/config'
import { uploadDataToAlgolia } from '../plugins/algolia'
import { getPageContentText } from '@/lib/db/notion/getPageContentText'
import { getPageTableOfContents } from '../db/notion/getPageTableOfContents'
import { countWords } from '../plugins/wordCount'
import { getPageAISummary } from '../plugins/aiSummary'

/**
 * 获取文章的关联推荐文章列表，目前根据标签关联性筛选
 * @param post
 * @param {*} allPosts
 * @param {*} count
 * @returns
 */
export function getRecommendPost(post, allPosts, count = 6) {
  let recommendPosts = []
  const postIds = []
  const currentTags = post?.tags || []
  for (let i = 0; i < allPosts.length; i++) {
    const p = allPosts[i]
    if (p.id === post.id || p.type.indexOf('Post') < 0) {
      continue
    }

    for (let j = 0; j < currentTags.length; j++) {
      const t = currentTags[j]
      if (postIds.indexOf(p.id) > -1) {
        continue
      }
      if (p.tags && p.tags.indexOf(t) > -1) {
        recommendPosts.push(p)
        postIds.push(p.id)
      }
    }
  }

  if (recommendPosts.length > count) {
    recommendPosts = recommendPosts.slice(0, count)
  }
  return recommendPosts
}

/**
 * 确认slug中不包含 / 符号
 * @param {*} row
 * @returns
 */
export function checkSlugHasNoSlash(row) {
  let slug = row.slug
  if (slug.startsWith('/')) {
    slug = slug.substring(1)
  }
  return (
    (slug.match(/\//g) || []).length === 0 &&
    !isHttpLink(slug) &&
    row.type.indexOf('Menu') < 0
  )
}

/**
 * 检查url中包含一个  /
 * @param {*} row
 * @returns
 */
export function checkSlugHasOneSlash(row) {
  let slug = row.slug
  if (slug.startsWith('/')) {
    slug = slug.substring(1)
  }
  return (
    (slug.match(/\//g) || []).length === 1 &&
    !isHttpLink(slug) &&
    row.type.indexOf('Menu') < 0
  )
}

/**
 * 检查url中包含两个及以上的  /
 * @param {*} row
 * @returns
 */
export function checkSlugHasMorThanTwoSlash(row) {
  let slug = row.slug
  if (slug.startsWith('/')) {
    slug = slug.substring(1)
  }
  return (
    (slug.match(/\//g) || []).length >= 2 &&
    row.type.indexOf('Menu') < 0 &&
    !isHttpLink(slug)
  )
}


/**
 * 处理文章数据
 * @param props
 * @param from
 * @returns {Promise<void>}
 */
export async function processPostData(props, from) {

  if (props.post?.blockMap?.block) {
    // 目录默认加载
    props.post.content = Object.keys(props.post.blockMap.block).filter(
      key => props.post.blockMap.block[key]?.value?.parent_id === props.post.id
    )
    props.post.toc = getPageTableOfContents(props.post, props.post.blockMap)
    const pageContentText = getPageContentText(props.post, props.post.blockMap)
    const { wordCount, readTime } = countWords(pageContentText)
    props.post.wordCount = wordCount
    props.post.readTime = readTime
    await getPageAISummary(props.post, pageContentText)
  }

  // 生成全文索引 && JSON.parse(BLOG.ALGOLIA_RECREATE_DATA)
  if (BLOG.ALGOLIA_APP_ID) {
    uploadDataToAlgolia(props?.post)
  }

  // 推荐关联文章处理
  const allPosts = props.allPages?.filter(
    page => page.type === 'Post' && page.status === 'Published'
  )
  if (allPosts && allPosts.length > 0) {
    const currentId = props.post?.id
    const currentSlug = props.post?.slug
    const index = allPosts.findIndex(
      p =>
        (currentId && p.id === currentId) ||
        (currentSlug && p.slug === currentSlug) ||
        p === props.post
    )
    if (index >= 0) {
      props.prev = allPosts.slice(index - 1, index)[0] ?? allPosts.slice(-1)[0]
      props.next = allPosts.slice(index + 1, index + 2)[0] ?? allPosts[0]
    } else {
      props.prev = null
      props.next = null
    }
    props.recommendPosts = getRecommendPost(
      props.post,
      allPosts,
      siteConfig('POST_RECOMMEND_COUNT')
    )
  } else {
    props.prev = null
    props.next = null
    props.recommendPosts = []
  }

  delete props.allPages
}
