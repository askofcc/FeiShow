/**
 * Resolve a public absolute site origin for agents/SEO/feeds.
 * Never prefer localhost / loopback when a real deployment host exists.
 */

function trimSlash(url) {
  return String(url || '').trim().replace(/\/+$/, '')
}

export function isLocalOrInvalidPublicUrl(value) {
  if (!value || typeof value !== 'string') return true
  const raw = value.trim()
  if (!raw) return true
  try {
    const withProto = /^(https?:)?\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProto)
    const host = (u.hostname || '').toLowerCase()
    if (!host) return true
    if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') return true
    if (host.endsWith('.local')) return true
    return false
  } catch {
    return true
  }
}

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') return ''
  const raw = value.trim()
  if (!raw) return ''
  try {
    const withProto = /^(https?:)?\/\//i.test(raw)
      ? raw.replace(/^\/\//, 'https://')
      : `https://${raw}`
    const u = new URL(withProto)
    if (isLocalOrInvalidPublicUrl(u.toString())) return ''
    return trimSlash(`${u.protocol}//${u.host}`)
  } catch {
    return ''
  }
}

function originFromRequest(req) {
  if (!req || !req.headers) return ''
  const xfProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
  const xfHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim()
  const host = xfHost || String(req.headers.host || '').split(',')[0].trim()
  if (!host) return ''
  const proto =
    xfProto ||
    (host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https')
  return normalizeOrigin(`${proto}://${host}`)
}

/**
 * @param {object} [opts]
 * @param {import('http').IncomingMessage} [opts.req]
 * @param {string[]} [opts.candidates] extra candidates (config LINK, siteInfo.link, …)
 * @returns {string} absolute origin without trailing slash
 */
export function resolvePublicSiteLink(opts = {}) {
  const { req, candidates = [] } = fromOptsSafe(opts)

  const fromReq = originFromRequest(req)
  if (fromReq) return fromReq

  const envCandidates = [
    process.env.NEXT_PUBLIC_LINK,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${String(process.env.VERCEL_PROJECT_PRODUCTION_URL).replace(/^https?:\/\//, '')}`
      : '',
    process.env.VERCEL_URL
      ? `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, '')}`
      : ''
  ]

  for (const c of [...candidates, ...envCandidates]) {
    const n = normalizeOrigin(c)
    if (n) return n
  }

  // Last resort for local dev only
  return 'http://localhost:3460'
}

function fromOptsSafe(opts) {
  return {
    req: opts && opts.req,
    candidates: Array.isArray(opts && opts.candidates) ? opts.candidates : []
  }
}

export function buildPublicUrl(base, path = '') {
  const origin = trimSlash(base || '')
  if (!path) return origin || ''
  if (/^https?:\/\//i.test(path)) return path
  const p = String(path).startsWith('/') ? String(path) : `/${path}`
  return `${origin}${p}`
}

/**
 * Build robots.txt body with a resolved public origin.
 */
export function buildRobotsTxt(link, { allow = true } = {}) {
  const origin = trimSlash(link) || 'https://example.com'
  if (!allow) {
    return `User-agent: *
Disallow: /

Sitemap: ${origin}/sitemap.xml
`
  }
  return `# FeiShow robots
User-agent: *
Allow: /
# Private app surfaces
Disallow: /_next/
Disallow: /admin/
Disallow: /private/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /dashboard
# Keep most APIs closed, but allow agent/machine exports
Disallow: /api/
Allow: /api/agent/
Allow: /api/rss
Allow: /api/llms
Allow: /api/robots

# AI / research crawlers — allow public content + machine exports
User-agent: GPTBot
Allow: /
Allow: /api/agent/
User-agent: ChatGPT-User
Allow: /
Allow: /api/agent/
User-agent: Google-Extended
Allow: /
User-agent: anthropic-ai
Allow: /
Allow: /api/agent/
User-agent: ClaudeBot
Allow: /
Allow: /api/agent/
User-agent: PerplexityBot
Allow: /
Allow: /api/agent/

Host: ${origin}
Sitemap: ${origin}/sitemap.xml
Sitemap: ${origin}/rss/feed.xml
# Machine-readable index for agents
# See also: ${origin}/llms.txt
`
}
