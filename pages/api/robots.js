import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import {
  buildRobotsTxt,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * Dynamic robots.txt — never bake localhost from build-time env/config.
 * Rewritten from /robots.txt via next.config.js
 */
export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).send('Method Not Allowed')
  }

  const link = resolvePublicSiteLink({
    req,
    candidates: [siteConfig('LINK'), BLOG.LINK, process.env.NEXT_PUBLIC_LINK]
  })
  const allow = siteConfig('ROBOTS_ALLOW', true) !== false
  const body = buildRobotsTxt(link, { allow })

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader(
    'Cache-Control',
    'public, s-maxage=3600, stale-while-revalidate=86400'
  )
  return res.status(200).send(body)
}
