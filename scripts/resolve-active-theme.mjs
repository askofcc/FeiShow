#!/usr/bin/env node

/**
 * Resolve the CONFIG-TABLE theme before Webpack compiles the app.
 *
 * Theme selection is a build-time boundary: one deployment bundles one theme.
 * Runtime CONFIG changes require a rebuild/redeploy, which keeps the client
 * bundle small and prevents URL-driven access to every theme in the repository.
 */

import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(projectRoot, 'themes', 'active-theme.js')
const themeRoot = path.join(projectRoot, 'themes')

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return
  for (const rawLine of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = value
  }
}

loadEnvFile(process.env.FEISHU_ENV_FILE || '/run/secrets/feishu_env')
loadEnvFile(path.join(projectRoot, '.env.local'))
loadEnvFile(path.join(projectRoot, '.env.docker.local'))

function availableThemes() {
  return fs
    .readdirSync(themeRoot, { withFileTypes: true })
    .filter(item => item.isDirectory())
    .map(item => item.name)
    .sort()
}

function validTheme(name) {
  const value = String(name || '').trim()
  const safeName = /^[\w-]+$/.test(value) ? value : ''
  return safeName && fs.existsSync(path.join(themeRoot, safeName, 'index.js')) ? safeName : ''
}

/**
 * THEME_SWITCH 是配置中心的开发模式开关：
 * - 开启时一次构建打包全部主题，供本地/演示站实时切换；
 * - 关闭（默认）时只打包 CONFIG 选定的主题，线上保持最小产物。
 * 环境变量 FEISHU_THEME_SWITCH / NEXT_PUBLIC_THEME_SWITCH 优先于配置中心。
 */
function themeSwitchEnabledFromEnv() {
  const raw = process.env.FEISHU_THEME_SWITCH ?? process.env.NEXT_PUBLIC_THEME_SWITCH
  if (raw === undefined || raw === null || String(raw).trim() === '') return null
  const text = String(raw).trim().toLowerCase()
  if (['true', '1', 'yes', 'on', 'all'].includes(text)) return true
  if (['false', '0', 'no', 'off'].includes(text)) return false
  return null
}

function fallbackTheme() {
  return (
    validTheme(process.env.FEISHU_ACTIVE_THEME) ||
    validTheme(process.env.NEXT_PUBLIC_THEME) ||
    validTheme('example') ||
    availableThemes()[0] ||
    'example'
  )
}

function readThemeSwitchManifest() {
  const manifestPath = path.join(projectRoot, 'conf', 'themeSwitch.manifest.data.js')
  const source = fs.readFileSync(manifestPath, 'utf8')
  const startMarker = 'export const THEME_SWITCH_MANIFEST = '
  const startIndex = source.indexOf(startMarker)
  const openBrace = source.indexOf('{', startIndex)
  if (startIndex < 0 || openBrace < 0) {
    throw new Error('Cannot locate THEME_SWITCH_MANIFEST literal')
  }

  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (char === '\n') lineComment = false
      continue
    }
    if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
      continue
    }
    if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
      continue
    }
    if (char === '/' && next === '/') {
      lineComment = true
      index += 1
      continue
    }
    if (char === '/' && next === '*') {
      blockComment = true
      index += 1
      continue
    }
    if (char === '{') depth += 1
    if (char === '}' && --depth === 0) {
      const expression = source.slice(openBrace, index + 1)
      return new vm.Script(`(${expression})`).runInThisContext()
    }
  }
  throw new Error('Unterminated THEME_SWITCH_MANIFEST literal')
}

function evaluateObjectAssignment(source, name) {
  const match = source.match(new RegExp(`(?:const|let|var)\\s+${name}\\s*=\\s*`))
  if (!match) return {}
  const openBrace = source.indexOf('{', match.index + match[0].length)
  if (openBrace < 0) throw new Error(`Cannot locate ${name} object`)

  let depth = 0
  let quote = ''
  let escaped = false
  let lineComment = false
  let blockComment = false
  for (let index = openBrace; index < source.length; index += 1) {
    const char = source[index]
    const next = source[index + 1]
    if (lineComment) {
      if (char === '\n') lineComment = false
    } else if (blockComment) {
      if (char === '*' && next === '/') {
        blockComment = false
        index += 1
      }
    } else if (quote) {
      if (escaped) escaped = false
      else if (char === '\\') escaped = true
      else if (char === quote) quote = ''
    } else if (char === '"' || char === "'" || char === '`') {
      quote = char
    } else if (char === '/' && next === '/') {
      lineComment = true
      index += 1
    } else if (char === '/' && next === '*') {
      blockComment = true
      index += 1
    } else if (char === '{') {
      depth += 1
    } else if (char === '}' && --depth === 0) {
      return new vm.Script(`(${source.slice(openBrace, index + 1)})`).runInThisContext()
    }
  }
  throw new Error(`Unterminated ${name} object`)
}

function readThemeConfigDefaults(theme) {
  const configPath = path.join(themeRoot, theme, 'config.js')
  if (!fs.existsSync(configPath)) return {}
  const configSource = fs.readFileSync(configPath, 'utf8')
  const match = configSource.match(/(?:const|let|var)\s+CONFIG\s*=\s*([\s\S]*?)\n\s*export\s+default\s+CONFIG/)
  if (!match) return {}
  return new vm.Script(`(${match[1]})`).runInThisContext()
}

function writeActiveTheme(theme, source, { themeSwitchEnabled = false } = {}) {
  const safeTheme = String(theme).replace(/[^\w.-]/g, '')
  const switchManifest = readThemeSwitchManifest()
  const switchRow = switchManifest[safeTheme] || {}
  const configDefaults = readThemeConfigDefaults(safeTheme)
  const paletteSource = fs.readFileSync(path.join(projectRoot, 'conf', 'themeColorPalette.js'), 'utf8')
  const colorOverrides = evaluateObjectAssignment(paletteSource, 'THEME_COLOR_DEFAULTS')[safeTheme] || {}
  const switchableThemes = themeSwitchEnabled
    ? availableThemes().filter(validTheme)
    : [safeTheme]
  const uniqueSwitchableThemes = [...new Set([safeTheme, ...switchableThemes])]
  const loaderEntries = uniqueSwitchableThemes
    .map(item => `  '${item}': () => import('@/themes/${item}')`)
    .join(',\n')
  const content = `/* Generated by scripts/resolve-active-theme.mjs; do not edit. */

export const ACTIVE_THEME = '${safeTheme}'
export const ACTIVE_THEME_SOURCE = '${String(source).replace(/[^\w:-]/g, '')}'
export const THEME_SWITCH_ENABLED = ${themeSwitchEnabled ? 'true' : 'false'}
export const SWITCHABLE_THEMES = ${JSON.stringify(uniqueSwitchableThemes)}

export { default as ACTIVE_THEME_CONFIG } from '@/themes/${safeTheme}/config'

export const THEME_SWITCH_MANIFEST = ${JSON.stringify(themeSwitchEnabled ? switchManifest : { [safeTheme]: switchRow }, null, 2)}
export const ACTIVE_THEME_SWITCH_ROW = ${JSON.stringify(switchRow, null, 2)}
export const ACTIVE_THEME_CONFIG_DEFAULTS = ${JSON.stringify(configDefaults, null, 2)}
export const ACTIVE_THEME_COLOR_OVERRIDES = ${JSON.stringify(colorOverrides, null, 2)}

const THEME_MODULE_LOADERS = {
${loaderEntries}
}

export async function loadActiveThemeModule(themeId) {
  const requested = String(themeId || '').trim()
  const target = THEME_MODULE_LOADERS[requested] ? requested : ACTIVE_THEME
  return THEME_MODULE_LOADERS[target]()
}
`
  fs.writeFileSync(outputPath, content)
  console.log(
    `[theme] active="${safeTheme}" source=${source}` +
      (themeSwitchEnabled ? ` switch=on themes=${uniqueSwitchableThemes.length}` : ' switch=off')
  )
}

function textValue(value) {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) {
    return value.map(textValue).filter(Boolean).join('')
  }
  if (typeof value === 'object') {
    return String(value.text || value.name || value.link || value.url || '')
  }
  return ''
}

function isEnabled(value) {
  if (value === true || value === 1) return true
  const valueText = Array.isArray(value) ? textValue(value) : String(value ?? '').trim().toLowerCase()
  return ['true', '1', 'yes', '是'].includes(valueText)
}

function parseBitableRefFromValue(value) {
  const candidates = Array.isArray(value) ? value : [value]
  for (const item of candidates) {
    const link =
      typeof item === 'object' && item !== null
        ? String(item.link || item.url || '')
        : String(item || '')
    const token =
      typeof item === 'object' && item !== null ? String(item.token || '') : ''
    const raw = link || token || (typeof item === 'string' ? item : '')
    if (!raw) continue
    const embedded = raw.match(/^([A-Za-z0-9]+)_(tbl[A-Za-z0-9]+)$/)
    if (embedded) return { appToken: embedded[1], tableId: embedded[2] }
    const tableFromQuery = raw.match(/[?&]table=(tbl[A-Za-z0-9]+)/)
    const appFromPath = raw.match(/\/(?:base|bitable)\/([A-Za-z0-9]+)/)
    if (appFromPath?.[1]) {
      return { appToken: appFromPath[1], tableId: tableFromQuery?.[1] || '' }
    }
    if (token && /^[A-Za-z0-9_-]{10,}$/.test(token) && /bitable/i.test(String(item?.mentionType || item?.realMentionType || ''))) {
      return { appToken: token, tableId: tableFromQuery?.[1] || '' }
    }
  }
  return null
}

function docTokenFromField(value) {
  if (!value) return ''
  const bitable = parseBitableRefFromValue(value)
  if (bitable?.appToken && bitable?.tableId) return `${bitable.appToken}_${bitable.tableId}`
  if (bitable?.appToken) return bitable.appToken
  const candidates = Array.isArray(value) ? value : [value]
  for (const item of candidates) {
    const raw =
      typeof item === 'object' && item !== null
        ? String(item.link || item.url || item.token || item.text || '')
        : String(item || '')
    if (!raw) continue
    const match = raw.match(/\/(?:wiki|docx|docs|doc)\/([A-Za-z0-9_-]+)/)
    if (match?.[1]) return match[1]
    const embedded = raw.match(/^([A-Za-z0-9]+)_(tbl[A-Za-z0-9]+)$/)
    if (embedded) return `${embedded[1]}_${embedded[2]}`
    if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) return raw
  }
  return ''
}

async function createClient() {
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET
  const domain = (process.env.FEISHU_DOMAIN || 'https://open.feishu.cn').replace(/\/$/, '')
  if (!appId || !appSecret) throw new Error('FEISHU_APP_ID / FEISHU_APP_SECRET are not configured')

  const response = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  })
  const payload = await response.json()
  if (payload.code !== 0 || !payload.tenant_access_token) {
    throw new Error(`Feishu auth failed: ${payload.code} ${payload.msg}`)
  }

  async function api(pathname, options = {}) {
    const headers = new Headers(options.headers)
    headers.set('Authorization', `Bearer ${payload.tenant_access_token}`)
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json; charset=utf-8')
    }
    const result = await fetch(`${domain}${pathname}`, { ...options, headers })
    const json = await result.json()
    if (json.code !== 0) throw new Error(`Feishu API error ${json.code}: ${json.msg} (${pathname})`)
    return json.data || {}
  }

  return api
}

function isBitableType(type) {
  const value = String(type ?? '').toLowerCase()
  return ['bitable', '8'].includes(value) || value.includes('bitable')
}

function parseEmbeddedBitable(token) {
  const match = String(token || '').match(/^([A-Za-z0-9]+)_(tbl[A-Za-z0-9]+)$/)
  return match ? { appToken: match[1], tableId: match[2] } : null
}

function classifyTable(fields, tableName = '') {
  const names = new Set(fields.map(item => String(item.field_name || '').trim()))
  const has = (...keys) => keys.some(key => names.has(key))
  const lowerName = tableName.toLowerCase()
  if (has('配置名', '配置值') || has('key', 'value') || lowerName.includes('config')) return 'config'
  if (
    has('文档') ||
    (has('标题') && (has('类型') || has('Slug'))) ||
    lowerName.includes('内容') ||
    lowerName.includes('content')
  ) {
    return 'content'
  }
  return 'unknown'
}

async function inspectAppTables(api, appToken, titleHint = '') {
  const { items: tables = [] } = await api(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables?page_size=50`
  )
  const result = []
  for (const table of tables) {
    if (!table.table_id) continue
    let fields = []
    try {
      const page = await api(
        `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(table.table_id)}/fields?page_size=100`
      )
      fields = page.items || []
    } catch {
      // A table can still be selected by its name below.
    }
    result.push({
      appToken,
      tableId: table.table_id,
      tableName: table.name || titleHint,
      kind: classifyTable(fields, table.name || titleHint)
    })
  }
  return result
}

async function listAllBlocks(api, documentId) {
  const blocks = []
  let pageToken
  for (let page = 0; page < 10; page += 1) {
    const query = new URLSearchParams({ page_size: '500', document_revision_id: '-1' })
    if (pageToken) query.set('page_token', pageToken)
    const data = await api(`/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks?${query}`)
    blocks.push(...(data.items || []))
    if (!data.has_more || !data.page_token) break
    pageToken = data.page_token
  }
  return blocks
}

async function findContentTables(api) {
  const siteRoot = process.env.FEISHU_SITE_ROOT || process.env.FEISHU_LIST_ROOT || ''
  const wikiToken = siteRoot.match(/\/wiki\/([A-Za-z0-9_-]+)/)?.[1]
  if (!siteRoot || !wikiToken) throw new Error('FEISHU_SITE_ROOT must point to a Feishu wiki page')

  const { node } = await api(`/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`)
  if (!node?.space_id || !node.obj_token) throw new Error('Cannot resolve FEISHU_SITE_ROOT wiki node')

  const found = []
  const seenApps = new Set()
  if (isBitableType(node.obj_type)) {
    found.push(...(await inspectAppTables(api, node.obj_token, node.title)))
    seenApps.add(node.obj_token)
  } else {
    const blocks = await listAllBlocks(api, node.obj_token)
    for (const block of blocks) {
      const parsed = parseEmbeddedBitable(block.bitable?.token)
      if (!parsed || seenApps.has(parsed.appToken)) continue
      seenApps.add(parsed.appToken)
      try {
        if (parsed.tableId) {
          const tables = await inspectAppTables(api, parsed.appToken)
          found.push(tables.find(table => table.tableId === parsed.tableId) || tables[0])
        } else {
          found.push(...(await inspectAppTables(api, parsed.appToken)))
        }
      } catch (error) {
        console.warn('[theme] skipped embedded bitable:', error.message)
      }
    }
  }

  const query = new URLSearchParams({ page_size: '50' })
  let pageToken
  for (let page = 0; page < 5; page += 1) {
    if (pageToken) query.set('page_token', pageToken)
    const data = await api(
      `/open-apis/wiki/v2/spaces/${encodeURIComponent(node.space_id)}/nodes?parent_node_token=${encodeURIComponent(node.node_token)}&${query}`
    )
    for (const child of data.items || []) {
      if (isBitableType(child.obj_type) && child.obj_token && !seenApps.has(child.obj_token)) {
        seenApps.add(child.obj_token)
        try {
          found.push(...(await inspectAppTables(api, child.obj_token, child.title)))
        } catch (error) {
          console.warn('[theme] skipped child bitable:', error.message)
        }
      }
    }
    if (!data.has_more || !data.page_token) break
    pageToken = data.page_token
  }

  const content =
    found.find(table => table?.kind === 'content') ||
    found.find(table => (table?.tableName || '').includes('内容')) ||
    found.find(table => (table?.tableName || '').toLowerCase().includes('blog'))
  if (!content) throw new Error('No content table found under the site root')
  return content
}

async function findConfigTable(api, content) {
  const explicitApp = process.env.FEISHU_CONFIG_APP_TOKEN
  const explicitTable = process.env.FEISHU_CONFIG_TABLE_ID || process.env.FEISHU_CONFIG_TABLE
  if (explicitApp && explicitTable) {
    return { appToken: explicitApp, tableId: explicitTable, tableName: 'CONFIG', kind: 'config' }
  }

  let pageToken
  for (let page = 0; page < 5; page += 1) {
    const data = await api(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(content.appToken)}/tables/${encodeURIComponent(content.tableId)}/records/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          automatic_fields: true,
          ...(pageToken ? { page_token: pageToken } : {})
        })
      }
    )
    for (const record of data.items || []) {
      const type = textValue(record.fields?.['类型'] ?? record.fields?.type).trim().toLowerCase()
      if (type !== '配置' && type !== 'config') continue
      const docField = record.fields?.['文档'] ?? record.fields?.document
      const parsedRef = parseBitableRefFromValue(docField)
      const rawDoc = docTokenFromField(docField)
      if (!parsedRef && !rawDoc) continue

      let appToken = parsedRef?.appToken || ''
      let tableId = parsedRef?.tableId || ''
      const embedded = parseEmbeddedBitable(rawDoc)
      if (!appToken && embedded) {
        appToken = embedded.appToken
        tableId = embedded.tableId
      }

      try {
        if (!appToken) {
          const { node } = await api(`/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(rawDoc)}`)
          if (node?.obj_token && isBitableType(node.obj_type)) appToken = node.obj_token
        }
        if (appToken && !tableId) {
          const tables = await inspectAppTables(api, appToken, '配置中心')
          const selected =
            tables.find(table => table.kind === 'config') ||
            tables.find(table => (table.tableName || '').includes('配置') || /config/i.test(table.tableName || '')) ||
            tables[0]
          if (selected) {
            appToken = selected.appToken
            tableId = selected.tableId
          }
        }
        if (appToken && tableId) {
          return { appToken, tableId, tableName: 'CONFIG', kind: 'config' }
        }
      } catch (error) {
        console.warn('[theme] skipped CONFIG row:', error.message)
      }
    }
    if (!data.has_more || !data.page_token) break
    pageToken = data.page_token
  }
  const error = new Error('No CONFIG row/table found in the content table')
  error.code = 'CONFIG_TABLE_NOT_FOUND'
  throw error
}

async function readConfigTheme(api, configTable) {
  let pageToken
  for (let page = 0; page < 5; page += 1) {
    const data = await api(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(configTable.appToken)}/tables/${encodeURIComponent(configTable.tableId)}/records/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          automatic_fields: true,
          ...(pageToken ? { page_token: pageToken } : {})
        })
      }
    )
    for (const record of data.items || []) {
      const key = textValue(record.fields?.['配置名'] ?? record.fields?.key).trim().toUpperCase()
      if (key !== 'THEME') continue
      if (!isEnabled(record.fields?.['启用'] ?? record.fields?.enable)) continue
      const value = validTheme(textValue(record.fields?.['配置值'] ?? record.fields?.value))
      if (value) return value
    }
    if (!data.has_more || !data.page_token) break
    pageToken = data.page_token
  }
  const error = new Error('THEME row is missing, disabled, or invalid')
  error.code = 'THEME_ROW_MISSING'
  throw error
}

async function readConfigSwitchEnabled(api, configTable) {
  let pageToken
  for (let page = 0; page < 5; page += 1) {
    const data = await api(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(configTable.appToken)}/tables/${encodeURIComponent(configTable.tableId)}/records/search`,
      {
        method: 'POST',
        body: JSON.stringify({
          page_size: 100,
          automatic_fields: true,
          ...(pageToken ? { page_token: pageToken } : {})
        })
      }
    )
    for (const record of data.items || []) {
      const key = textValue(record.fields?.['配置名'] ?? record.fields?.key).trim().toUpperCase()
      if (key !== 'THEME_SWITCH') continue
      const rowEnabled = isEnabled(record.fields?.['启用'] ?? record.fields?.enable)
      if (!rowEnabled) return false
      return isEnabled(record.fields?.['配置值'] ?? record.fields?.value)
    }
    if (!data.has_more || !data.page_token) break
    pageToken = data.page_token
  }
  return false
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function hasPinnedTheme() {
  return Boolean(
    validTheme(process.env.FEISHU_ACTIVE_THEME) ||
      validTheme(process.env.NEXT_PUBLIC_THEME)
  )
}

async function main() {
  const hasCredentials = Boolean(process.env.FEISHU_APP_ID && process.env.FEISHU_APP_SECRET)
  const switchEnabledFromEnv = themeSwitchEnabledFromEnv()

  // Docker/CI can pin the theme via env. Skip CONFIG-TABLE discovery unless
  // THEME_SWITCH is on (that path still needs the remote switch list).
  if (hasPinnedTheme() && switchEnabledFromEnv !== true) {
    writeActiveTheme(fallbackTheme(), 'env', {
      themeSwitchEnabled: false
    })
    return
  }

  // Demo builds may fall back. A configured deployment must not silently ship the wrong theme.
  if (!hasCredentials) {
    writeActiveTheme(fallbackTheme(), 'fallback', {
      themeSwitchEnabled: switchEnabledFromEnv === true
    })
    return
  }

  let lastError
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const api = await createClient()
      const contentTable =
        process.env.FEISHU_CONTENT_APP_TOKEN && process.env.FEISHU_CONTENT_TABLE_ID
          ? {
              appToken: process.env.FEISHU_CONTENT_APP_TOKEN,
              tableId: process.env.FEISHU_CONTENT_TABLE_ID,
              tableName: 'CONTENT',
              kind: 'content'
            }
          : await findContentTables(api)
      try {
        const configTable = await findConfigTable(api, contentTable)
        const theme = validTheme(await readConfigTheme(api, configTable))
        if (!theme) throw new Error('CONFIG THEME does not match an available theme folder')
        const switchEnabled =
          switchEnabledFromEnv !== null
            ? switchEnabledFromEnv
            : await readConfigSwitchEnabled(api, configTable)
        writeActiveTheme(theme, 'config-table', { themeSwitchEnabled: switchEnabled })
      } catch (error) {
        if (error.code === 'CONFIG_TABLE_NOT_FOUND' || error.code === 'THEME_ROW_MISSING') {
          console.warn(`[theme] using fallback theme: ${error.message}`)
          writeActiveTheme(fallbackTheme(), 'fallback', {
            themeSwitchEnabled: switchEnabledFromEnv === true
          })
          return
        }
        throw error
      }
      return
    } catch (error) {
      lastError = error
      if (attempt < 3) {
        console.warn(`[theme] CONFIG-TABLE attempt ${attempt}/3 failed: ${error.message}`)
        await sleep(attempt * 2000)
      }
    }
  }

  console.error(`[theme] CONFIG-TABLE discovery failed after 3 attempts: ${lastError.message}`)
  process.exitCode = 1
}

main()
