import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { contentToMarkdown } from '@/lib/feishu/markdown'
import { enrichFeishuPost } from '@/lib/site/adapters/feishu/feishu.adapter'
import {
  AGENT_API_VERSION,
  agentCors,
  agentSlug,
  errorBody,
  matchPost,
  toAgentPostDetail,
  wantsMarkdown
} from '@/lib/agent/serialize'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * GET /api/agent/posts/:slug
 * JSON (default) or Markdown (?format=md / Accept: text/markdown)
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
    const parts = req.query.slug
    const slugPath = Array.isArray(parts) ? parts.join('/') : String(parts || '')
    const props = await fetchGlobalAllData({ from: 'agent-post-detail' })
    const link = resolvePublicSiteLink({
      req,
      candidates: [props?.siteInfo?.link, BLOG.LINK, process.env.NEXT_PUBLIC_LINK]
    })
    const page = matchPost(props?.allPages, slugPath)
    if (!page) {
      return res
        .status(404)
        .json(errorBody('NOT_FOUND', 'Post not found', { slug: slugPath }))
    }

    let enriched = page
    try {
      if (page.type !== 'Menu' && page.type !== 'SubMenu') {
        enriched = await enrichFeishuPost(page)
      }
    } catch (e) {
      console.warn('[agent/post] enrich failed', page.slug, e)
    }

    const content = enriched.feishuContent || null
    let markdownSource = content ? 'feishu-blocks' : 'plaintext-fallback'
    let markdown = contentToMarkdown(content, {
      title: enriched.title || agentSlug(enriched),
      assetBase: link
    })
    if (!markdown.trim()) {
      const plain = enriched.feishuPlainText || enriched.summary || ''
      markdown = `# ${enriched.title || agentSlug(enriched)}\n\n${plain}\n`
      markdownSource = content ? 'feishu-blocks' : 'plaintext-fallback'
    }

    const detail = toAgentPostDetail(enriched, {
      link,
      markdown,
      markdownSource,
      buildPublicUrl
    })

    if (wantsMarkdown(req)) {
      const body = [
        '---',
        `title: ${JSON.stringify(detail.title || '')}`,
        `slug: ${JSON.stringify(detail.slug || '')}`,
        `url: ${JSON.stringify(detail.url || '')}`,
        `canonical: ${JSON.stringify(detail.url || '')}`,
        detail.publishedAt ? `date: ${JSON.stringify(detail.publishedAt)}` : null,
        detail.updatedAt ? `updated: ${JSON.stringify(detail.updatedAt)}` : null,
        `markdownSource: ${JSON.stringify(markdownSource)}`,
        '---',
        '',
        markdown.trim(),
        ''
      ]
        .filter(item => item !== null)
        .join('\n')
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
      res.setHeader(
        'Cache-Control',
        'public, s-maxage=300, stale-while-revalidate=3600'
      )
      return res.status(200).send(body)
    }

    res.setHeader(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=3600'
    )
    return res.status(200).json({
      version: AGENT_API_VERSION,
      generatedAt: new Date().toISOString(),
      site: { link },
      post: detail
    })
  } catch (error) {
    console.error('[agent/post] error', error)
    return res.status(500).json(errorBody('INTERNAL', 'Failed to load post'))
  }
}
