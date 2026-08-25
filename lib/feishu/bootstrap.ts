import siteConfig from '@/lib/feishu/config'
import { extractDocToken, extractTextField, listBitableRecordsFrom } from './bitable'
import { feishuFetch } from './client'
import { listDocumentBlocks } from './docx'
import { listWikiChildren, parseWikiToken, resolveWikiNode } from './wiki'

export type FeishuTableRef = {
  appToken: string
  tableId: string
  tableName?: string
  kind: 'content' | 'config' | 'unknown'
}

type BitableTable = {
  table_id?: string
  name?: string
}

type BitableField = {
  field_id?: string
  field_name?: string
  type?: number | string
}

type ResolvedTables = {
  contentAppToken: string
  contentTableId: string
  configAppToken: string
  configTableId: string
  source: 'env' | 'site-root' | 'mixed' | 'empty'
}

let cache: ResolvedTables | null = null
let inflight: Promise<ResolvedTables> | null = null

function envOrEmpty(name: string): string {
  const v = process.env[name]
  return v == null || v === '' ? '' : String(v).trim()
}

function isBitableObjType(objType: unknown): boolean {
  const s = String(objType ?? '').toLowerCase()
  return s === 'bitable' || s === '8' || s.includes('bitable')
}

async function listTables(appToken: string): Promise<BitableTable[]> {
  const data = await feishuFetch<{ items?: BitableTable[] }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=50`
  )
  return data.items || []
}

async function listFields(appToken: string, tableId: string): Promise<BitableField[]> {
  const data = await feishuFetch<{ items?: BitableField[] }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?page_size=50`
  )
  return data.items || []
}

function parseEmbeddedBitableToken(raw: string): { appToken: string; tableId?: string } | null {
  const token = String(raw || '').trim()
  if (!token) return null
  const m = token.match(/^(.+?)_(tbl[A-Za-z0-9]+)$/)
  if (m?.[1] && m[2]) return { appToken: m[1], tableId: m[2] }
  if (/^[A-Za-z0-9_-]{10,}$/.test(token)) return { appToken: token }
  return null
}

async function inspectAppTables(appToken: string, titleHint = ''): Promise<FeishuTableRef[]> {
  const out: FeishuTableRef[] = []
  const tables = await listTables(appToken)
  for (const t of tables) {
    if (!t.table_id) continue
    let kind: FeishuTableRef['kind'] = 'unknown'
    try {
      const fields = await listFields(appToken, t.table_id)
      kind = classifyByFields(
        fields.map(f => String(f.field_name || '')),
        t.name || titleHint
      )
    } catch {
      kind = classifyByFields([], t.name || titleHint)
    }
    out.push({
      appToken,
      tableId: t.table_id,
      tableName: t.name || titleHint,
      kind
    })
  }
  return out
}

async function collectEmbeddedTables(documentId: string): Promise<FeishuTableRef[]> {
  const blocks = await listDocumentBlocks(documentId)
  const seen = new Set<string>()
  const out: FeishuTableRef[] = []
  for (const block of blocks) {
    const raw = (block as { bitable?: { token?: string } }).bitable?.token
    const parsed = parseEmbeddedBitableToken(String(raw || ''))
    if (!parsed) continue
    const key = `${parsed.appToken}/${parsed.tableId || ''}`
    if (seen.has(key)) continue
    seen.add(key)
    try {
      if (parsed.tableId) {
        let kind: FeishuTableRef['kind'] = 'unknown'
        try {
          const fields = await listFields(parsed.appToken, parsed.tableId)
          kind = classifyByFields(fields.map(f => String(f.field_name || '')))
        } catch {
          kind = 'unknown'
        }
        out.push({
          appToken: parsed.appToken,
          tableId: parsed.tableId,
          tableName: parsed.tableId,
          kind
        })
      } else {
        out.push(...(await inspectAppTables(parsed.appToken)))
      }
    } catch (e) {
      console.warn('[feishu] inspect embedded bitable failed', parsed.appToken, e)
    }
  }
  return out
}

async function resolveConfigFromContentTable(
  appToken: string,
  tableId: string
): Promise<FeishuTableRef | null> {
  const records = await listBitableRecordsFrom(appToken, tableId, { pageSize: 100, maxPages: 5 })
  for (const record of records) {
    const typeRaw = extractTextField(
      (record.fields || {})['类型'] ?? (record.fields || {})['type']
    ).trim()
    const type = typeRaw.toLowerCase()
    if (typeRaw !== '配置' && type !== 'config') continue
    const docField = (record.fields || {})['文档'] ?? (record.fields || {})['document']
    const docToken = extractDocToken(docField)
    if (!docToken) continue

    let bitableAppToken = ''
    let bitableTableId: string | undefined

    if (Array.isArray(docField)) {
      for (const item of docField) {
        if (item && typeof item === 'object') {
          const link = String((item as any).link || (item as any).url || '')
          const mTable = link.match(/[?&]table=([a-zA-Z0-9]+)/)
          if (mTable?.[1]) bitableTableId = mTable[1]
          const mBase = link.match(/\/(base|bitable)\/([a-zA-Z0-9]+)/)
          if (mBase?.[2]) bitableAppToken = mBase[2]
        }
      }
    }

    if (!bitableAppToken) {
      const node = await resolveWikiNode(docToken).catch(() => null)
      if (node?.obj_token && isBitableObjType(node.obj_type)) {
        bitableAppToken = String(node.obj_token)
      } else if (/^[A-Za-z0-9_-]{10,}$/.test(docToken) && !node) {
        bitableAppToken = docToken
      }
    }

    if (bitableAppToken) {
      if (bitableTableId) {
        return {
          appToken: bitableAppToken,
          tableId: bitableTableId,
          tableName: '配置中心',
          kind: 'config'
        }
      }
      try {
        const tables = await inspectAppTables(bitableAppToken, '配置中心')
        return (
          tables.find(t => t.kind === 'config') ||
          tables.find(t => (t.tableName || '').includes('配置') || (t.tableName || '').toUpperCase().includes('CONFIG')) ||
          tables[0] ||
          null
        )
      } catch (e) {
        console.warn('[feishu] inspectAppTables for config failed', bitableAppToken, e)
      }
    }
  }
  return null
}

function classifyByFields(fieldNames: string[], tableName = ''): FeishuTableRef['kind'] {
  const names = fieldNames.map(n => n.trim())
  const set = new Set(names)
  const nameLower = tableName.toLowerCase()
  const has = (...xs: string[]) => xs.some(x => set.has(x))

  if (has('配置名', '配置值') || has('key', 'value') || nameLower.includes('config')) {
    return 'config'
  }
  if (
    has('文档') ||
    (has('标题') && (has('类型') || has('Slug') || has('slug'))) ||
    nameLower.includes('内容') ||
    nameLower.includes('blog') ||
    nameLower.includes('content')
  ) {
    return 'content'
  }
  return 'unknown'
}

/**
 * Resolve content/config bitable refs.
 * Priority:
 * 1) explicit environment table selectors (advanced / recovery override)
 * 2) content table: bitable embedded in FEISHU_SITE_ROOT, else wiki child
 * 3) CONFIG table: content row type=配置 → 文档 column
 */
export async function resolveFeishuTables(): Promise<ResolvedTables> {
  if (cache && process.env.ENABLE_CACHE !== 'false' && process.env.ENABLE_CACHE !== '0') return cache
  if (inflight) return inflight

  inflight = (async () => {
    const siteRoot =
      envOrEmpty('FEISHU_SITE_ROOT') ||
      envOrEmpty('FEISHU_LIST_ROOT') ||
      String((siteConfig as any)?.feishu?.siteRoot || '')

    // Root discovery is the normal product path. Explicit table tokens remain
    // a deliberate recovery override when a non-standard root cannot be
    // discovered automatically.
    const envContentApp =
      envOrEmpty('FEISHU_CONTENT_APP_TOKEN') || envOrEmpty('FEISHU_BITABLE_APP_TOKEN')
    const envContentTable =
      envOrEmpty('FEISHU_CONTENT_TABLE_ID') || envOrEmpty('FEISHU_BITABLE_TABLE_ID')
    const envConfigApp = envOrEmpty('FEISHU_CONFIG_APP_TOKEN')
    const envConfigTable = envOrEmpty('FEISHU_CONFIG_TABLE_ID')

    let contentAppToken = envContentApp
    let contentTableId = envContentTable
    let configAppToken = envConfigApp
    let configTableId = envConfigTable
    let source: ResolvedTables['source'] =
      contentAppToken && contentTableId && configAppToken && configTableId
        ? 'env'
        : contentAppToken || contentTableId || configAppToken || configTableId
          ? 'mixed'
          : 'empty'

    const needDiscover = Boolean(siteRoot) && (!contentAppToken || !contentTableId || !configAppToken || !configTableId)

    if (needDiscover && siteRoot) {
      try {
        const token = parseWikiToken(siteRoot)
        if (token) {
          const root = await resolveWikiNode(token)
          if (root?.space_id && root.node_token) {
            const found: FeishuTableRef[] = []

            // Cloneable content table lives in the root doc body, not the wiki sidebar.
            if (root.obj_token && !isBitableObjType(root.obj_type)) {
              try {
                found.push(...(await collectEmbeddedTables(String(root.obj_token))))
              } catch (e) {
                console.warn('[feishu] scan root embedded bitable failed', e)
              }
            }

            const children = await listWikiChildren(root.space_id, root.node_token, {
              pageSize: 50,
              maxPages: 5
            })
            for (const node of children.filter(c => isBitableObjType(c.obj_type) && c.obj_token)) {
              try {
                found.push(...(await inspectAppTables(String(node.obj_token), node.title || '')))
              } catch (e) {
                console.warn('[feishu] list tables failed for wiki bitable', node.obj_token, e)
              }
            }

            const content =
              found.find(f => f.kind === 'content') ||
              found.find(f => (f.tableName || '').includes('内容') || (f.tableName || '').includes('博客'))

            if (!contentAppToken && content) contentAppToken = content.appToken
            if (!contentTableId && content) contentTableId = content.tableId

            // CONFIG is pointed to by the content table, not "whatever config-like
            // bitable happens to sit next to the root page".
            if (contentAppToken && contentTableId && (!configAppToken || !configTableId)) {
              try {
                const config = await resolveConfigFromContentTable(contentAppToken, contentTableId)
                if (config) {
                  if (!configAppToken) configAppToken = config.appToken
                  if (!configTableId) configTableId = config.tableId
                }
              } catch (e) {
                console.warn('[feishu] resolve CONFIG from content table failed', e)
              }
            }

            if (contentAppToken || configAppToken) {
              source =
                envContentApp || envContentTable || envConfigApp || envConfigTable
                  ? 'mixed'
                  : 'site-root'
              console.log('[feishu] tables resolved from site root', {
                source,
                content: contentAppToken && contentTableId ? `${contentAppToken}/${contentTableId}` : null,
                config: configAppToken && configTableId ? `${configAppToken}/${configTableId}` : null
              })
            }
          }
        }
      } catch (e) {
        console.warn('[feishu] discover tables from SITE_ROOT failed', e)
      }
    }

    // Runtime-fill siteConfig so older call sites keep working in this process
    const feishu = (siteConfig as any).feishu
    if (feishu) {
      if (contentAppToken) {
        feishu.contentAppToken = contentAppToken
        feishu.bitableAppToken = contentAppToken
      }
      if (contentTableId) {
        feishu.contentTableId = contentTableId
        feishu.bitableTableId = contentTableId
      }
      if (configAppToken) feishu.configAppToken = configAppToken
      if (configTableId) feishu.configTableId = configTableId
      if (siteRoot) {
        feishu.siteRoot = siteRoot
        if (!feishu.listRoot) feishu.listRoot = siteRoot
      }
    }

    const resolved: ResolvedTables = {
      contentAppToken,
      contentTableId,
      configAppToken,
      configTableId,
      source
    }
    if (process.env.ENABLE_CACHE !== 'false' && process.env.ENABLE_CACHE !== '0') {
      cache = resolved
    }
    return resolved
  })()

  try {
    return await inflight
  } finally {
    inflight = null
  }
}

/** Clear process cache (tests / revalidate). */
export function clearFeishuTableCache() {
  cache = null
  inflight = null
}
