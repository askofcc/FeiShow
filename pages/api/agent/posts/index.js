import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * GET /api/agent/posts
 * Lightweight post index for AI agents (no full body by default).
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  try {
    const props = await fetchGlobalAllData({ from: 'agent-posts-index' })
    const link = resolvePublicSiteLink({
      req,
      candidates: [props?.siteInfo?.link, BLOG.LINK, process.env.NEXT_PUBLIC_LINK]
    })
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || '50'), 10) || 50, 1),
      200
    )
    const posts = (props?.allPages || [])
      .filter(p => p && p.type === 'Post' && p.status === 'Published')
      .sort((a, b) => {
        const da = new Date(a.publishDay || a.publishDate || 0).getTime()
        const db = new Date(b.publishDay || b.publishDate || 0).getTime()
        return db - da
      })
      .slice(0, limit)
      .map(p => {
        const href = p.href || `/${p.slug}`
        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          href,
          url: buildPublicUrl(link, href),
          summary: p.summary || null,
          category: p.category || null,
          tags: p.tags || [],
          publishDay: p.publishDay || null,
          lastEditedDay: p.lastEditedDay || null,
          agent: {
            json: `${link}/api/agent/posts/${encodeURIComponent(p.slug)}`,
            markdown: `${link}/api/agent/posts/${encodeURIComponent(p.slug)}?format=md`
          }
        }
      })

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    )
    return res.status(200).json({
      version: 1,
      generatedAt: new Date().toISOString(),
      site: {
        title: props?.siteInfo?.title || BLOG.AUTHOR,
        description: props?.siteInfo?.description || BLOG.BIO,
        link,
        llmsTxt: `${link}/llms.txt`,
        sitemap: `${link}/sitemap.xml`,
        rss: `${link}/rss/feed.xml`
      },
      count: posts.length,
      posts
    })
  } catch (error) {
    console.error('[agent/posts] error', error)
    return res.status(500).json({ error: 'Failed to list posts' })
  }
}
