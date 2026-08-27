import { feishuFetch } from './client'
import { memoAsync } from './memo'

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
  const key = docs
    .filter(d => d.token)
    .map(d => `${d.token}:${d.type || 'docx'}`)
    .sort()
    .join(',')
  return memoAsync('drive-meta', key, () => batchQueryDriveMetasUncached(docs))
}

async function batchQueryDriveMetasUncached(
  docs: Array<{ token: string; type?: 'docx' | 'doc' | 'sheet' | 'bitable' | 'file' }>
): Promise<Map<string, DriveDocMeta>> {
  const map = new Map<string, DriveDocMeta>()
  const unique = Array.from(new Map(docs.filter(d => d.token).map(d => [d.token, d])).values())
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
  return memoAsync('drive-statistics', `${fileToken}:${fileType}`, async () => {
    return getFileStatisticsUncached(fileToken, fileType)
  })
}

async function getFileStatisticsUncached(
  fileToken: string,
  fileType: 'docx' | 'doc' | 'sheet' | 'bitable' | 'file'
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
  return memoAsync('drive-comments', `${fileToken}:${fileType}:${maxPages}`, async () => {
    return getFileCommentCountUncached(fileToken, fileType, maxPages)
  })
}

async function getFileCommentCountUncached(
  fileToken: string,
  fileType: 'docx' | 'doc',
  maxPages: number
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
const userProfileCache = new Map<string, { name: string | null; avatar: string | null }>()
const userProfileInflight = new Map<string, Promise<FeishuUserProfile>>()

export type FeishuUserProfile = {
  name: string | null
  avatar: string | null
  /** English name if present */
  enName?: string | null
  /** Often needs contact email scope; may be empty */
  email?: string | null
  /** Job title / 职务 */
  jobTitle?: string | null
  /** Employee no */
  employeeNo?: string | null
  openId?: string | null
}

/**
 * Resolve open_id -> display name + avatar.
 * Contact API may fail without directory scope; fall back to view_records names (no avatar).
 */
export async function resolveUserProfile(
  openId: string,
  opts?: { fileToken?: string; fileType?: 'docx' | 'doc' }
): Promise<FeishuUserProfile> {
  if (!openId) return { name: null, avatar: null, openId: null }
  if (userProfileCache.has(openId)) return userProfileCache.get(openId)!
  const pending = userProfileInflight.get(openId)
  if (pending) return pending

  const request = resolveUserProfileUncached(openId, opts)
  userProfileInflight.set(openId, request)
  try {
    return await request
  } finally {
    userProfileInflight.delete(openId)
  }
}

async function resolveUserProfileUncached(
  openId: string,
  opts?: { fileToken?: string; fileType?: 'docx' | 'doc' }
): Promise<FeishuUserProfile> {

  // 1) contact user get
  try {
    const qs = new URLSearchParams({ user_id_type: 'open_id' })
    const data = await feishuFetch<{
      user?: {
        open_id?: string
        name?: string
        en_name?: string
        nickname?: string
        email?: string
        enterprise_email?: string
        job_title?: string
        employee_no?: string
        avatar?: {
          avatar_72?: string
          avatar_240?: string
          avatar_640?: string
          avatar_origin?: string
        }
      }
    }>(`/open-apis/contact/v3/users/${encodeURIComponent(openId)}?${qs.toString()}`)
    const u = data.user
    const name = u?.name || u?.nickname || u?.en_name || null
    const avatar =
      u?.avatar?.avatar_240 ||
      u?.avatar?.avatar_72 ||
      u?.avatar?.avatar_640 ||
      u?.avatar?.avatar_origin ||
      null
    if (name || avatar || u?.email || u?.job_title) {
      const profile: FeishuUserProfile = {
        name,
        avatar,
        enName: u?.en_name || null,
        email: u?.email || u?.enterprise_email || null,
        jobTitle: u?.job_title || null,
        employeeNo: u?.employee_no || null,
        openId: u?.open_id || openId
      }
      userProfileCache.set(openId, profile)
      if (name) userNameCache.set(openId, name)
      return profile
    }
  } catch {
    // ignore — often 41012 without contact scope
  }

  // 2) view_records on the file (name appears for viewers; usually no avatar)
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
        const profile: FeishuUserProfile = {
          name: hit.name,
          avatar: null,
          openId
        }
        userProfileCache.set(openId, profile)
        userNameCache.set(openId, hit.name)
        return profile
      }
    } catch {
      // ignore
    }
  }

  const empty: FeishuUserProfile = { name: null, avatar: null, openId }
  userProfileCache.set(openId, empty)
  userNameCache.set(openId, null)
  return empty
}

/**
 * Resolve open_id -> display name.
 * Contact API may fail without directory scope; fall back to view_records names.
 */
export async function resolveUserDisplayName(
  openId: string,
  opts?: { fileToken?: string; fileType?: 'docx' | 'doc' }
): Promise<string | null> {
  const profile = await resolveUserProfile(openId, opts)
  return profile.name
}

/** unix seconds (or ms) string/number -> ms */
export function feishuTimeToMs(value?: string | number | null): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return n < 1e12 ? n * 1000 : n
}
