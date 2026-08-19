# 当前框架 + 下一步框架

> 2026-08-15  
> 补回「已完成什么、下一阶段开哪两条线」。  
> 细节契约：[THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md)、[AGENT_API.md](../feishu/AGENT_API.md)。

---

## 1. 当前阶段已经完成的是什么

一句话：

> **飞书当后台，把官方编辑态 JSON 洗成展示向结构化数据，再喂给 NotionNext 风格的前端壳。**

这是阶段 A 的闭环。竞争力还不在「又一个主题站」，而在中间那一层**结构化数据**。

```text
人在飞书写（文档 + 多维表格）
        │  官方 OpenAPI（必须鉴权）
        ▼
FeiShow 数据层
  lib/feishu/*              取数
  adapters/feishu/*         组装 SiteData / post
  normalize + FeishuBlock   正文中间模型
        │
        ├─► 人类站：NotionNext 主题壳（列表 / 阅读 / SEO）
        └─► 机器出口：llms.txt / agent JSON / markdown（同一份 feishuContent）
```

### 1.1 已落地的三层

| 层 | 做什么 | 状态 |
|---|---|---|
| **后台** | 飞书知识库 + 内容表 + CONFIG 表 | 可用 |
| **数据层** | OpenAPI → `SiteData` / `post` / `feishuContent` | **本阶段主交付** |
| **前端壳** | NotionNext 主题 / 路由 / SEO，正文走 `NotionPage` → `FeishuRenderer` | 已适配，不伪造 recordMap |

数据语义（不要再摇摆）：

| # | 块 | 飞书载体 | 站点用途 |
|---|---|---|---|
| ① | 文档 | Docx / wiki 节点 | 一篇正文 |
| ② | 内容表 | 多维表格 | 菜单 / 文章 / 页面 / 分类父页展开 |
| ③ | 配置表 | CONFIG-TABLE | TITLE、开关、主题等 |

### 1.2 已经能对外提供的「结构化结果」

主题和 Agent **都只应消费这一层**，不要自己打飞书：

- 全站：`SiteData`（`latestPosts`、`customMenu`、`NOTION_CONFIG`、`siteInfo`…）
- 单篇：`post` + `feishuContent` / `feishuPlainText` / `toc` / `accessError`
- 机器：`/llms.txt`、`/api/agent/posts`、`/api/agent/posts/:slug`（JSON / markdown）

契约：[THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md)

### 1.3 明确不算「已完成」的

- 用户部署仍偏重（README 还在要一堆表 token；`.env.feishu.example` 已收敛到 App + `FEISHU_SITE_ROOT`，产品体验未对齐）
- 线上 beta 曾因权限 / `LINK=localhost` 验收未闭环
- Agent 列表/单篇已投影 `SiteData` / `feishuContent`；不是完整「数据平台」
- 缓存策略文档有，按 document revision 换 key 等增强未做

---

## 2. 下一步：两条线并行，共用同一数据层

两条线**不要拆成两个产品**。  
共用的是已经做成的中间模型；分开的是**人怎么把站点亮**，和**机器怎么把数据拿走**。

```text
                    ┌─ D. 部署收敛 ──► 用户只填少量参数就能上线
结构化数据层 ──────┤
                    └─ C. AI 就绪  ──► 别人/Agent 调用整理后的飞书数据
```

**核心竞争力在 C：** 不是多一个主题，而是「飞书内容 → 稳定、可引用、可再分发的结构化接口」。  
**D 是把 A 交到用户手里：** 没有极简部署，C 也没有分发面。

---

## 3. 方向 D — 部署收敛

### 目标

用户部署时只填**几个关键参数**，其余从飞书根页面 / CONFIG 表发现。

### 理想最小集合

| 必填 | 为什么 |
|---|---|
| `FEISHU_APP_ID` | 鉴权 |
| `FEISHU_APP_SECRET` | 鉴权 |
| `FEISHU_SITE_ROOT` | 产品根 wiki/文档；表和文档挂在这棵树下 |

**不要让用户填：** 内容表/CONFIG 的 app_token、table_id（能自动发现就发现）、`CMS_PROVIDER`、生产 `LINK=localhost`。

可选（进 CONFIG 表，不进 Vercel 密钥墙）：

`TITLE` / `THEME` / `NEXT_REVALIDATE_SECOND` / 菜单开关…

生产 `NEXT_PUBLIC_LINK`：自定义域再填；否则让请求 Host / Vercel URL 接管。

### 本方向要做的框架工作

1. **站点根发现**做稳：`FEISHU_SITE_ROOT` → 内容表 + CONFIG 表
2. **部署清单一页纸**保持 3 个 env + 应用授权
3. **验收脚本**：部署后 curl robots / sitemap / 首页 / 一篇正文，不允许 localhost
4. Vercel 模板式体验：fork → 填 3 个值 → deploy

### 不做

- 再做一个飞书应用后台
- 把 Notion 全量部署教程当主路径
- 为了「灵活」把密钥和业务配置重新堆回 `.env`

---

## 4. 方向 C — AI 就绪（竞争力主线）

### 目标

把数据层从「给主题用的 props」升级成「给人和 Agent 共用的内容出口」。

别人要的不是再爬一遍飞书，而是：

```text
GET  /api/agent/posts              列表（结构化）
GET  /api/agent/posts/:slug        单篇 JSON + plainText + markdown
GET  /llms.txt                     发现协议
GET  /sitemap.xml  /rss/feed.xml   传统发现
```

全部来自**同一套** `SiteData` / `feishuContent`，不另起 CMS。

### 已有

- 发现：robots / llms / sitemap / rss（公网 Host 纠正）
- 列表 JSON = 站点 `allPages`
- 单篇 JSON/MD = `feishuContent` 投影（`markdownSource=feishu-blocks`）
- 调用说明：[AGENT_API.md](../feishu/AGENT_API.md)

### 本方向剩下的（仍要小）

1. 公网部署后 URL 不是 localhost（这是方向 D）
2. 按需：`llms-full` 更深、revision 级缓存失效
3. **后置：** 向量库、问答、登录墙私有语料

### 原则

- Agent 出口 = 数据层的另一个消费者，**不是**第二条数据管线
- 先稳定只读公开内容；付费全文 / Commerce 不做
- 缓存按 key（见 [CACHE_STRATEGY.md](./CACHE_STRATEGY.md)），不是整站定时清空

---

## 5. 建议怎么并行（避免又做成两摊）

| 时间盒 | D 部署 | C AI |
|---|---|---|
| 立刻 | 部署页保持 3 个参数；权限检查清单 | 公网 curl 验收 agent（无 localhost） |
| 随后 | `SITE_ROOT` 自动发现做稳 | 字段保持冻结，不要另开数据源 |
| 再后 | 更少手动授权指引 | 增量失效、分面 feed |

共同验收：

```text
新用户：3 个 env + 应用授权 → 站能开
Agent： 不登录拿到列表和一篇 markdown，URL 是公网域名
```

---

## 6. 一句话备忘（防再丢）

> **已完成：** 飞书后台 → 结构化中间模型 → NotionNext 前端。  
> **下一步两线：** D 让部署只填关键参数；C 把同一结构做成可调用的 AI/机器数据出口。  
> **C 才是长期竞争力；D 是让它能被别人用起来。**
