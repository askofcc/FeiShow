import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { generateRss, shouldGenerateRssForLocale } from '@/lib/utils/rss'
import { Feed } from 'feed'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * In-memory RSS cache to avoid regenerating on every request.
 * Survives across ISR revalidations within the same serverless instance.
 */
let rssCache = {
  xml: null,
  atomXml: null,
  json: null,
  link: null,
  updatedAt: 0
}

const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

function isCacheFresh(link) {
  return (
    rssCache.xml &&
    (!link || rssCache.link === link) &&
    Date.now() - rssCache.updatedAt < CACHE_TTL_MS
  )
}

/**
 * Generate RSS feed content from site data.
 * Reuses the same data pipeline as the homepage getStaticProps.
 */
async function generateRssContent(req) {
  const locale = BLOG.LANG
  const defaultLocale = BLOG.LANG
  const pageId = BLOG.NOTION_PAGE_ID

  // Parse the first (default) page ID for data fetching
  const pageIds = pageId.split(',')
  const targetId = pageIds[0].includes(':')
    ? pageIds[0].split(':')[1]
    : pageIds[0]

  const props = await fetchGlobalAllData({ from: 'rss-api', pageId: targetId, locale })
  if (!props || !props.allPages) {
    return null
  }

  const { siteInfo, allPages, NOTION_CONFIG } = props

  // Filter published posts only
  const latestPosts = allPages
    .filter(p => p.type === 'Post' && p.status === 'Published')
    .sort((a, b) => {
      const dateA = new Date(a.publishDay || a.publishDate || 0)
      const dateB = new Date(b.publishDay || b.publishDate || 0)
      return dateB - dateA
    })
    .slice(0, 20)

  if (latestPosts.length === 0) {
    return null
  }

  const TITLE = siteInfo?.title || BLOG.AUTHOR
  const DESCRIPTION = siteInfo?.description || BLOG.BIO
  const LINK = resolvePublicSiteLink({
    req,
    candidates: [siteInfo?.link, BLOG.LINK, process.env.NEXT_PUBLIC_LINK]
  })
  const AUTHOR = NOTION_CONFIG?.AUTHOR || BLOG.AUTHOR
  const LANG = NOTION_CONFIG?.LANG || BLOG.LANG
  const year = new Date().getFullYear()

  const feed = new Feed({
    title: TITLE,
    description: DESCRIPTION,
    link: LINK,
    language: LANG,
    favicon: `${LINK}/favicon.png`,
    copyright: `All rights reserved ${year}, ${AUTHOR}`,
    author: {
      name: AUTHOR,
      link: LINK
    }
  })

  for (const post of latestPosts) {
    const postHref = post.href || (post.slug ? `/${post.slug}` : '/')
    feed.addItem({
      title: post.title,
      link: buildPublicUrl(LINK, postHref),
      description: post.summary || '',
      date: new Date(post?.publishDay || post?.publishDate || Date.now())
    })
  }

  return {
    xml: feed.rss2(),
    atomXml: feed.atom1(),
    json: feed.json1(),
    link: LINK
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' })
  }

  try {
    const requestOrigin = resolvePublicSiteLink({ req })
    if (!isCacheFresh(requestOrigin)) {
      const content = await generateRssContent(req)
      if (content) {
        rssCache = {
          ...content,
          updatedAt: Date.now()
        }
      }
    }

    if (!rssCache.xml) {
      return res.status(503).json({ message: 'RSS feed not available' })
    }

    const format = req.query.format || 'rss'

    res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600')

    if (format === 'atom') {
      res.setHeader('Content-Type', 'application/atom+xml; charset=utf-8')
      return res.status(200).send(rssCache.atomXml)
    }

    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json; charset=utf-8')
      return res.status(200).send(rssCache.json)
    }

    // Default: RSS 2.0
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
    return res.status(200).send(rssCache.xml)
  } catch (error) {
    console.error('[RSS API] Error generating feed:', error)
    return res.status(500).json({ message: 'Failed to generate RSS feed' })
  }
}
