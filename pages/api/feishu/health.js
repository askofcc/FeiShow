import { getTenantAccessToken } from '@/lib/feishu/auth'
import { parseWikiToken, resolveWikiNode } from '@/lib/feishu/wiki'
import { resolveFeishuTables } from '@/lib/feishu/bootstrap'

function explain(err) {
  const raw = err instanceof Error ? err.message : String(err || '')
  const codeMatch = raw.match(/\b(\d{5,8})\b/)
  const code = codeMatch ? Number(codeMatch[1]) : null
  const map = {
    10003: '应用 ID 或密钥不对。请核对开放平台里的 App ID / App Secret。',
    10014: '应用未发布，或当前版本没有所需权限。请在开放平台发布一版。',
    99991663: 'access token 无效，多半是密钥错了，或应用刚改权限还没发布。',
    99991672: '没有文档读权限。请给应用开通云文档/知识库读权限并发布。',
    131006: '应用还不是这个知识库的成员。打开根页 → 分享 → 添加文档应用 / 协作者（可读即可）。',
    1770032: '多维表格无权限。把应用加成对应多维表格的协作者。'
  }
  const hint = (code && map[code]) || null
  if (/Missing FEISHU_APP_ID/.test(raw)) {
    return {
      hint: '还没配置 FEISHU_APP_ID / FEISHU_APP_SECRET。在 Vercel 环境变量里填这两个。',
      code: null,
      raw
    }
  }
  return { hint: hint || '请求飞书失败。先看下一步提示，再核对应用权限和根页授权。', code, raw }
}

/**
 * GET /api/feishu/health
 * Public deploy self-check. Never returns secrets.
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ ok: false, message: '只用 GET' })
  }

  const appId = process.env.FEISHU_APP_ID || ''
  const hasSecret = Boolean(process.env.FEISHU_APP_SECRET)
  const siteRoot = (
    process.env.FEISHU_SITE_ROOT ||
    process.env.FEISHU_LIST_ROOT ||
    ''
  ).trim()

  const checks = []
  const next = []

  const pass = (id, title, detail) => {
    checks.push({ id, ok: true, title, detail: detail || null })
  }
  const fail = (id, title, detail, action) => {
    checks.push({ id, ok: false, title, detail: detail || null })
    if (action) next.push(action)
  }

  if (!appId || !hasSecret) {
    fail(
      'env-app',
      '应用凭证',
      '缺少 FEISHU_APP_ID 或 FEISHU_APP_SECRET',
      '在 Vercel → Settings → Environment Variables 填入开放平台的 App ID 和 App Secret，然后 Redeploy。'
    )
  } else {
    pass('env-app', '应用凭证', `已配置 App ID（${appId.slice(0, 8)}…）`)
  }

  if (!siteRoot) {
    fail(
      'env-root',
      '站点根页',
      '缺少 FEISHU_SITE_ROOT',
      '把知识库根页链接填到 FEISHU_SITE_ROOT，例如 https://xxx.feishu.cn/wiki/xxxxxxxx'
    )
  } else {
    pass('env-root', '站点根页', siteRoot)
  }

  if (appId && hasSecret) {
    try {
      await getTenantAccessToken()
      pass('token', '应用鉴权', 'tenant_access_token 获取成功')
    } catch (e) {
      const { hint, code, raw } = explain(e)
      fail('token', '应用鉴权', `${hint}${code ? `（${code}）` : ''}`, hint)
      checks[checks.length - 1].debug = raw
    }
  }

  let nodeTitle = null
  if (siteRoot && checks.every(c => c.id !== 'token' || c.ok)) {
    const token = parseWikiToken(siteRoot)
    if (!token) {
      fail(
        'root',
        '根页可解析',
        'FEISHU_SITE_ROOT 不是有效的 /wiki/TOKEN 链接',
        '请使用知识库页面链接，路径里应包含 /wiki/ 加一串 token。'
      )
    } else {
      try {
        const node = await resolveWikiNode(token)
        if (!node?.space_id || !node.node_token) {
          fail(
            'root',
            '根页可读',
            '拿不到知识库节点。多半是应用还不是这个库的成员。',
            '打开该飞书页面 → 分享 → 添加文档应用，选中你的应用，权限选「可阅读」。'
          )
        } else {
          nodeTitle = node.title || null
          pass('root', '根页可读', node.title ? `「${node.title}」` : token)
        }
      } catch (e) {
        const { hint, raw } = explain(e)
        fail('root', '根页可读', hint, hint)
        checks[checks.length - 1].debug = raw
      }
    }
  }

  if (checks.filter(c => !c.ok).length === 0) {
    try {
      const tables = await resolveFeishuTables()
      if (tables.contentAppToken && tables.contentTableId) {
        pass(
          'content',
          '内容表',
          `已发现 ${tables.contentAppToken}/${tables.contentTableId}（${tables.source}）`
        )
      } else {
        fail(
          'content',
          '内容表',
          '根页下没找到内容多维表格',
          '在根页下建一张多维表格，至少含「标题」「类型」「文档」列（或表名带「内容/博客」）。'
        )
      }
      if (tables.configAppToken && tables.configTableId) {
        pass(
          'config',
          'CONFIG 表',
          `已发现 ${tables.configAppToken}/${tables.configTableId}（${tables.source}）`
        )
      } else {
        fail(
          'config',
          'CONFIG 表',
          '根页下没找到 CONFIG 多维表格（站点仍可用默认配置）',
          '可选：在根页下建表，列名为「配置名 / 配置值 / 启用」。或先不管，用默认站点名。'
        )
      }
    } catch (e) {
      const { hint, raw } = explain(e)
      fail('tables', '自动发现表格', hint, hint)
      checks[checks.length - 1].debug = raw
    }
  }

  const blocking = checks.filter(
    c => !c.ok && c.id !== 'config'
  )
  const ok = blocking.length === 0

  if (ok && next.length === 0) {
    next.push('打开首页确认列表和一篇文章能打开。之后改飞书内容即可，不必再进 Vercel。')
  }

  res.setHeader('Cache-Control', 'no-store')
  return res.status(ok ? 200 : 503).json({
    ok,
    message: ok
      ? '飞书配置可用，站点可以展示内容。'
      : '飞书配置还不完整，按 next 逐步补。',
    checks,
    next,
    rootTitle: nodeTitle
  })
}
