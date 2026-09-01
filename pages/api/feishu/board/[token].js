import { downloadBoardAsImage } from '@/lib/feishu/board'

/**
 * Trim the white margin Feishu adds around whiteboard snapshots
 * (download_as_image returns a fixed ~2560px canvas regardless of content),
 * then pad a small margin back so content breathes.
 */
async function trimBoardImage(buf) {
  try {
    const sharp = (await import('sharp')).default
    const trimmed = await sharp(buf)
      .trim({ background: '#ffffff', threshold: 12 })
      .toBuffer()
    return sharp(trimmed)
      .extend({ top: 24, bottom: 24, left: 24, right: 24, background: '#ffffff' })
      .webp({ quality: 90 })
      .toBuffer()
  } catch (e) {
    console.warn('[feishu-board] trim failed, serving raw image:', e?.message)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'method not allowed' })
  }
  const token = req.query.token
  if (!token || Array.isArray(token)) {
    return res.status(400).json({ error: 'missing token' })
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    return res.status(400).json({ error: 'invalid token format' })
  }
  try {
    const upstream = await downloadBoardAsImage(token)
    if (req.method === 'HEAD') {
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png')
      return res.status(200).end()
    }
    const raw = Buffer.from(await upstream.arrayBuffer())
    const trimmed = await trimBoardImage(raw)
    if (trimmed) {
      res.setHeader('Content-Type', 'image/webp')
    } else {
      res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/png')
    }
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).send(trimmed || raw)
  } catch (e) {
    return res.status(502).json({ error: 'download failed' })
  }
}
