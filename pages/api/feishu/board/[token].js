import { downloadBoardAsImage } from '@/lib/feishu/board'

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD')
    return res.status(405).json({ error: 'method not allowed' })
  }
  const token = req.query.token
  if (!token || Array.isArray(token)) {
    return res.status(400).json({ error: 'missing token' })
  }
  try {
    const upstream = await downloadBoardAsImage(token)
    const contentType = upstream.headers.get('content-type') || 'image/png'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400')
    if (req.method === 'HEAD') {
      return res.status(200).end()
    }
    const buf = Buffer.from(await upstream.arrayBuffer())
    return res.status(200).send(buf)
  } catch (e) {
    return res.status(502).json({ error: e instanceof Error ? e.message : 'download failed' })
  }
}
