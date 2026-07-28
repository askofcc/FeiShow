/**
 * Live probe: token + content table + config table + one article blocks.
 * Usage: node --env-file=.env.local scripts/feishu-probe.mjs
 * or: CMS_PROVIDER=feishu node -r dotenv/config scripts/feishu-probe.mjs
 */
import { createRequire } from 'module'
import { pathToFileURL } from 'url'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')

// load .env.local manually
const envPath = path.join(root, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/)
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
  }
}

process.env.CMS_PROVIDER = process.env.CMS_PROVIDER || 'feishu'

async function main() {
  // Use dynamic import of TS via next/tsx? Simpler: call OpenAPI with fetch only
  const appId = process.env.FEISHU_APP_ID
  const appSecret = process.env.FEISHU_APP_SECRET
  const domain = process.env.FEISHU_DOMAIN || 'https://open.feishu.cn'
  if (!appId || !appSecret) {
    console.error('Missing FEISHU_APP_ID/SECRET')
    process.exit(1)
  }
  const tokenRes = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret })
  })
  const tokenJson = await tokenRes.json()
  if (tokenJson.code !== 0) {
    console.error('token failed', tokenJson)
    process.exit(1)
  }
  const token = tokenJson.tenant_access_token
  console.log('token ok, expire', tokenJson.expire)

  async function search(app, table) {
    const res = await fetch(
      `${domain}/open-apis/bitable/v1/apps/${app}/tables/${table}/records/search`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ page_size: 50, automatic_fields: true })
      }
    )
    return res.json()
  }

  const contentApp = process.env.FEISHU_CONTENT_APP_TOKEN || process.env.FEISHU_BITABLE_APP_TOKEN
  const contentTable = process.env.FEISHU_CONTENT_TABLE_ID || process.env.FEISHU_BITABLE_TABLE_ID
  const content = await search(contentApp, contentTable)
  console.log('content table code', content.code, 'count', content.data?.items?.length)

  const configApp = process.env.FEISHU_CONFIG_APP_TOKEN
  const configTable = process.env.FEISHU_CONFIG_TABLE_ID
  if (configApp && configTable) {
    const config = await search(configApp, configTable)
    console.log('config table code', config.code, 'count', config.data?.items?.length)
    const enabled = (config.data?.items || []).filter(r => r.fields?.['启用'])
    console.log('config enabled', enabled.length)
  }

  // try first doc token from content
  const items = content.data?.items || []
  let docToken = null
  for (const it of items) {
    const doc = it.fields?.['文档']
    if (Array.isArray(doc) && doc[0]) {
      docToken = doc[0].token || doc[0].link || null
      if (typeof docToken === 'string' && docToken.includes('/')) {
        const m = docToken.match(/\/(wiki|docx)\/([A-Za-z0-9]+)/)
        docToken = m?.[2] || docToken
      }
      if (docToken) break
    } else if (typeof doc === 'string' && doc) {
      const m = doc.match(/\/(wiki|docx)\/([A-Za-z0-9]+)/)
      docToken = m?.[2] || doc
      break
    }
  }
  console.log('sample doc token', docToken)
  if (docToken) {
    const nodeRes = await fetch(
      `${domain}/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(docToken)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const nodeJson = await nodeRes.json()
    console.log('get_node', nodeJson.code, nodeJson.data?.node?.title, nodeJson.data?.node?.obj_token)
    const obj = nodeJson.data?.node?.obj_token
    if (obj) {
      const blocksRes = await fetch(
        `${domain}/open-apis/docx/v1/documents/${obj}/blocks?page_size=50`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const blocksJson = await blocksRes.json()
      console.log('blocks', blocksJson.code, 'count', blocksJson.data?.items?.length)
    }
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
