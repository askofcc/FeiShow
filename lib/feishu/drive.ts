import { feishuFetch } from './client'

export type DriveDocMeta = {
  doc_token: string
  doc_type?: string
  title?: string
  create_time?: string
  latest_modify_time?: string
  latest_modify_user?: string
  owner_id?: string
  url?: string
}

export type DriveFileStatistics = {
  file_token?: string
  file_type?: string
  statistics?: {
    like_count?: number
    like_count_today?: number
    pv?: number
    pv_today?: number
    uv?: number
    uv_today?: number
    timestamp?: number
  }
}

type BatchMetaResponse = {
  metas?: DriveDocMeta[]
  failed_list?: Array<{ token?: string; code?: number }>
}

/**
 * Official: POST /open-apis/drive/v1/metas/batch_query
 * Returns create_time / latest_modify_time / owner_id for docs.
 */
export async function batchQueryDriveMetas(
  docs: Array<{ token: string; type?: 'docx' | 'doc' | 'sheet' | 'bitable' | 'file' }>
): Promise<Map<string, DriveDocMeta>> {
  const map = new Map<string, DriveDocMeta>()
  const unique = [...new Map(docs.filter(d => d.token).map(d => [d.token, d])).values()]
  if (!unique.length) return map

  // API typically allows batching; chunk by 50 to be safe
  const chunkSize = 50
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize)
    try {
      const data = await feishuFetch<BatchMetaResponse>(
        '/open-apis/drive/v1/metas/batch_query',
        {
          method: 'POST',
          body: JSON.stringify({
            request_docs: chunk.map(d => ({
              doc_token: d.token,
              doc_type: d.type || 'docx'
            })),
            with_url: true
          })
        }
      )
      for (const m of data.metas || []) {
        if (m.doc_token) map.set(m.doc_token, m)
      }
    } catch (e) {
      console.warn('[feishu] batchQueryDriveMetas failed chunk', e)
    }
  }
  return map
}

/** Official: GET /open-apis/drive/v1/files/:token/statistics?file_type=docx */
export async function getFileStatistics(
  fileToken: string,
  fileType: 'docx' | 'doc' | 'sheet' | 'bitable' | 'file' = 'docx'
): Promise<DriveFileStatistics['statistics'] | null> {
  try {
    const qs = new URLSearchParams({ file_type: fileType })
    const data = await feishuFetch<DriveFileStatistics>(
      `/open-apis/drive/v1/files/${encodeURIComponent(fileToken)}/statistics?${qs.toString()}`
    )
    return data.statistics || null
  } catch (e) {
    console.warn('[feishu] getFileStatistics failed', fileToken, e)
    return null
  }
}

/**
 * Comment count via listing first page and has_more heuristic is imperfect;
 * we page until end with small page_size only when needed (detail).
 * Official: GET /open-apis/drive/v1/files/:file_token/comments
 */
export async function getFileCommentCount(
  fileToken: string,
  fileType: 'docx' | 'doc' = 'docx',
  maxPages = 5
): Promise<number | null> {
  try {
    let pageToken = ''
    let total = 0
    let page = 0
    do {
      page += 1
      const qs = new URLSearchParams({
        file_type: fileType,
        page_size: '50',
        user_id_type: 'open_id'
      })
      if (pageToken) qs.set('page_token', pageToken)
      const data = await feishuFetch<{
        items?: unknown[]
        has_more?: boolean
        page_token?: string
      }>(
        `/open-apis/drive/v1/files/${encodeURIComponent(fileToken)}/comments?${qs.toString()}`
      )
      total += (data.items || []).length
      pageToken = data.has_more ? data.page_token || '' : ''
    } while (pageToken && page < maxPages)
    return total
  } catch (e) {
    console.warn('[feishu] getFileCommentCount failed', fileToken, e)
    return null
  }
}

const userNameCache = new Map<string, string | null>()

/**
 * Resolve open_id -> display name.
 * Contact API may fail without directory scope; fall back to view_records names.
 */
export async function resolveUserDisplayName(
  openId: string,
  opts?: { fileToken?: string; fileType?: 'docx' | 'doc' }
): Promise<string | null> {
  if (!openId) return null
  if (userNameCache.has(openId)) return userNameCache.get(openId) || null

  // 1) contact user get
  try {
    const qs = new URLSearchParams({ user_id_type: 'open_id' })
    const data = await feishuFetch<{
      user?: { name?: string; en_name?: string; nickname?: string }
    }>(`/open-apis/contact/v3/users/${encodeURIComponent(openId)}?${qs.toString()}`)
    const name = data.user?.name || data.user?.nickname || data.user?.en_name || null
    if (name) {
      userNameCache.set(openId, name)
      return name
    }
  } catch {
    // ignore — often 41012 without contact scope
  }

  // 2) view_records on the file (name appears for viewers)
  if (opts?.fileToken) {
    try {
      const qs = new URLSearchParams({
        file_type: opts.fileType || 'docx',
        page_size: '20'
      })
      const data = await feishuFetch<{
        items?: Array<{ name?: string; viewer_id?: string }>
      }>(
        `/open-apis/drive/v1/files/${encodeURIComponent(opts.fileToken)}/view_records?${qs.toString()}`
      )
      const hit = (data.items || []).find(i => i.viewer_id === openId && i.name)
      if (hit?.name) {
        userNameCache.set(openId, hit.name)
        return hit.name
      }
    } catch {
      // ignore
    }
  }

  userNameCache.set(openId, null)
  return null
}

/** unix seconds (or ms) string/number -> ms */
export function feishuTimeToMs(value?: string | number | null): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n < 1e12 ? n * 1000 : n
}
