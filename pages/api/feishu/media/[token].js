import { downloadMedia } from '@/lib/feishu/media'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'method not allowed' })
  }
  const token = req.query.token
  if (!token || Array.isArray(token)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res.status(400).json({ error: 'missing token' })
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res.status(400).json({ error: 'invalid token format' })
  }
  try {
    const upstream = await downloadMedia(token)
    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

    // Strict guard: JSON or HTML error payloads must NEVER be cached by Edge CDN
    if (contentType.includes('application/json') || contentType.includes('text/html')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res.status(502).json({ error: 'upstream returned non-media payload' })
    }

    const buf = Buffer.from(await upstream.arrayBuffer())

    // Strict guard: empty 0-byte responses must NEVER be cached
    if (buf.length === 0) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return res.status(502).json({ error: 'empty media payload' })
    }

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Length', String(buf.length))
    // Valid media: Cache aggressively on Edge CDN with SWR
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    if (req.method === 'HEAD') {
      return res.status(200).end()
    }
    return res.status(200).send(buf)
  } catch (e) {
    // Failure guard: never allow Cloudflare or Edge CDN to cache error responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    return res.status(502).json({ error: 'download failed', message: e?.message })
  }
}
