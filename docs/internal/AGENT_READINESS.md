# Agent Readiness（AI 智能体就绪度）

> 阶段：C0–C2（第一刀）  
> 线上验收域名：https://feishu-next-beta.vercel.app  
> 校验器：**A** Cloudflare URL Scanner（Agent Readiness）+ **B** isitagentready 风格清单  
> 日期：2026-07-29

---

## 1. 为什么做

项目灵魂（见 [PROJECT_SOUL.md](./PROJECT_SOUL.md)）已经明确：

1. **Stage A**：把飞书编辑态 JSON 洗成展示用结构化数据  
2. **Stage C（本文件）**：同一套结构，再对 **AI Agent / 爬虫 / 机器读者** 友好

官方飞书场景强在编辑与权限；我们的优势是**只读展示 + 可缓存 + 可再分发**。  
Agent 就绪不是另起炉灶，而是在结构化数据之上补齐**发现协议与轻量正文出口**。

---

## 2. 六维清单（A + B）

| 维度 | 目标 | C0–C2 动作 |
|---|---|---|
| Basic Web Presence | 可访问 HTTPS 站、标题/主页 | 已有 beta 站 |
| Discoverability | robots / sitemap / 内链 | 动态 robots + 修 sitemap 域名 |
| Content Accessibility | 正文可被机器读 | `/api/agent/posts` JSON + markdown |
| Bot Access Control | 不误拦公开内容 | robots 明确 Allow 主流 AI bot |
| Protocol Discovery | llms.txt / RSS / sitemap | `/llms.txt` `/llms-full.txt` `/rss/feed.xml` |
| Commerce | 结账/商品协议 | **本阶段不做**（博客/文档站） |

---

## 3. C0 基线问题（修之前）

对 `https://feishu-next-beta.vercel.app` 实测：

| 端点 | 问题 |
|---|---|
| `/robots.txt` | `Host` / `Sitemap` 写成 `http://localhost:3460` |
| `/sitemap.xml` | 全部 `loc` 为 localhost |
| `/rss/feed.xml` | channel/item link 为 localhost |
| `/llms.txt` | 不存在 |
| 机器正文 | 只有重 HTML，无一等公民 markdown/JSON 出口 |

根因：

- 本地/构建环境 `NEXT_PUBLIC_LINK=http://localhost:3460`  
- 或 CONFIG 表 LINK 为 localhost  
- 构建期写入 `public/robots.txt` 会**盖住**动态路由  
- sitemap/rss 直接信任 `siteInfo.link`，未按请求 Host 纠正

---

## 4. C1–C2 已实现

### 4.1 公共链接解析

[`lib/utils/publicSiteLink.js`](../../lib/utils/publicSiteLink.js)

优先级：

1. 请求 `Host` / `x-forwarded-host`（非 localhost）  
2. 非本地的 CONFIG / `NEXT_PUBLIC_LINK`  
3. `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`  
4. 最后才 localhost（仅本地开发）

同步修正：

- [`blog.config.js`](../../blog.config.js) LINK  
- [`lib/site/adapters/feishu/feishu.adapter.ts`](../../lib/site/adapters/feishu/feishu.adapter.ts) siteInfo.link  
- [`pages/sitemap.xml.js`](../../pages/sitemap.xml.js)  
- [`pages/api/rss.js`](../../pages/api/rss.js)

### 4.2 动态发现协议

| URL | 实现 |
|---|---|
| `/robots.txt` → `/api/robots` | [`pages/api/robots.js`](../../pages/api/robots.js) |
| `/llms.txt` → `/api/llms` | [`pages/api/llms.js`](../../pages/api/llms.js) |
| `/llms-full.txt` → `/api/llms?full=1` | 同上 |
| `/rss/feed.xml` | 已有 API，改为 public link |

`next.config.js` 构建时删除 `public/robots.txt`，避免静态文件抢路由。

### 4.3 Agent 内容出口

| URL | 用途 |
|---|---|
| `GET /api/agent/posts` | 文章索引 JSON（title/url/summary/agent 链接） |
| `GET /api/agent/posts/:slug` | 单篇 JSON（含 `plainText` + `markdown`） |
| `GET /api/agent/posts/:slug?format=md` | Markdown 导出 |
| `Accept: text/markdown` | 同上 |

Markdown 优先飞书官方 `docs/v1/content?content_type=markdown`，失败则回退 `feishuPlainText`。

---

## 5. 部署后验收（必做）

```bash
BASE=https://feishu-next-beta.vercel.app

curl -s "$BASE/robots.txt" | head
# 期望：Host/Sitemap 为 feishu-next-beta.vercel.app，无 localhost

curl -s "$BASE/sitemap.xml" | head
# 期望：loc 使用 https://feishu-next-beta.vercel.app/...

curl -s "$BASE/llms.txt" | head
curl -s "$BASE/api/agent/posts" | head
curl -s "$BASE/rss/feed.xml" | head
```

### A. Cloudflare URL Scanner

- Dashboard：Protect & Connect → Application Security → Investigate  
- 或 API：`POST /accounts/{account_id}/urlscanner/v2/scan`  
  body: `{ "url": "https://feishu-next-beta.vercel.app/", "agentReadiness": true }`  
- 看报告 **Agent Readiness** 六维分数  
- 历史 scan id（修前基线）：`b207cd19-e34f-4303-9995-a118c8a31401`

### B. isitagentready 风格自检

1. HTTPS 可访问  
2. robots 允许抓取且 sitemap 正确  
3. 存在 llms.txt 或等价机器索引  
4. 正文有非 HTML 出口（本项目：agent JSON/md）  
5. 不依赖登录即可读公开内容  
6. Commerce 可忽略

---

## 6. 运维注意

1. **生产环境不要把 `NEXT_PUBLIC_LINK` 设成 localhost。**  
   可留空，让 Vercel URL / 请求 Host 接管；自定义域就绪后设为正式域名。  
2. 飞书 CONFIG 表若有 `LINK` 字段，也不要填 localhost。  
3. 若仍看到旧 robots，先确认 Vercel 已部署本分支，并强刷（CDN）。  
4. Commerce / 登录墙 / 付费全文 **不在 C0–C2**。

---

## 7. 与灵魂文档的关系

| 阶段 | 内容 |
|---|---|
| A | 飞书 JSON → 结构化展示数据 |
| B | 站点壳 / 主题 / SEO 人类阅读 |
| C | 同一数据 → Agent 发现与轻量消费（本文件） |

后续可增强：`llms-full` 内嵌全文、按 tag/category 的 agent feed、Webhook 增量、Cloudflare 扫描分数趋势入库。  
**不改变数据层主路径**：仍是飞书官方 API → normalize → 中间模型。

---

## 8. 部署状态（2026-07-29 实测）

代码已合入 `main`（含 C0–C2 与 SSG Clerk 修复）。

线上 `https://feishu-next-beta.vercel.app` **在新构建成功前**仍可能是旧产物：

| 现象 | 原因 |
|---|---|
| robots/sitemap/rss 仍是 localhost | 旧部署；新动态路由未上线 |
| `/llms.txt` 404 | 同上 |
| 新 Production 构建 Error | 1) Vercel 上飞书应用缺 `bitable:*` 权限 → `fetchSiteFromFeishu` 失败；2) 失败后 SSG `/en` 曾因 Clerk `useUser` 崩（已修 client-only sync） |

### 你需要做的运维动作

1. 打开飞书应用权限，开通 **bitable:app / bitable:app:readonly / base:record:retrieve**，并确保 Vercel 环境变量里的 `FEISHU_APP_ID/SECRET` 对应该应用。  
2. 生产 `NEXT_PUBLIC_LINK` 不要设 `http://localhost:3460`（可留空或设 beta/正式域）。  
3. 重新 Deploy 成功后跑本文第 5 节验收；再提交 Cloudflare URL Scanner（`agentReadiness: true`）。

### Cloudflare Scanner

本侧会话调用 Cloudflare URL Scanner API 时工具层异常（HTTP 200 被当成 error），未能可靠写入新 scan。可用 Dashboard Investigate 或官方 API 自行扫：

`https://feishu-next-beta.vercel.app/`

基线 scan id（修前）：`b207cd19-e34f-4303-9995-a118c8a31401`
