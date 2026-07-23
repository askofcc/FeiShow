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
  resolveWikiNode,
  type WikiNode
} from '@/lib/feishu/wiki'
import { getDocumentMeta, listDocumentBlocks } from '@/lib/feishu/docx'
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
    const slugRaw = extractTextField(field(record, f.slug))
    const docToken = extractDocToken(field(record, f.document))
    const slug = slugRaw || docToken || record.record_id
    const icon = extractTextField(field(record, f.icon || '图标')) || undefined
    const summary = extractTextField(field(record, f.summary)) || undefined
    const date = extractDate(field(record, f.date))
    const category = extractTextField(field(record, f.category)) || undefined
    const tags = extractMultiSelect(field(record, f.tags))
    const href =
      slug.startsWith('http') || slug.startsWith('/')
        ? slug
        : type === 'page'
          ? `/${slug}`
          : `/article/${slug}`

    return {
      recordId: record.record_id,
      title,
      type,
      typeRaw,
      slug,
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
        out.push({
          ...row,
          nodeToken: node.node_token || row.docToken,
          documentId: node.obj_token || row.docToken,
          title: row.title && row.title !== '未命名' ? row.title : node.title || row.title
        })
      } else {
        out.push({ ...row, documentId: row.docToken, nodeToken: row.docToken })
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
        const slug = nodeToken || documentId!
        posts.push({
          recordId: `cat:${cat.recordId}:${slug}`,
          title,
          type: 'post',
          typeRaw: '文章',
          slug,
          date: child.obj_edit_time
            ? new Date(Number(child.obj_edit_time) * (Number(child.obj_edit_time) < 1e12 ? 1000 : 1)).toISOString()
            : undefined,
          category: cat.title,
          tags: [],
          docToken: nodeToken,
          nodeToken,
          documentId,
          href: `/article/${slug}`,
          order: posts.length
        })
      }
    } catch (e) {
      console.error('[feishu] expand category failed', cat.title, e)
    }
  }
  return posts
}

export async function loadFeishuArticleBody(opts: {
  documentId: string
  title?: string
}): Promise<{
  content?: FeishuPageContent
  plainText?: string
  headings?: Array<{ id: string; text: string; level: number }>
  cover?: string
  accessError?: string
  lastEdited?: string
  metaTitle?: string
}> {
  try {
    const [meta, blocks] = await Promise.all([
      getDocumentMeta(opts.documentId).catch(() => ({ title: opts.title || '' })),
      listDocumentBlocks(opts.documentId)
    ])
    let content = normalizeDocument(
      opts.documentId,
      blocks,
      (meta as any).title || opts.title || ''
    )
    content = await enrichEmbedMetadata(content).catch(() => content)
    const plainText = contentToPlainText(content)
    const headings = extractHeadings(content)
    const coverToken = (meta as any)?.cover?.token
    return {
      content,
      plainText,
      headings,
      cover: coverToken ? `/api/feishu/media/${coverToken}` : undefined,
      metaTitle: (meta as any)?.title,
      lastEdited: (meta as any)?.edit_time
        ? new Date(Number((meta as any).edit_time) * 1000).toISOString()
        : undefined
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

export async function loadConfigMap(): Promise<Record<string, string>> {
  const feishu = siteConfig.feishu as any
  const appToken = feishu.configAppToken
  const tableId = feishu.configTableId
  if (!appToken || !tableId) return {}
  try {
    const records = await listBitableRecordsFrom(appToken, tableId)
    const map: Record<string, string> = {}
    for (const r of records) {
      const key = extractTextField(r.fields['配置名'] ?? r.fields['key'] ?? r.fields['Key'])
      const value = extractTextField(r.fields['配置值'] ?? r.fields['value'] ?? r.fields['Value'])
      const enabledRaw = r.fields['启用'] ?? r.fields['enable'] ?? r.fields['Enable']
      const hasEnableCol =
        Object.prototype.hasOwnProperty.call(r.fields || {}, '启用') ||
        Object.prototype.hasOwnProperty.call(r.fields || {}, 'enable') ||
        Object.prototype.hasOwnProperty.call(r.fields || {}, 'Enable')
      const enabled =
        enabledRaw === true ||
        enabledRaw === 1 ||
        enabledRaw === 'true' ||
        enabledRaw === 'Yes' ||
        enabledRaw === '是' ||
        String(extractTextField(enabledRaw as any)).toLowerCase() === 'true'
      if (!key) continue
      if (hasEnableCol && !enabled) continue
      map[key] = value
    }
    return map
  } catch (e) {
    console.error('[feishu] loadConfigMap failed', e)
    return {}
  }
}

export type { WikiNode }
