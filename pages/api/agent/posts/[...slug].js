import BLOG from '@/blog.config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { getDocumentMarkdown } from '@/lib/feishu/docx'
import { enrichFeishuPost } from '@/lib/site/adapters/feishu/feishu.adapter'
import {
  buildPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

function matchPost(allPages, slugPath) {
  const slug = decodeURIComponent(String(slugPath || '').replace(/^\/+|\/+$/g, ''))
  if (!slug) return null
  const candidates = (allPages || []).filter(
    p => p && (p.type === 'Post' || p.type === 'Page' || p.type === 'Notice')
  )
  return (
    candidates.find(p => p.slug === slug) ||
    candidates.find(p => p.href === `/${slug}` || p.href === slug) ||
    candidates.find(
      p =>
        typeof p.slug === 'string' &&
        (p.slug.endsWith('/' + slug) || p.slug.split('/').pop() === slug)
    ) ||
    candidates.find(
      p =>
        (p.ext && (p.ext.nodeToken === slug || p.ext.documentId === slug)) ||
        false
    ) ||
    null
  )
}

function wantsMarkdown(req) {
  const format = String(req.query.format || '').toLowerCase()
  if (format === 'md' || format === 'markdown' || format === 'text') return true
  const accept = String(req.headers.accept || '')
  if (accept.includes('text/markdown')) return true
  if (accept.includes('text/plain') && !accept.includes('application/json')) {
    return true
  }
  return false
}

/**
 * GET /api/agent/posts/:slug
 * JSON (default) or Markdown (?format=md / Accept: text/markdown)
 */
export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'Method Not Allowed' })
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
      return res.status(404).json({ error: 'Post not found', slug: slugPath })
    }

    let enriched = page
    try {
      if (page.type !== 'Menu' && page.type !== 'SubMenu') {
        enriched = await enrichFeishuPost(page)
      }
    } catch (e) {
      console.warn('[agent/post] enrich failed', page.slug, e)
    }

    const documentId =
      (enriched.ext && enriched.ext.documentId) ||
      enriched.documentId ||
      null
    let markdown = null
    if (documentId) {
      try {
        markdown = await getDocumentMarkdown(documentId)
      } catch {
        markdown = null
      }
    }
    if (!markdown) {
      const plain = enriched.feishuPlainText || enriched.summary || ''
      markdown = `# ${enriched.title || enriched.slug}\n\n${plain}\n`
    }

    const href = enriched.href || `/${enriched.slug}`
    const url = buildPublicUrl(link, href)

    if (wantsMarkdown(req)) {
      const body = [
        `---`,
        `title: ${JSON.stringify(enriched.title || '')}`,
        `slug: ${JSON.stringify(enriched.slug || '')}`,
        `url: ${JSON.stringify(url)}`,
        `canonical: ${JSON.stringify(url)}`,
        enriched.publishDay ? `date: ${JSON.stringify(enriched.publishDay)}` : null,
        `---`,
        '',
        markdown.trim(),
        ''
      ]
        .filter(Boolean)
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
      version: 1,
      generatedAt: new Date().toISOString(),
      site: { link },
      post: {
        id: enriched.id,
        title: enriched.title,
        slug: enriched.slug,
        href,
        url,
        summary: enriched.summary || null,
        category: enriched.category || null,
        tags: enriched.tags || [],
        publishDay: enriched.publishDay || null,
        lastEditedDay: enriched.lastEditedDay || null,
        author: enriched.author || null,
        plainText: enriched.feishuPlainText || null,
        markdown,
        accessError: enriched.accessError || null,
        headings: enriched.feishuHeadings || enriched.toc || [],
        documentId
      }
    })
  } catch (error) {
    console.error('[agent/post] error', error)
    return res.status(500).json({ error: 'Failed to load post' })
  }
}
