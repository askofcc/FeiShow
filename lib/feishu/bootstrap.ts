import siteConfig from '@/lib/feishu/config'
import { feishuFetch } from './client'
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
 * 1) discover bitables under FEISHU_SITE_ROOT
 * 2) env table tokens only if SITE_ROOT is empty
 */
export async function resolveFeishuTables(): Promise<ResolvedTables> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = (async () => {
    const siteRoot =
      envOrEmpty('FEISHU_SITE_ROOT') ||
      envOrEmpty('FEISHU_LIST_ROOT') ||
      String((siteConfig as any)?.feishu?.siteRoot || '')

    // Product input is SITE_ROOT + app credentials. Table tokens are leftover
    // overrides only when no root is configured.
    const envContentApp = siteRoot
      ? ''
      : envOrEmpty('FEISHU_CONTENT_APP_TOKEN') || envOrEmpty('FEISHU_BITABLE_APP_TOKEN')
    const envContentTable = siteRoot
      ? ''
      : envOrEmpty('FEISHU_CONTENT_TABLE_ID') || envOrEmpty('FEISHU_BITABLE_TABLE_ID')
    const envConfigApp = siteRoot ? '' : envOrEmpty('FEISHU_CONFIG_APP_TOKEN')
    const envConfigTable = siteRoot ? '' : envOrEmpty('FEISHU_CONFIG_TABLE_ID')

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
            const children = await listWikiChildren(root.space_id, root.node_token, {
              pageSize: 50,
              maxPages: 5
            })
            const bitables = children.filter(c => isBitableObjType(c.obj_type) && c.obj_token)
            const found: FeishuTableRef[] = []

            for (const node of bitables) {
              const appToken = String(node.obj_token)
              try {
                const tables = await listTables(appToken)
                for (const t of tables) {
                  if (!t.table_id) continue
                  let kind: FeishuTableRef['kind'] = 'unknown'
                  try {
                    const fields = await listFields(appToken, t.table_id)
                    kind = classifyByFields(
                      fields.map(f => String(f.field_name || '')),
                      t.name || node.title || ''
                    )
                  } catch {
                    kind = classifyByFields([], t.name || node.title || '')
                  }
                  found.push({
                    appToken,
                    tableId: t.table_id,
                    tableName: t.name || node.title,
                    kind
                  })
                }
              } catch (e) {
                console.warn('[feishu] list tables failed for wiki bitable', appToken, e)
              }
            }

            const content =
              found.find(f => f.kind === 'content') ||
              found.find(f => (f.tableName || '').includes('内容') || (f.tableName || '').includes('博客'))
            const config =
              found.find(f => f.kind === 'config') ||
              found.find(f => (f.tableName || '').toUpperCase().includes('CONFIG'))

            if (!contentAppToken && content) contentAppToken = content.appToken
            if (!contentTableId && content) contentTableId = content.tableId
            if (!configAppToken && config) configAppToken = config.appToken
            if (!configTableId && config) configTableId = config.tableId

            if (content || config) {
              source =
                envContentApp || envContentTable || envConfigApp || envConfigTable
                  ? 'mixed'
                  : 'site-root'
              console.log('[feishu] tables resolved from site root', {
                source,
                content: content ? `${content.appToken}/${content.tableId}` : null,
                config: config ? `${config.appToken}/${config.tableId}` : null
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
    cache = resolved
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
