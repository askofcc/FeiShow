import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { agentPaths } from '@/lib/agent/serialize'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * /llms.txt — machine-readable site index for AI agents (llmstxt.org style).
 * full=1 → longer listing with summaries.
 */
function publishedPosts(allPages = []) {
  return (allPages || [])
    .filter(p => p && p.type === 'Post' && p.status === 'Published')
    .sort((a, b) => {
      const da = new Date(a.publishDay || a.publishDate || 0).getTime()
      const db = new Date(b.publishDay || b.publishDate || 0).getTime()
      return db - da
    })
}

function publishedPages(allPages = []) {
  return (allPages || []).filter(
    p => p && (p.type === 'Page' || p.type === 'Notice') && p.status === 'Published'
  )
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }

  try {
    const full =
      req.query.full === '1' ||
      req.query.full === 'true' ||
      String(req.url || '').includes('llms-full')

    const props = await fetchGlobalAllData({ from: 'llms-txt' })
    const siteInfo = props?.siteInfo || {}
    const link = resolvePublicSiteLink({
      req,
      candidates: [siteInfo.link, BLOG.LINK, process.env.NEXT_PUBLIC_LINK]
    })
    const title = siteInfo.title || BLOG.AUTHOR || 'FeishuNext'
    const description =
      siteInfo.description || BLOG.BIO || 'Feishu-powered public site'
    const posts = publishedPosts(props?.allPages)
    const pages = publishedPages(props?.allPages)
    const limit = full ? 200 : 40
    const list = posts.slice(0, limit)

    const lines = []
    lines.push(`# ${title}`)
    lines.push('')
    lines.push(`> ${description}`)
    lines.push('')
    lines.push(
      'This file helps AI agents discover public content on this FeishuNext site.'
    )
    lines.push(
      'Human HTML pages are available; machine-friendly JSON/Markdown exports are under /api/agent/.'
    )
    lines.push('')
    lines.push('## Site')
    lines.push(`- Home: ${link}/`)
    lines.push(`- Sitemap: ${link}/sitemap.xml`)
    lines.push(`- RSS: ${link}/rss/feed.xml`)
    lines.push(`- Robots: ${link}/robots.txt`)
    lines.push(`- Agent posts JSON: ${link}/api/agent/posts`)
    lines.push(
      `- This index: ${link}/llms.txt${full ? ' (full)' : ''} | ${link}/llms-full.txt`
    )
    lines.push('')
    lines.push('## Pages')
    if (pages.length === 0) {
      lines.push('- (none)')
    } else {
      for (const p of pages.slice(0, 30)) {
        const href = p.href || `/${p.slug}`
        const url = buildPublicUrl(link, href)
        lines.push(`- [${p.title || p.slug}](${url}): ${p.type}`)
      }
    }
    lines.push('')
    lines.push(`## Posts (${posts.length})`)
    if (list.length === 0) {
      lines.push('- (none)')
    } else {
      for (const p of list) {
        const href = p.href || `/${p.slug}`
        const url = buildPublicUrl(link, href)
        const summary = (p.summary || '').replace(/\s+/g, ' ').trim()
        if (full && summary) {
          lines.push(`- [${p.title || p.slug}](${url}): ${summary}`)
        } else {
          lines.push(`- [${p.title || p.slug}](${url})`)
        }
        const paths = agentPaths(link, p)
        lines.push(`  - json: ${paths.json}`)
        lines.push(`  - markdown: ${paths.markdown}`)
      }
      if (!full && posts.length > list.length) {
        lines.push(
          `- …and ${posts.length - list.length} more — see ${link}/llms-full.txt or ${link}/api/agent/posts`
        )
      }
    }
    lines.push('')
    lines.push('## Notes')
    lines.push(
      '- Content source: Feishu docs/wiki via FeishuNext data layer (not raw Feishu editor JSON).'
    )
    lines.push(
      '- Prefer /api/agent/* or ?format=md over scraping heavy HTML when possible.'
    )
    lines.push('')

    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader(
      'Cache-Control',
      'public, s-maxage=600, stale-while-revalidate=3600'
    )
    return res.status(200).send(lines.join('\n'))
  } catch (error) {
    console.error('[llms.txt] error', error)
    return res.status(500).send('# Error generating llms.txt\n')
  }
}
