/**
 * Normalize CONFIG-TABLE 「启用」and print effective config after load rules.
 *
 * Feishu often omits unchecked checkboxes → old code treated them as enabled.
 * This script:
 * 1) Sets 启用=false on rows that currently have no 启用 field (unless in KEEP_ENABLED)
 * 2) Optionally force-off noisy demo keys
 * 3) Prints what loadConfigMap semantics would apply
 *
 * Usage: node scripts/fix-config-enable.mjs [--write]
 */
import fs from 'fs'

const WRITE = process.argv.includes('--write')
const env = Object.fromEntries(
  fs
    .readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    })
)

const domain = env.FEISHU_DOMAIN || 'https://open.feishu.cn'
const app = env.FEISHU_CONFIG_APP_TOKEN
const table = env.FEISHU_CONFIG_TABLE_ID

/** Keys that should stay enabled if they already are / for basic site identity */
const KEEP_ENABLED_IF_TRUE = new Set([
  'TITLE',
  'DESCRIPTION',
  'AUTHOR',
  'BIO',
  'KEYWORDS',
  'LINK',
  'SINCE',
  'LANG'
])

/** Noisy demo keys: force 启用=false unless you really need them */
const FORCE_DISABLE = new Set([
  'THEME', // use env NEXT_PUBLIC_THEME instead unless intentionally enabled
  'INLINE_CONFIG',
  'GLOBAL_JS',
  'GLOBAL_CSS',
  'FONT_URL',
  'FONT_STYLE',
  'POST_URL_PREFIX',
  'POST_URL_PREFIX_MAPPING_CATEGORY',
  'PREVIEW_TAG_COUNT',
  'STARTER_HERO_BUTTON_1_URL',
  'CONTACT_WHATSAPP',
  'CONTACT_TELEGRAM',
  'CONTACT_EMAIL',
  'GREETING_WORDS',
  'SIMPLE_LOGO_DESCRIPTION',
  'BLOG_FAVICON'
])

function textField(v) {
  if (v == null) return ''
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (Array.isArray(v)) {
    return v
      .map(x => (typeof x === 'string' ? x : x?.text || x?.name || ''))
      .join('')
  }
  if (typeof v === 'object') return v.text || v.name || ''
  return ''
}

function isEnabled(raw) {
  if (raw === true || raw === 1) return true
  if (typeof raw === 'string') {
    const s = raw.trim().toLowerCase()
    return s === 'true' || s === 'yes' || s === '是' || s === '1'
  }
  return false
}

const tokenRes = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ app_id: env.FEISHU_APP_ID, app_secret: env.FEISHU_APP_SECRET })
})
const tokenJson = await tokenRes.json()
if (tokenJson.code !== 0) {
  console.error('auth failed', tokenJson)
  process.exit(1)
}
const token = tokenJson.tenant_access_token

const listRes = await fetch(
  `${domain}/open-apis/bitable/v1/apps/${app}/tables/${table}/records/search`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ page_size: 100, automatic_fields: true })
  }
)
const listJson = await listRes.json()
const items = listJson.data?.items || []
console.log('records', items.length, 'write', WRITE)

const effective = {}
const actions = []

for (const it of items) {
  const f = it.fields || {}
  const key = textField(f['配置名']).trim()
  if (!key) continue
  const val = textField(f['配置值'])
  const hasEn = Object.prototype.hasOwnProperty.call(f, '启用')
  const en = f['启用']
  const enabledNow = isEnabled(en)

  let wantEnable = enabledNow
  // Missing enable field → treat as off and materialize false in table
  if (!hasEn) wantEnable = false
  if (FORCE_DISABLE.has(key)) wantEnable = false
  // keep basic identity if currently on
  if (KEEP_ENABLED_IF_TRUE.has(key) && enabledNow) wantEnable = true

  // Effective map simulation (new rules)
  if (wantEnable) {
    let parsed = val
    if (val === 'true' || val === 'false') parsed = val === 'true'
    effective[key] = parsed
  } else if (hasEn && en === false && (val === 'true' || val === 'false')) {
    effective[key] = false
  }

  if (wantEnable !== enabledNow || !hasEn) {
    actions.push({ record_id: it.record_id, key, from: hasEn ? en : '(missing)', to: wantEnable, val: val.slice(0, 40) })
    if (WRITE) {
      const body = {
        fields: {
          启用: wantEnable
        }
      }
      const ur = await fetch(
        `${domain}/open-apis/bitable/v1/apps/${app}/tables/${table}/records/${it.record_id}`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        }
      )
      const uj = await ur.json()
      if (uj.code !== 0) console.error('update fail', key, uj)
      else console.log('updated', key, '启用=', wantEnable)
    }
  }
}

console.log('\n--- planned enable fixes ---')
for (const a of actions) console.log(JSON.stringify(a))
console.log('\n--- effective config after rules ---')
console.log(JSON.stringify(effective, null, 2))
if (!WRITE) console.log('\n(dry-run) re-run with --write to patch 启用 on Feishu table')
