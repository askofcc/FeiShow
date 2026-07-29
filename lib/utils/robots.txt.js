import fs from 'fs'
import {
  buildRobotsTxt,
  isLocalOrInvalidPublicUrl,
  resolvePublicSiteLink
} from '@/lib/utils/publicSiteLink'

/**
 * Build-time helper. Runtime production uses /api/robots (dynamic).
 * Avoid writing localhost robots.txt into public/ on bad env.
 */
export function generateRobotsTxt(props) {
  const { siteInfo } = props || {}
  const LINK = resolvePublicSiteLink({
    candidates: [siteInfo?.link, process.env.NEXT_PUBLIC_LINK]
  })
  const content = buildRobotsTxt(LINK, { allow: true })

  // Do not publish a localhost robots file into public/ — it shadows dynamic route.
  if (isLocalOrInvalidPublicUrl(LINK)) {
    try {
      const p = './public/robots.txt'
      if (fs.existsSync(p)) fs.unlinkSync(p)
    } catch (error) {
      // ignore
    }
    return
  }

  try {
    fs.mkdirSync('./public', { recursive: true })
    fs.writeFileSync('./public/robots.txt', content)
  } catch (error) {
    // Vercel runtime FS is read-only; build stage / VPS may succeed.
  }
}
