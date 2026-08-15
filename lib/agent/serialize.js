/**
 * Single serialization point for AI/agent exports.
 * HTML page stays the rich reading view; JSON/MD are projections
 * of the same SiteData / feishuContent — not a second Feishu fetch.
 */

export const AGENT_API_VERSION = 1

export function agentCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type')
}

export function toIsoTime(page) {
  const raw =
    page?.updatedAt ||
    page?.lastEditedDate ||
    page?.lastEditedDay ||
    page?.publishDate ||
    page?.publishDay ||
    page?.date
  if (raw == null || raw === '') return null
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString()
}

export function publishedAtIso(page) {
  const raw = page?.publishedAt || page?.publishDate || page?.publishDay || page?.date
  if (raw == null || raw === '') return toIsoTime(page)
  if (typeof raw === 'number') {
    const ms = raw < 1e12 ? raw * 1000 : raw
    const d = new Date(ms)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString()
}

export function pageType(page) {
  const t = String(page?.type || 'Post')
  if (t === 'Page') return 'page'
  if (t === 'Notice') return 'notice'
  return 'post'
}

/** Token used in /api/agent/posts/:id — last slug segment or nodeToken. */
export function agentSlug(page) {
  const node = page?.ext?.nodeToken
  if (node) return String(node)
  const slug = String(page?.slug || '').replace(/^\/+|\/+$/g, '')
  if (!slug) return String(page?.id || '')
  const parts = slug.split('/').filter(Boolean)
  return parts[parts.length - 1] || slug
}

export function pageHref(page) {
  return page?.href || (page?.slug ? `/${String(page.slug).replace(/^\/+/, '')}` : '/')
}

export function agentPaths(link, page) {
  const id = encodeURIComponent(agentSlug(page))
  return {
    json: `${link}/api/agent/posts/${id}`,
    markdown: `${link}/api/agent/posts/${id}?format=md`
  }
}

export function matchAgentType(page, typeFilter) {
  const want = String(typeFilter || 'post').toLowerCase()
  const t = pageType(page)
  if (want === 'all') return t === 'post' || t === 'page' || t === 'notice'
  return t === want
}

export function publishedPages(allPages, typeFilter = 'post') {
  return (allPages || []).filter(p => {
    if (!p || p.status !== 'Published') return false
    if (p.type === 'Menu' || p.type === 'SubMenu') return false
    return matchAgentType(p, typeFilter)
  })
}

export function filterAgentList(pages, query = {}) {
  const category = query.category ? String(query.category) : ''
  const tag = query.tag ? String(query.tag) : ''
  const q = query.q ? String(query.q).trim().toLowerCase() : ''
  return pages.filter(p => {
    if (category && String(p.category || '') !== category) return false
    if (tag && !(p.tags || []).includes(tag)) return false
    if (q) {
      const hay = `${p.title || ''} ${p.summary || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
}

export function sortByDateDesc(pages) {
  return pages.slice().sort((a, b) => {
    const da = new Date(a.lastEditedDate || a.publishDate || a.publishDay || 0).getTime()
    const db = new Date(b.lastEditedDate || b.publishDate || b.publishDay || 0).getTime()
    return db - da
  })
}

export function toAgentPostSummary(page, link, buildPublicUrl) {
  const href = pageHref(page)
  const paths = agentPaths(link, page)
  return {
    id: page.id || agentSlug(page),
    type: pageType(page),
    title: page.title || agentSlug(page),
    slug: agentSlug(page),
    href,
    url: buildPublicUrl(link, href),
    summary: page.summary || null,
    category: page.category || null,
    tags: page.tags || [],
    publishedAt: publishedAtIso(page),
    updatedAt: toIsoTime(page),
    documentId: (page.ext && page.ext.documentId) || page.documentId || null,
    agent: paths
  }
}

export function projectContent(content) {
  if (!content) return null
  return {
    documentId: content.documentId || null,
    title: content.title || null,
    rootId: content.rootId || null,
    blocks: content.blocks || []
  }
}

export function toAgentPostDetail(enriched, { link, markdown, markdownSource, buildPublicUrl }) {
  const summary = toAgentPostSummary(enriched, link, buildPublicUrl)
  const content = projectContent(enriched.feishuContent)
  return {
    ...summary,
    author: enriched.author || null,
    content,
    plainText: enriched.feishuPlainText || null,
    markdown: markdown || null,
    markdownSource: markdownSource || (content ? 'feishu-blocks' : 'plaintext-fallback'),
    headings: enriched.feishuHeadings || enriched.toc || [],
    accessError: enriched.accessError || null
  }
}

export function matchPost(allPages, slugPath) {
  const slug = decodeURIComponent(String(slugPath || '').replace(/^\/+|\/+$/g, ''))
  if (!slug) return null
  const candidates = (allPages || []).filter(
    p => p && (p.type === 'Post' || p.type === 'Page' || p.type === 'Notice')
  )
  return (
    candidates.find(p => agentSlug(p) === slug) ||
    candidates.find(p => p.slug === slug) ||
    candidates.find(p => p.href === `/${slug}` || p.href === slug) ||
    candidates.find(
      p =>
        typeof p.slug === 'string' &&
        (p.slug.endsWith('/' + slug) || p.slug.split('/').pop() === slug)
    ) ||
    candidates.find(
      p => p.ext && (p.ext.nodeToken === slug || p.ext.documentId === slug)
    ) ||
    null
  )
}

export function wantsMarkdown(req) {
  const format = String(req.query.format || '').toLowerCase()
  if (format === 'md' || format === 'markdown' || format === 'text') return true
  const accept = String(req.headers.accept || '')
  if (accept.includes('text/markdown')) return true
  if (accept.includes('text/plain') && !accept.includes('application/json')) {
    return true
  }
  return false
}

export function errorBody(code, message, extra = {}) {
  return { error: { code, message }, ...extra }
}
