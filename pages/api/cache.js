import BLOG from '@/blog.config'
import { cleanCache } from '@/lib/cache/local_file_cache'
import { cleanCacheData } from '@/lib/cache/cache_manager'
import { clearFeishuTableCache } from '@/lib/feishu/bootstrap'
import { clearMemo } from '@/lib/feishu/memo'

/**
 * 清理缓存
 * @param {*} req
 * @param {*} res
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method not allowed' })
  }

  const token =
    process.env.CACHE_REVALIDATION_TOKEN ||
    process.env.REVALIDATION_TOKEN ||
    BLOG.REVALIDATION_TOKEN

  if (!token) {
    return res.status(503).json({
      status: 'error',
      message: 'Cache cleaning is disabled: CACHE_REVALIDATION_TOKEN or REVALIDATION_TOKEN not set'
    })
  }

  const authHeader = req.headers.authorization || ''
  const receivedToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : req.body?.token || ''

  if (receivedToken !== token) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized' })
  }

  try {
    await cleanCacheData()
    cleanCache()
    clearMemo()
    clearFeishuTableCache()
    return res.status(200).json({ status: 'success', message: 'Clean cache successful!' })
  } catch (error) {
    console.error('Cache clean error:', error)
    return res.status(400).json({ status: 'error', message: 'Clean cache failed!' })
  }
}
