import siteConfig from '@/lib/feishu/config'
import {
  extractDate,
  extractDocToken,
  extractMultiSelect,
  extractTextField,
  listBitableRecordsFrom,
  type BitableRecord
} from '@/lib/feishu/bitable'
import {
  listWikiChildren,
  parseWikiToken,
  resolveWikiNode,
  type WikiNode
} from '@/lib/feishu/wiki'
import {
  getDocumentMeta,
  listDocumentBlocks,
  listDocumentBlocksFirstPage,
  type FeishuDisplaySetting,
  type FeishuDocumentMeta
} from '@/lib/feishu/docx'
import {
  batchQueryDriveMetas,
  feishuTimeToMs,
  getFileCommentCount,
  getFileStatistics,
  resolveUserDisplayName
} from '@/lib/feishu/drive'
import {
  contentToPlainText,
  extractHeadings,
  normalizeDocument
} from '@/lib/feishu/normalize'
import { enrichEmbedMetadata } from '@/lib/feishu/embed-meta'
import type { FeishuPageContent } from '@/lib/feishu/types'

export type ContentRowType =
  | 'menu'
  | 'submenu'
  | 'post'
  | 'page'
  | 'category'
  | 'notice'
  | 'config'
  | 'other'

export type ContentRow = {
  recordId: string
  title: string
  type: ContentRowType
  typeRaw: string
  slug: string
  /** Human slug from content table (e.g. about/links/notice) */
  customSlug?: string
  icon?: string
  summary?: string
  date?: string
  category?: string
  tags: string[]
  docToken?: string
  documentId?: string
  nodeToken?: string
  href?: string
  order?: number
  /** wiki owner/creator open_id */
  ownerId?: string
  coverToken?: string
  coverUrl?: string
  displaySetting?: FeishuDisplaySetting | null
  revisionId?: number
  /** document create time ISO */
  createdAt?: string
  /** document last modify time ISO */
  updatedAt?: string
  authorId?: string
  authorName?: string
  lastEditorId?: string
  likeCount?: number
  pv?: number
  uv?: number
  commentCount?: number
}

function mapType(raw: string): ContentRowType {
  const v = (raw || '').trim().toLowerCase()
  if (raw === '菜单' || v === 'menu') return 'menu'
  if (raw === '子菜单' || v === 'submenu' || v === 'sub_menu') return 'submenu'
  if (raw === '文章' || v === 'post' || v === 'blog') return 'post'
  if (raw === '页面' || v === 'page') return 'page'
  if (raw === '分类' || v === 'category') return 'category'
  if (raw === '公告' || v === 'notice') return 'notice'
  if (raw === '配置' || v === 'config') return 'config'
  return 'other'
}

function field(record: BitableRecord, name: string) {
  return record.fields?.[name]
}


/**
 * Align with NotionNext conf/post.config.js POST_URL_PREFIX (default "article").
 * Empty string = no prefix (official also supports this).
 * Themes use both post.href and `/${post.slug}` — both must be the full path.
 */
function getPostUrlPrefix(): string {
  // Match: process.env.NEXT_PUBLIC_POST_URL_PREFIX ?? 'article'
  const env = process.env.NEXT_PUBLIC_POST_URL_PREFIX
  const raw = env === undefined || env === null ? 'article' : String(env)
  // only use first static segment (date patterns not used for Feishu tokens)
  return raw.replace(/^\/|\/$/g, '').split('/').filter(s => s && !s.includes('%'))[0] || ''
}

function stripKnownPrefixes(raw: string): string {
  let s = String(raw || '').trim().replace(/^\//, '')
  if (!s) return ''
  // unwrap one leading "article/" or configured prefix if duplicated
  const prefix = getPostUrlPrefix()
  if (prefix && s.startsWith(prefix + '/')) s = s.slice(prefix.length + 1)
  else if (s.startsWith('article/')) s = s.slice('article/'.length)
  return s
}

/** Page/Menu: bare /{slug} */
function toPageSlugAndHref(tokenOrSlug: string): { slug: string; href: string } {
  const raw = stripKnownPrefixes(tokenOrSlug)
  if (!raw) return { slug: '', href: '#' }
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    return { slug: raw, href: raw }
  }
  return { slug: raw, href: `/${raw}` }
}

/** Post: slug = "article/TOKEN", href = "/article/TOKEN" (or bare if prefix empty) */
function toPostSlugAndHref(tokenOrSlug: string): { slug: string; href: string } {
  if (String(tokenOrSlug || '').startsWith('http://') || String(tokenOrSlug || '').startsWith('https://')) {
    return { slug: String(tokenOrSlug), href: String(tokenOrSlug) }
  }
  const token = stripKnownPrefixes(tokenOrSlug)
  if (!token) return { slug: '', href: '#' }
  const prefix = getPostUrlPrefix()
  if (!prefix) return { slug: token, href: `/${token}` }
  const slug = `${prefix}/${token}`
  return { slug, href: `/${slug}` }
}

export async function loadContentRows(): Promise<ContentRow[]> {
  const feishu = siteConfig.feishu as any
  const appToken = feishu.contentAppToken || feishu.bitableAppToken
  const tableId = feishu.contentTableId || feishu.bitableTableId
  const records = await listBitableRecordsFrom(appToken, tableId)
  const f = siteConfig.fields as any

  return records.map((record, index) => {
    const title = extractTextField(field(record, f.title)) || '未命名'
    const typeRaw = extractTextField(field(record, f.type)) || '文章'
    const type = mapType(typeRaw)
    const slugRaw = extractTextField(field(record, f.slug)).trim()
    const docToken = extractDocToken(field(record, f.document))
    const customSlug = slugRaw || undefined
    const slug = customSlug || docToken || record.record_id
    const icon = extractTextField(field(record, f.icon || '图标')) || undefined
    const summary = extractTextField(field(record, f.summary)) || undefined
    const date = extractDate(field(record, f.date))
    const category = extractTextField(field(record, f.category)) || undefined
    const tags = extractMultiSelect(field(record, f.tags))
    // Posts: full path in slug+href (NotionNext default article/). Pages/menus: bare.
    let finalSlug = slug
    let href: string
    if (slug.startsWith('http://') || slug.startsWith('https://')) {
      href = slug
    } else if (type === 'page' || type === 'menu' || type === 'submenu') {
      const path = toPageSlugAndHref(type === 'page' && customSlug ? customSlug : slug)
      finalSlug = path.slug
      href = path.href
    } else if (type === 'notice') {
      const path = customSlug ? toPageSlugAndHref(customSlug) : toPostSlugAndHref(slug)
      finalSlug = path.slug
      href = path.href
    } else {
      // post
      const path = toPostSlugAndHref(slug)
      finalSlug = path.slug
      href = path.href
    }

    return {
      recordId: record.record_id,
      title,
      type,
      typeRaw,
      slug: finalSlug,
      customSlug,
      icon,
      summary,
      date,
      category,
      tags,
      docToken,
      href,
      order: index
    }
  })
}

export async function resolveDocumentIds(rows: ContentRow[]): Promise<ContentRow[]> {
  const out: ContentRow[] = []
  for (const row of rows) {
    if (!row.docToken) {
      out.push(row)
      continue
    }
    try {
      const node = await resolveWikiNode(row.docToken)
      if (node) {
        const nodeToken = node.node_token || row.docToken
        const documentId = node.obj_token || row.docToken
        // Posts: stable node_token. Pages/Notice: prefer table slug (about/links/notice).
        let stableSlug =
          row.type === 'page' || row.type === 'notice'
            ? row.customSlug || nodeToken || documentId || row.slug
            : row.type === 'post'
              ? nodeToken || documentId || row.slug
              : row.customSlug || row.slug
        let href = row.href
        if (row.type === 'page') {
          href = `/${stableSlug}`
        } else if (row.type === 'post') {
          const p = toPostSlugAndHref(stableSlug)
          stableSlug = p.slug
          href = p.href
        } else if (row.type === 'notice') {
          if (row.customSlug) {
            href = `/${row.customSlug}`
            stableSlug = row.customSlug
          } else {
            const p = toPostSlugAndHref(stableSlug)
            stableSlug = p.slug
            href = p.href
          }
        }
        const editTs = node.obj_edit_time
          ? Number(node.obj_edit_time) * (Number(node.obj_edit_time) < 1e12 ? 1000 : 1)
          : undefined
        const createTs = node.obj_create_time
          ? Number(node.obj_create_time) * (Number(node.obj_create_time) < 1e12 ? 1000 : 1)
          : undefined
        out.push({
          ...row,
          nodeToken,
          documentId,
          slug: stableSlug,
          href,
          title: row.title && row.title !== '未命名' ? row.title : node.title || row.title,
          ownerId: (node as any).owner || (node as any).creator || row.ownerId,
          date:
            row.date ||
            (editTs && Number.isFinite(editTs)
              ? new Date(editTs).toISOString()
              : createTs && Number.isFinite(createTs)
                ? new Date(createTs).toISOString()
                : row.date)
        })
      } else {
        const documentId = row.docToken
        let stableSlug =
          row.type === 'page' || row.type === 'notice'
            ? row.customSlug || documentId || row.slug
            : row.type === 'post'
              ? documentId || row.slug
              : row.customSlug || row.slug
        let href = row.href
        if (row.type === 'page') {
          href = `/${stableSlug}`
        } else if (row.type === 'post') {
          const p = toPostSlugAndHref(stableSlug)
          stableSlug = p.slug
          href = p.href
        } else if (row.type === 'notice') {
          if (row.customSlug) {
            href = `/${row.customSlug}`
            stableSlug = row.customSlug
          } else {
            const p = toPostSlugAndHref(stableSlug)
            stableSlug = p.slug
            href = p.href
          }
        }
        out.push({
          ...row,
          documentId,
          nodeToken: row.docToken,
          slug: stableSlug,
          href
        })
      }
    } catch {
      out.push({ ...row, documentId: row.docToken, nodeToken: row.docToken })
    }
  }
  return out
}

/** Expand category rows: parent wiki children become posts. */
export async function expandCategoryPosts(categoryRows: ContentRow[]): Promise<ContentRow[]> {
  const posts: ContentRow[] = []
  for (const cat of categoryRows) {
    const token = cat.nodeToken || cat.docToken
    if (!token) continue
    try {
      const parent = await resolveWikiNode(token)
      if (!parent?.space_id || !parent.node_token) continue
      const children = await listWikiChildren(parent.space_id, parent.node_token)
      for (const child of children) {
        const nodeToken = child.node_token
        const documentId = child.obj_token
        if (!nodeToken && !documentId) continue
        const title = child.title || '未命名文档'
        const token = nodeToken || documentId!
        const path = toPostSlugAndHref(token)
        posts.push({
          recordId: `cat:${cat.recordId}:${token}`,
          title,
          type: 'post',
          typeRaw: '文章',
          slug: path.slug,
          date: child.obj_edit_time
            ? new Date(Number(child.obj_edit_time) * (Number(child.obj_edit_time) < 1e12 ? 1000 : 1)).toISOString()
            : undefined,
          category: cat.title,
          tags: [],
          docToken: nodeToken,
          nodeToken,
          documentId,
          href: path.href,
          order: posts.length,
          ownerId: (child as any).owner || (child as any).creator,
          // summary filled later by fillMissingSummaries
          summary: undefined
        })
      }
    } catch (e) {
      console.error('[feishu] expand category failed', cat.title, e)
    }
  }
  return posts
}

function mediaUrl(token?: string | null): string | undefined {
  if (!token) return undefined
  return `/api/feishu/media/${token}`
}


/**
 * Site-level banner (NotionNext HOME_BANNER / root page cover).
 * Priority:
 *  1. CONFIG HOME_BANNER_IMAGE when enabled (caller passes non-empty)
 *  2. Main wiki/doc cover from FEISHU_SITE_ROOT / FEISHU_LIST_ROOT / rootDocumentId
 *  3. empty
 */
export async function resolveSitePageCover(
  configBanner?: string | null
): Promise<{ pageCover: string; source: 'config' | 'site-root' | 'empty'; coverToken?: string }> {
  const fromConfig = (configBanner || '').trim()
  if (fromConfig) {
    return { pageCover: fromConfig, source: 'config' }
  }

  const feishu = (siteConfig as any).feishu
  const rootInput =
    process.env.FEISHU_SITE_ROOT ||
    feishu.listRoot ||
    process.env.FEISHU_LIST_ROOT ||
    feishu.rootDocumentId ||
    process.env.FEISHU_ROOT_DOCUMENT_ID ||
    ''

  if (!rootInput) {
    return { pageCover: '', source: 'empty' }
  }

  try {
    let documentId = ''
    const wikiToken = parseWikiToken(String(rootInput))
    if (wikiToken) {
      const node = await resolveWikiNode(wikiToken)
      documentId = node?.obj_token || ''
    } else if (/^[A-Za-z0-9_-]{10,}$/.test(String(rootInput).trim())) {
      // bare docx token
      documentId = String(rootInput).trim()
    }
    if (!documentId) {
      return { pageCover: '', source: 'empty' }
    }
    const meta = await getDocumentMeta(documentId)
    const token = meta?.cover?.token
    if (!token) {
      return { pageCover: '', source: 'empty' }
    }
    return {
      pageCover: mediaUrl(token) || '',
      source: 'site-root',
      coverToken: token
    }
  } catch (e) {
    console.warn('[feishu] resolveSitePageCover failed', e)
    return { pageCover: '', source: 'empty' }
  }
}



/**
 * Article/list cover cascade (display only):
 *   1) own document cover
 *   2) category parent wiki/doc cover (by category title)
 *   3) site-wide pageCover (CONFIG banner or site-root cover)
 */
export function applyCoverCascade(
  posts: ContentRow[],
  categoryRows: ContentRow[],
  siteCoverUrl?: string | null
): ContentRow[] {
  const catCover = new Map<string, { coverUrl?: string; coverToken?: string }>()
  for (const c of categoryRows) {
    const name = (c.title || '').trim()
    if (!name) continue
    if (c.coverUrl || c.coverToken) {
      catCover.set(name, {
        coverUrl: c.coverUrl || mediaUrl(c.coverToken),
        coverToken: c.coverToken
      })
    }
  }
  const site = (siteCoverUrl || '').trim()
  return posts.map(p => {
    if (p.coverUrl || p.coverToken) return p
    const catName = (p.category || '').trim()
    const fromCat = catName ? catCover.get(catName) : undefined
    if (fromCat?.coverUrl || fromCat?.coverToken) {
      return {
        ...p,
        coverToken: fromCat.coverToken || p.coverToken,
        coverUrl: fromCat.coverUrl || mediaUrl(fromCat.coverToken) || p.coverUrl
      }
    }
    if (site) {
      return { ...p, coverUrl: site }
    }
    return p
  })
}

function summarizePlainText(plain: string, maxLen = 120): string {
  const s = (plain || '').replace(/\s+/g, ' ').trim()
  if (!s) return ''
  if (s.length <= maxLen) return s
  return s.slice(0, maxLen).replace(/[\s,，。；;:.]+$/u, '') + '…'
}

/**
 * Cheap summary from first page of blocks (for category children / empty table summary).
 */
export async function extractSummaryFromDocument(
  documentId: string,
  opts?: { title?: string; maxLen?: number }
): Promise<string> {
  const blocks = await listDocumentBlocksFirstPage(documentId, 40)
  const content = normalizeDocument(documentId, blocks, opts?.title || '')
  return summarizePlainText(contentToPlainText(content), opts?.maxLen ?? 120)
}

/**
 * Prefer official Drive meta for create/update time + owner.
 * POST /drive/v1/metas/batch_query
 */
export async function fillOfficialDriveFields(rows: ContentRow[]): Promise<ContentRow[]> {
  const docs = rows
    .filter(r => r.documentId)
    .map(r => ({ token: r.documentId!, type: 'docx' as const }))
  if (!docs.length) return rows
  const metaMap = await batchQueryDriveMetas(docs)
  const withMeta = rows.map(row => {
    if (!row.documentId) return row
    const m = metaMap.get(row.documentId)
    if (!m) return row
    const createMs = feishuTimeToMs(m.create_time)
    const editMs = feishuTimeToMs(m.latest_modify_time)
    return {
      ...row,
      title: row.title && row.title !== '未命名' ? row.title : m.title || row.title,
      ownerId: m.owner_id || row.ownerId,
      authorId: m.owner_id || row.authorId || row.ownerId,
      lastEditorId: m.latest_modify_user || row.lastEditorId,
      createdAt: createMs ? new Date(createMs).toISOString() : row.createdAt,
      updatedAt: editMs ? new Date(editMs).toISOString() : row.updatedAt,
      // Prefer official document times over bitable date column
      date: editMs
        ? new Date(editMs).toISOString()
        : createMs
          ? new Date(createMs).toISOString()
          : row.date
    }
  })

  // Resolve author display names (best-effort; contact scope may be missing)
  const authorIds = [
    ...new Set(withMeta.map(r => r.authorId).filter(Boolean) as string[])
  ]
  const nameMap = new Map<string, string | null>()
  const concurrency = 4
  let cursor = 0
  async function worker() {
    while (cursor < authorIds.length) {
      const i = cursor++
      const id = authorIds[i]
      // pick any file token for view_records fallback
      const sample = withMeta.find(r => r.authorId === id && r.documentId)
      try {
        const name = await resolveUserDisplayName(id, {
          fileToken: sample?.documentId,
          fileType: 'docx'
        })
        nameMap.set(id, name)
      } catch {
        nameMap.set(id, null)
      }
    }
  }
  if (authorIds.length) {
    await Promise.all(
      Array.from({ length: Math.min(concurrency, authorIds.length) }, () => worker())
    )
  }
  return withMeta.map(row => {
    if (!row.authorId) return row
    const name = nameMap.get(row.authorId)
    return name ? { ...row, authorName: name } : row
  })
}

/** Fill missing summaries with limited concurrency. */
export async function fillMissingSummaries(
  rows: ContentRow[],
  opts?: { concurrency?: number; maxLen?: number }
): Promise<ContentRow[]> {
  const concurrency = opts?.concurrency ?? 4
  const maxLen = opts?.maxLen ?? 120
  const targets = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !row.summary &&
        row.documentId &&
        (row.type === 'post' || row.type === 'page' || row.type === 'notice')
    )
  if (!targets.length) return rows

  const out = rows.slice()
  let cursor = 0
  async function worker() {
    while (cursor < targets.length) {
      const i = cursor++
      const { row, index } = targets[i]
      try {
        const summary = await extractSummaryFromDocument(row.documentId!, {
          title: row.title,
          maxLen
        })
        if (summary) {
          out[index] = { ...out[index], summary }
        }
      } catch (e) {
        console.warn('[feishu] summary fill failed', row.documentId, e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()))
  return out
}

/**
 * Optional: attach cover token from docx meta for list cards (limited concurrency).
 */
export async function fillMissingCovers(
  rows: ContentRow[],
  opts?: { concurrency?: number }
): Promise<ContentRow[]> {
  const concurrency = opts?.concurrency ?? 4
  const targets = rows
    .map((row, index) => ({ row, index }))
    .filter(
      ({ row }) =>
        !row.coverToken &&
        row.documentId &&
        (row.type === 'post' ||
          row.type === 'page' ||
          row.type === 'notice' ||
          row.type === 'category')
    )
  if (!targets.length) return rows
  const out = rows.slice()
  let cursor = 0
  async function worker() {
    while (cursor < targets.length) {
      const i = cursor++
      const { row, index } = targets[i]
      try {
        const meta = await getDocumentMeta(row.documentId!)
        const token = meta.cover?.token
        if (token) {
          out[index] = {
            ...out[index],
            coverToken: token,
            coverUrl: mediaUrl(token),
            displaySetting: meta.display_setting || null,
            revisionId: meta.revision_id,
            title:
              out[index].title && out[index].title !== '未命名'
                ? out[index].title
                : meta.title || out[index].title
          }
        } else if (meta.display_setting || meta.revision_id) {
          out[index] = {
            ...out[index],
            displaySetting: meta.display_setting || null,
            revisionId: meta.revision_id
          }
        }
      } catch (e) {
        console.warn('[feishu] cover fill failed', row.documentId, e)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, targets.length) }, () => worker()))
  return out
}

export async function loadFeishuArticleBody(opts: {
  documentId: string
  title?: string
}): Promise<{
  content?: FeishuPageContent
  plainText?: string
  headings?: Array<{ id: string; text: string; level: number }>
  cover?: string
  coverToken?: string
  coverOffsetX?: number
  coverOffsetY?: number
  displaySetting?: FeishuDisplaySetting | null
  revisionId?: number
  accessError?: string
  lastEdited?: string
  createdAt?: string
  updatedAt?: string
  metaTitle?: string
  meta?: FeishuDocumentMeta | null
  authorId?: string
  authorName?: string
  lastEditorId?: string
  likeCount?: number
  pv?: number
  uv?: number
  commentCount?: number
}> {
  try {
    const [meta, blocks] = await Promise.all([
      getDocumentMeta(opts.documentId).catch(() => null),
      listDocumentBlocks(opts.documentId)
    ])
    const title = meta?.title || opts.title || ''
    let content = normalizeDocument(opts.documentId, blocks, title)
    content = await enrichEmbedMetadata(content).catch(() => content)
    const plainText = contentToPlainText(content)
    const headings = extractHeadings(content)
    const coverToken = meta?.cover?.token
    // Official drive meta + statistics for detail page
    let createdAt: string | undefined
    let updatedAt: string | undefined
    let authorId: string | undefined
    let authorName: string | undefined
    let lastEditorId: string | undefined
    let likeCount: number | undefined
    let pv: number | undefined
    let uv: number | undefined
    let commentCount: number | undefined
    try {
      const driveMap = await batchQueryDriveMetas([{ token: opts.documentId, type: 'docx' }])
      const dm = driveMap.get(opts.documentId)
      if (dm) {
        const c = feishuTimeToMs(dm.create_time)
        const e = feishuTimeToMs(dm.latest_modify_time)
        createdAt = c ? new Date(c).toISOString() : undefined
        updatedAt = e ? new Date(e).toISOString() : undefined
        authorId = dm.owner_id
        lastEditorId = dm.latest_modify_user
        if (authorId) {
          authorName =
            (await resolveUserDisplayName(authorId, {
              fileToken: opts.documentId,
              fileType: 'docx'
            })) || undefined
        }
      }
    } catch (e) {
      console.warn('[feishu] detail drive meta failed', e)
    }
    try {
      const stats = await getFileStatistics(opts.documentId, 'docx')
      if (stats) {
        likeCount = stats.like_count
        pv = stats.pv
        uv = stats.uv
      }
    } catch {}
    // comments only when display says show (or always attach small count)
    try {
      if (meta?.display_setting?.show_comment_count !== false) {
        const cc = await getFileCommentCount(opts.documentId, 'docx', 3)
        if (cc != null) commentCount = cc
      }
    } catch {}

    return {
      content,
      plainText,
      headings,
      cover: mediaUrl(coverToken),
      coverToken: coverToken || undefined,
      coverOffsetX: meta?.cover?.offset_ratio_x,
      coverOffsetY: meta?.cover?.offset_ratio_y,
      displaySetting: meta?.display_setting || null,
      revisionId: meta?.revision_id,
      metaTitle: meta?.title || opts.title,
      meta: meta || null,
      createdAt,
      updatedAt,
      lastEdited: updatedAt,
      authorId,
      authorName,
      lastEditorId,
      likeCount,
      pv,
      uv,
      commentCount
    }
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e)
    return {
      accessError:
        /99991672|permission|403|131006/i.test(msg)
          ? '当前应用无权阅读该文档，或文档未对应用授权。'
          : `无法加载文档：${msg}`
    }
  }
}

function parseConfigValue(raw: string): any {
  const v = (raw ?? '').trim()
  if (v === '') return ''
  if (v === 'true' || v === 'false') return v === 'true'
  if (/^-?\d+(\.\d+)?$/.test(v)) {
    const n = Number(v)
    if (Number.isFinite(n) && Math.abs(n) <= Number.MAX_SAFE_INTEGER) return n
  }
  if (
    (v.startsWith('{') && v.endsWith('}')) ||
    (v.startsWith('[') && v.endsWith(']'))
  ) {
    try {
      return JSON.parse(v)
    } catch {
      return v
    }
  }
  return v
}

/**
 * Whether CONFIG-TABLE 「启用」is on.
 * Feishu often omits unchecked checkboxes → missing means OFF.
 */
export function isConfigRowEnabled(enabledRaw: unknown): boolean {
  if (enabledRaw === true || enabledRaw === 1) return true
  if (typeof enabledRaw === 'string') {
    const s = enabledRaw.trim().toLowerCase()
    return s === 'true' || s === 'yes' || s === '是' || s === '1'
  }
  if (Array.isArray(enabledRaw) && enabledRaw.length === 1) {
    return isConfigRowEnabled(enabledRaw[0])
  }
  return false
}

/**
 * Feature-flag style keys: when row exists but 启用 is off → force `false`
 * (override blog.config defaults that are often true).
 * Non-listed keys with boolean 配置值 also get the same treatment.
 */
const BOOLEAN_FEATURE_KEYS = new Set([
  'THEME_SWITCH',
  'CAN_COPY',
  'CUSTOM_MENU',
  'WIDGET_PET',
  'WIDGET_PET_SWITCH_THEME',
  'POST_SHARE_BAR_ENABLE',
  'POST_TITLE_ICON',
  'POST_LIST_COVER',
  'POST_DISABLE_GALLERY_CLICK',
  'POST_DISABLE_DATABASE_CLICK',
  'CUSTOM_RIGHT_CLICK_CONTEXT_MENU',
  'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_THEME_SWITCH',
  'CUSTOM_RIGHT_CLICK_CONTEXT_MENU_DARK_MODE',
  'ENABLE_RSS',
  'PSEUDO_STATIC',
  'POST_LIST_PREVIEW',
  'POST_SCHEDULE_PUBLISH',
  'TAG_SORT_BY_COUNT',
  'IS_TAG_COLOR_DISTINGUISHED',
  'CODE_MAC_BAR',
  'CODE_COLLAPSE',
  'CODE_COLLAPSE_EXPAND_DEFAULT',
  'PRISM_THEME_SWITCH',
  'MUSIC_PLAYER',
  'MUSIC_PLAYER_VISIBLE',
  'MUSIC_PLAYER_AUTO_PLAY',
  'ANALYTICS_BUSUANZI_ENABLE',
  'EXAMPLE_POST_LIST_COVER',
  'EXAMPLE_TITLE_IMAGE',
])

function isBooleanConfigValue(parsed: unknown, valueRaw: string, key: string): boolean {
  if (typeof parsed === 'boolean') return true
  if (BOOLEAN_FEATURE_KEYS.has(key)) return true
  const s = (valueRaw || '').trim().toLowerCase()
  return s === 'true' || s === 'false'
}

/**
 * Load site config from Feishu CONFIG-TABLE.
 *
 * Product model (Feishu-friendly):
 * - 「配置值」for feature flags should be `true` (the ON value when enabled)
 * - 「启用」is the only switch: checked → use 配置值; unchecked → false for booleans
 * - String configs (TITLE/LINK/THEME…): checked → use value; unchecked → ignore (env/default)
 *
 * Do NOT put `false` in 配置值 to mean "default off" — leave 启用 unchecked instead.
 */
export async function loadConfigMap(): Promise<Record<string, any>> {
  const feishu = siteConfig.feishu as any
  const appToken = feishu.configAppToken
  const tableId = feishu.configTableId
  if (!appToken || !tableId) return {}
  try {
    const records = await listBitableRecordsFrom(appToken, tableId)
    const map: Record<string, any> = {}
    for (const r of records) {
      const fields = r.fields || {}
      const key = extractTextField(
        fields['配置名'] ?? fields['key'] ?? fields['Key']
      ).trim()
      if (!key) continue

      const valueRaw = extractTextField(
        fields['配置值'] ?? fields['value'] ?? fields['Value']
      )
      const enabledRaw = fields['启用'] ?? fields['enable'] ?? fields['Enable']
      const enabled = isConfigRowEnabled(enabledRaw)
      let parsed = parseConfigValue(valueRaw)

      // Feature flags: empty 配置值 + 启用 = treat as true (on)
      if (
        enabled &&
        (parsed === '' || parsed == null) &&
        BOOLEAN_FEATURE_KEYS.has(key)
      ) {
        parsed = true
      }

      if (enabled) {
        map[key] = parsed
        continue
      }

      // 未启用：布尔类配置强制 false，避免回落到 blog.config 的 true
      if (isBooleanConfigValue(parsed, valueRaw, key)) {
        map[key] = false
      }
      // 字符串/JSON/数字：未启用则不写入
    }
    if (map.INLINE_CONFIG && typeof map.INLINE_CONFIG === 'object' && !Array.isArray(map.INLINE_CONFIG)) {
      Object.assign(map, map.INLINE_CONFIG)
    }
    return map
  } catch (e) {
    console.error('[feishu] loadConfigMap failed', e)
    return {}
  }
}

export type { WikiNode }
