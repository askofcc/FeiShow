import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  AGENT_API_VERSION,
  agentCors,
  errorBody,
  filterAgentList,
  publishedPages,
  sortByDateDesc,
  toAgentPostSummary
} from '@/lib/agent/serialize'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * GET /api/agent/posts
 * Index of published content for agents. No full body.
 */
export default async function handler(req, res) {
  agentCors(res)
  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD, OPTIONS')
    return res.status(405).json(errorBody('BAD_REQUEST', 'Method Not Allowed'))
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
    const offset = Math.max(parseInt(String(req.query.offset || '0'), 10) || 0, 0)
    const type = String(req.query.type || 'post')
    const filtered = sortByDateDesc(
      filterAgentList(publishedPages(props?.allPages, type), {
        category: req.query.category,
        tag: req.query.tag,
        q: req.query.q
      })
    )
    const posts = filtered
      .slice(offset, offset + limit)
      .map(p => toAgentPostSummary(p, link, buildPublicUrl))

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    )
    return res.status(200).json({
      version: AGENT_API_VERSION,
      generatedAt: new Date().toISOString(),
      site: {
        title: props?.siteInfo?.title || BLOG.AUTHOR,
        description: props?.siteInfo?.description || BLOG.BIO,
        link,
        llmsTxt: `${link}/llms.txt`,
        sitemap: `${link}/sitemap.xml`,
        rss: `${link}/rss/feed.xml`
      },
      limit,
      offset,
      count: posts.length,
      total: filtered.length,
      posts
    })
  } catch (error) {
    console.error('[agent/posts] error', error)
    return res.status(500).json(errorBody('INTERNAL', 'Failed to list posts'))
  }
}
