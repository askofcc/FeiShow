/**
 * Rewrite Feishu CONFIG-TABLE to mirror official NotionNext demo-style keys.
 * Usage: node scripts/sync_official_config_table.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
for (const line of fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g, '')
}

const domain = process.env.FEISHU_DOMAIN || 'https://open.feishu.cn'
const app = process.env.FEISHU_CONFIG_APP_TOKEN || 'JGShbeVp9aGGV3s2J4qcMmGAn0b'
const table = process.env.FEISHU_CONFIG_TABLE_ID || 'tbl4qPlVgMLg5eaH'

// 1:1 style keys from official NotionNext demo / blog.config defaults + Example theme console
const ROWS = [
  // —— 站点基础（官方配置中心常见）——
  ['TITLE', 'NotionNext', true, '站点标题'],
  ['DESCRIPTION', '一个使用 NotionNext 构建的站点', true, '站点描述'],
  ['AUTHOR', 'NotionNext', true, '作者名（站点级；文章作者优先文档）'],
  ['BIO', '一个普通的干饭人🍚', true, '作者简介'],
  ['KEYWORDS', 'Notion, 博客', true, 'SEO 关键词，逗号分隔'],
  ['LINK', 'http://localhost:3460', true, '站点 URL'],
  ['LANG', 'zh-CN', true, '语言'],
  ['SINCE', '2021', true, '建站年份'],
  ['BLOG_FAVICON', '/favicon.ico', true, '站点图标'],
  ['HOME_BANNER_IMAGE', 'https://cdn.tangly1024.com/images/page-cover/nasa_robert_stewart_spacewalk_2.jpg', true, '首页封面图'],

  // —— 外观 / 主题 ——
  ['APPEARANCE', 'light', true, 'light | dark | system'],
  ['THEME', 'example', true, '默认主题名'],
  ['THEME_SWITCH', 'true', true, '显示主题切换+主题控制台入口'],
  ['DEBUG', 'false', false, '调试面板'],

  // —— 内容展示 ——
  ['CAN_COPY', 'true', true, '是否允许复制正文'],
  ['CUSTOM_MENU', 'true', true, '是否使用自定义菜单（内容表菜单）'],
  ['POST_SHARE_BAR_ENABLE', 'true', true, '文章底部分享栏'],
  ['POSTS_PER_PAGE', '12', true, '每页文章数'],
  ['POST_LIST_STYLE', 'page', true, 'page | scroll'],
  ['POST_LIST_PREVIEW', 'false', true, '列表是否预览正文'],
  ['PSEUDO_STATIC', 'false', true, '伪静态 .html'],
  ['ENABLE_RSS', 'true', true, 'RSS'],
  ['NEXT_REVALIDATE_SECOND', '60', true, 'ISR 秒数'],

  // —— Example 主题（控制台信息配置白名单）——
  ['EXAMPLE_MENU_CATEGORY', 'true', true, 'Example：显示分类菜单'],
  ['EXAMPLE_MENU_TAG', 'true', true, 'Example：显示标签菜单'],
  ['EXAMPLE_MENU_ARCHIVE', 'true', true, 'Example：显示归档菜单'],
  ['EXAMPLE_MENU_SEARCH', 'true', true, 'Example：显示搜索菜单'],
  ['EXAMPLE_POST_LIST_COVER', 'true', true, 'Example：列表显示封面'],
  ['EXAMPLE_TITLE_IMAGE', 'false', true, 'Example：标题栏背景图'],
  ['EXAMPLE_ARTICLE_LAYOUT_VERTICAL', 'false', true, 'Example：文章上下布局'],
  ['EXAMPLE_ARTICLE_HIDDEN_NOTIFICATION', 'false', true, 'Example：隐藏公告'],

  // —— Example 配色（主题控制台配色）——
  ['EXAMPLE_COLOR_PRIMARY', '#6b7280', true, 'Example 主色'],
  ['EXAMPLE_COLOR_BG', '#ffffff', true, 'Example 页面背景'],
  ['EXAMPLE_COLOR_CARD', '#f3f4f6', true, 'Example 卡片背景'],
  ['EXAMPLE_COLOR_BORDER', '#e5e7eb', true, 'Example 边框'],

  // —— 挂件 / 统计 ——
  ['WIDGET_PET', 'false', true, 'Live2D 宠物'],
  ['ANALYTICS_BUSUANZI_ENABLE', 'true', true, '不蒜子统计'],

  // —— 联系方式（占位，官方表常有）——
  ['CONTACT_EMAIL', '', false, '邮箱'],
  ['CONTACT_TELEGRAM', '', false, 'Telegram'],
  ['CONTACT_GITHUB', '', false, 'GitHub'],
  ['CONTACT_TWITTER', '', false, 'Twitter'],

  // —— 高级 ——
  ['GLOBAL_CSS', '', false, '全局 CSS'],
  ['GLOBAL_JS', '', false, '全局 JS'],
  ['INLINE_CONFIG', '{}', false, 'JSON 合并进配置'],

  // —— FeishuNext 扩展（保留）——
  ['FEISHU_LIST_ROOT', '', false, '可选 list-root wiki'],
  ['FEISHU_CONFIG_TABLE', table, true, '本配置表 id'],
  ['CMS_PROVIDER', 'feishu', true, 'cms 提供方']
]

async function main() {
  const tr = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ app_id: process.env.FEISHU_APP_ID, app_secret: process.env.FEISHU_APP_SECRET })
  })
  const token = (await tr.json()).tenant_access_token
  const h = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const base = `${domain}/open-apis/bitable/v1/apps/${app}/tables/${table}`

  // list all records
  let page_token = ''
  const existing = []
  do {
    const body = { page_size: 100, automatic_fields: true }
    if (page_token) body.page_token = page_token
    const j = await (await fetch(`${base}/records/search`, { method: 'POST', headers: h, body: JSON.stringify(body) })).json()
    if (j.code !== 0) throw new Error(JSON.stringify(j))
    existing.push(...(j.data?.items || []))
    page_token = j.data?.has_more ? j.data.page_token : ''
  } while (page_token)
  console.log('existing', existing.length)

  // delete all existing (batch 500)
  const ids = existing.map(r => r.record_id)
  for (let i = 0; i < ids.length; i += 500) {
    const chunk = ids.slice(i, i + 500)
    if (!chunk.length) continue
    const del = await (await fetch(`${base}/records/batch_delete`, {
      method: 'POST', headers: h, body: JSON.stringify({ records: chunk })
    })).json()
    console.log('deleted chunk', chunk.length, del.code, del.msg)
  }

  // create new rows batch 500
  const records = ROWS.map(([name, value, enable, note]) => ({
    fields: {
      '配置名': name,
      '配置值': value == null ? '' : String(value),
      '启用': !!enable,
      '备注': note || ''
    }
  }))
  for (let i = 0; i < records.length; i += 500) {
    const chunk = records.slice(i, i + 500)
    const cre = await (await fetch(`${base}/records/batch_create`, {
      method: 'POST', headers: h, body: JSON.stringify({ records: chunk })
    })).json()
    console.log('created chunk', chunk.length, cre.code, cre.msg, cre.data?.records?.length)
    if (cre.code !== 0) console.log(JSON.stringify(cre).slice(0, 500))
  }
  console.log('DONE total', ROWS.length)
}

main().catch(e => { console.error(e); process.exit(1) })
