# 主题开发数据契约（AI / 人类通用）

> **目标：** 让「新开一套主题」时，明确知道：数据从哪来 → 被处理成什么样 → 主题里怎么用。  
> **场景：** `CMS_PROVIDER=feishu`（飞书驱动）。主题只消费**处理后的结构**，不要直接打飞书 OpenAPI。  
> **主工程：** `notionnext-feishu`  
> 日期：2026-07-25

---

## 0. 30 秒总览

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. 取数（服务端 only）                                        │
│    飞书 OpenAPI：CONFIG 表 + 内容表 + wiki/docx/media          │
│    入口：lib/site/adapters/feishu/*  +  lib/feishu/*          │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. 处理后的中间模型                                           │
│    SiteData（全站） + 详情页 post（含 feishuContent / toc）    │
│    形状对齐 NotionNext 主题习惯（字段名尽量同构）               │
└───────────────────────────┬─────────────────────────────────┘
                            ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. 主题怎么用                                                 │
│    pages/* getStaticProps → props 塞进 Layout*               │
│    列表：posts / latestPosts / categoryOptions / customMenu  │
│    详情：post + <NotionPage post={post} />（内部转飞书渲染）   │
│    配置：siteConfig('KEY', default, props.NOTION_CONFIG)     │
└─────────────────────────────────────────────────────────────┘
```

**主题作者 / AI 禁止：**

- 在主题里 `fetch` 飞书 API  
- 依赖 `post.blockMap` / `react-notion-x` 的 recordMap 结构  
- 假设每篇文章有自定义 slug（飞书侧默认 `node_token`）

**主题作者 / AI 应该：**

- 只读 `props` 上已有字段  
- 正文统一：`<NotionPage post={post} />` 或等价 `FeishuPage`  
- 配置用 `siteConfig`，不要硬编码站点名

---

## 1. 数据怎么拿（服务端管线，主题不实现）

### 1.1 开关

```bash
CMS_PROVIDER=feishu
FEISHU_APP_ID=...
FEISHU_APP_SECRET=...
FEISHU_CONTENT_APP_TOKEN=...   # 内容表 #2
FEISHU_CONTENT_TABLE_ID=...
FEISHU_CONFIG_APP_TOKEN=...    # CONFIG 表 #3
FEISHU_CONFIG_TABLE_ID=...
```

### 1.2 调用链

| 步骤 | 做什么 | 代码 |
|---|---|---|
| A | `tenant_access_token` | `lib/feishu/auth.ts` |
| B | 读 CONFIG 表 → `NOTION_CONFIG` | `loadConfigMap()` |
| C | 读内容表行 → 菜单/文章/页面/分类/公告 | `loadContentRows()` |
| D | wiki `get_node` 解析文档 token → `documentId` / `nodeToken` | `resolveDocumentIds()` |
| E | 类型=分类：拉父节点子文档，展开成多篇 Post | `expandCategoryPosts()` |
| F | 组装 **SiteData** | `fetchSiteFromFeishu()` |
| G | 文章详情：docx blocks → normalize → **feishuContent** | `enrichFeishuPost()` |

页面入口（主题无感）：

| 页面场景 | 函数 | 结果 |
|---|---|---|
| 首页/归档/分类/标签/搜索 | `fetchGlobalAllData()` | 全站 `SiteData` 进 props |
| 文章/独立页 | `resolvePostProps()` | 在 SiteData 上挂 `post`（已 enrich） |

飞书原始 JSON **不会**进主题；主题只看到 F/G 的产物。

### 1.3 内容表类型 → 站点对象（业务语义）

| 飞书内容表「类型」 | 处理后 | 主题用途 |
|---|---|---|
| 菜单 / 子菜单 | `customMenu` / `Menu`+`SubMenu` 页 | 导航 |
| 文章 | `type: 'Post'`，进 `latestPosts` | 列表 + 详情 |
| 页面 | `type: 'Page'` | 关于/友链等独立页 |
| 公告 | `notice` + 可选 Post | 公告位 |
| 分类 | **不单独成文**；子 wiki 文档展开为多篇 Post | 分类聚合 |

详情见 `FEISHU_CONTENT_TABLE_CONTRACT.md`。

---

## 2. 数据处理成什么样（主题可见模型）

### 2.1 全站：`SiteData`（列表页 props 主体）

类型定义：`lib/site/site.types.ts`

```ts
interface SiteData {
  NOTION_CONFIG: Record<string, unknown>  // 站点配置键值（来自 CONFIG 表 + 默认）
  siteInfo: {
    title: string
    description: string
    pageCover: string
    icon: string
    link: string
  }
  notice: BasePage | null

  allPages: BasePage[]       // 含 Post/Page/Notice/Menu…（服务端完整）
  allNavPages: NavPage[]
  allLinkPages: NavPage[]
  latestPosts: BasePage[]    // 已发布文章，按时间

  categoryOptions: Array<{ id?: string; name?: string; value?: string; count?: number }>
  tagOptions: Array<{ id?: string; name?: string; value?: string; count?: number }>

  customNav: MenuItem[]
  customMenu: MenuItem[]     // 主题顶栏/侧栏菜单优先用这个

  postCount: number
}
```

**列表页注意：** 很多 `pages/*` 会：

```js
props.posts = props.allPages.filter(/* Post + Published */)
// ...
delete props.allPages   // 客户端 props 里可能没有 allPages
```

所以主题列表应优先用：

- `props.posts`（若有）  
- 否则 `props.latestPosts`  
- 不要假设浏览器里一定有完整 `allPages`

### 2.2 单条摘要：`BasePage`（列表卡片）

```ts
interface BasePage {
  id?: string
  title: string
  slug: string                 // 飞书默认 = wiki node_token
  type: 'Post' | 'Page' | 'Notice' | 'Menu' | 'SubMenu'
  status: 'Published' | 'Invisible'
  summary?: string | null
  category?: string | null
  tags?: string[]
  tagItems?: { name: string }[]
  publishDate?: number         // ms 时间戳
  lastEditedDate?: number
  pageCoverThumbnail?: string | null  // 常为 /api/feishu/media/{token}
  pageIcon?: string | null
  href?: string | null         // 如 /article/{slug} 或 /{slug}
  ext?: {
    source?: 'feishu'
    documentId?: string | null // docx obj_token，拉正文用（主题一般不直接用）
    nodeToken?: string | null
    docToken?: string | null
    feishuType?: string        // 原始内容表类型语义
    [k: string]: unknown
  }
}
```

**链接规则（写主题时）：**

```text
优先 post.href
否则：
  Post   → /article/${post.slug}
  Page   → /${post.slug}
```

不要自己拼飞书 `feishu.cn/wiki/...` 当站内链（除非外链按钮）。



## 2.6 封面与图标（飞书差异）

| 字段 | 飞书来源 | 主题用法 |
|---|---|---|
| `pageCoverThumbnail` | 文档 meta `cover.token` → `/api/feishu/media/{token}` | 列表封面、TitleBar 背景 |
| `siteInfo.pageCover` | ① CONFIG `HOME_BANNER_IMAGE`（启用）② 否则主配置页/wiki 的 docx `cover.token`（`FEISHU_SITE_ROOT` / `FEISHU_LIST_ROOT`） | 无文封面时的站级背景 |
| `pageIcon` | **无稳定文档图标 OpenAPI** | `NotionIcon`：可空 |

**pageIcon 解析优先级（adapter 已做）：**

1. 内容表「图标」列：emoji / 图片 URL / `fas fa-xxx`
2. 标题开头的 emoji（飞书里常见把图标写进标题）
3. 空 → 主题不显示图标（与 Notion 有 icon 时不同，属预期降级）

**主题不要**假设每篇文章都有 `pageIcon`；封面有则用，图标可缺。

### 2.3 详情：`post` 在 BasePage 上的扩展字段

`enrichFeishuPost` 之后，详情 props 上的 `post` 额外包含：

| 字段 | 类型 | 主题怎么用 |
|---|---|---|
| `feishuContent` | `FeishuPageContent \| null` | **不要手写渲染**；交给 `NotionPage`/`FeishuPage` |
| `feishuPlainText` | `string` | 摘要兜底、搜索高亮、字数 |
| `feishuHeadings` | `{id,text,level}[]` | 一般用 `toc` 即可 |
| `toc` | `{id,text,title,level}[]` | 侧栏目录（NotionNext 习惯字段） |
| `accessError` | `string \| null` | 有值则显示锁/无权限，不渲染正文 |
| `blockMap` | 飞书路径下为 `null` | **禁止**当 Notion recordMap 用 |
| `password` | 通常 `null` | 飞书密码≠Notion 属性密码；无权限走 accessError |

### 2.4 正文结构：`FeishuPageContent` / `FeishuBlock`

类型：`lib/feishu/types.ts`

```ts
type FeishuPageContent = {
  documentId: string
  title: string
  blocks: FeishuBlock[]                 // 有序列表（展示主序列）
  blockMap: Record<string, FeishuBlock> // id → block（树/子块）
  rootId?: string
}

type FeishuBlock = {
  id: string
  type: FeishuBlockType  // paragraph | heading1.. | bullet | image | table | ...
  parentId?: string
  children: string[]     // 子 block id
  text?: TextRun[]        // 富文本 runs
  // image / table / callout / embed / ...
}
```

**主题层默认不解析 blocks。**  
只有你在做「非标准正文实验」时才读 `feishuContent`；正式主题用统一渲染器。

### 2.5 配置：`NOTION_CONFIG` + `siteConfig`

```js
import { siteConfig } from '@/lib/config'

// 在组件里：
const title = siteConfig('TITLE', '默认站名', props.NOTION_CONFIG)
const postsPerPage = siteConfig('POSTS_PER_PAGE', 12, props.NOTION_CONFIG)
```

读取顺序（实现已定）：**CONFIG 表启用行 → 环境变量 → blog.config / 主题 CONFIG**。

常见键（与 NotionNext 同名，便于主题复用）：

`TITLE` `DESCRIPTION` `LINK` `AUTHOR` `THEME` `LANG` `POSTS_PER_PAGE` …

飞书 CONFIG 表契约：`FEISHU_BITABLE_CONFIG_CONTRACT.md`。

---

## 3. 主题怎么调用（照着写就能接飞书）

### 3.1 主题目录约定（与 NotionNext 相同）

```text
themes/<your-theme>/
  index.js      # 导出 LayoutBase / LayoutIndex / LayoutSlug / ...
  config.js     # 主题默认 CONFIG
  style.js      # 可选
  components/   # 可选
```

在 `themes/theme.js` 的扫描体系下，文件夹名 = 主题名。  
`NEXT_PUBLIC_THEME=your-theme` 或 `?theme=your-theme`。

### 3.2 必须实现的 Layout（最低集）

对齐 `themes/example/index.js` 导出：

| 导出 | 用途 | 主要 props |
|---|---|---|
| `LayoutBase` | 壳：头/脚/侧栏 | 全部 props + children |
| `LayoutIndex` / `LayoutPostList` | 首页列表 | `posts` 或 `latestPosts` |
| `LayoutSlug` | 文章/页面详情 | `post`, `prev`, `next` |
| `LayoutArchive` | 归档 | `posts` |
| `LayoutSearch` | 搜索 | keyword + posts |
| `LayoutCategoryIndex` | 分类索引 | `categoryOptions` |
| `LayoutTagIndex` | 标签索引 | `tagOptions` |
| `Layout404` | 404 | — |

### 3.3 列表卡片（推荐最小用法）

```jsx
// themes/your-theme/components/BlogItem.js
import Link from 'next/link' // 或项目内 SmartLink

export default function BlogItem({ post }) {
  if (!post || post.type !== 'Post') return null
  const href = post.href || `/article/${post.slug}`
  return (
    <article>
      <Link href={href}>
        <h2>{post.title}</h2>
      </Link>
      {post.summary ? <p>{post.summary}</p> : null}
      {post.pageCoverThumbnail ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.pageCoverThumbnail} alt="" />
      ) : null}
      <div>
        {post.category}
        {post.publishDate
          ? new Date(post.publishDate).toLocaleDateString()
          : null}
      </div>
    </article>
  )
}
```

### 3.4 详情正文（必须这样接）

```jsx
// LayoutSlug 内
import NotionPage from '@/components/NotionPage'
// 飞书路径下 NotionPage 会转到 FeishuRenderer；不要自己 import react-notion-x

export const LayoutSlug = props => {
  const { post } = props
  if (!post) return <div>Not found</div>

  if (post.accessError) {
    // 可选：用主题自己的 PostLock UI
    return <div>{post.accessError}</div>
  }

  return (
    <article>
      <h1>{post.title}</h1>
      {/* 目录：post.toc */}
      <NotionPage post={post} />
    </article>
  )
}
```

**正确：**

```text
post.feishuContent ──(NotionPage/FeishuPage)──► FeishuRenderer
```

**错误：**

```text
post.blockMap ──► NotionRenderer   // 飞书下 blockMap 为 null
飞书原始 blocks JSON ──► 主题手写解析
```

### 3.5 菜单

```jsx
const menus = props.customMenu || props.customNav || []
// MenuItem: { name, href, icon, show, subMenus? }
menus.filter(m => m.show !== false).map(m => (
  <a key={m.name} href={m.href || '/'}>{m.name}</a>
))
```

### 3.6 站点标题 / 配置

```jsx
import { siteConfig } from '@/lib/config'

const siteTitle = siteConfig('TITLE', 'Site', props.NOTION_CONFIG)
const description = siteConfig('DESCRIPTION', '', props.NOTION_CONFIG)
```

或展示：

```jsx
props.siteInfo?.title
props.siteInfo?.description
```

### 3.7 分类 / 标签

```jsx
props.categoryOptions // [{ name, value, count }, ...]
props.tagOptions
// 链接习惯：/category/${encodeURIComponent(name)}  /tag/${encodeURIComponent(name)}
```

### 3.8 公告

```jsx
props.notice // BasePage | null
// 若 notice 带 feishuContent，同样用 <NotionPage post={notice} />
```

---

## 4. 端到端对照表（AI 生成主题时自检）

| 需求 | 数据字段 | 组件/API |
|---|---|---|
| 站名 | `siteInfo.title` / `siteConfig('TITLE')` | Header |
| 文章列表 | `posts` / `latestPosts` | BlogList |
| 一篇标题 | `post.title` | 卡片/H1 |
| 一篇链接 | `post.href` 或 `/article/${slug}` | Link |
| 摘要 | `post.summary` | 卡片 |
| 封面 | `post.pageCoverThumbnail` | img |
| 分类 | `post.category` / `categoryOptions` | meta / 索引页 |
| 标签 | `post.tags` / `tagOptions` | meta / 索引页 |
| 正文 | `post` 整对象 | **`<NotionPage post={post} />`** |
| 目录 | `post.toc` | 侧栏 |
| 无权限 | `post.accessError` | Lock UI |
| 导航 | `customMenu` | Menu |
| 主题色/开关 | `siteConfig(...)` | 主题 CONFIG |

自检清单（AI 交付主题前）：

- [ ] 未出现 `react-notion-x` / `recordMap` / `blockMap` 渲染正文  
- [ ] 列表使用 `posts`/`latestPosts`，链接用 `href`/`slug`  
- [ ] 详情唯一正文入口为 `NotionPage` 或 `FeishuPage`  
- [ ] 配置走 `siteConfig` + `NOTION_CONFIG`  
- [ ] 不请求 `open.feishu.cn`  
- [ ] 处理 `accessError` 与空 `feishuContent`

---

## 5. 和「原始飞书 JSON」的边界（再次强调）

| 阶段 | 形态 | 谁碰 |
|---|---|---|
| OpenAPI 原始 | bitable records、docx blocks 嵌套 JSON | 仅 `lib/feishu/*` |
| 结构化后 | `SiteData` / `BasePage` / `FeishuPageContent` | adapter + 渲染器 |
| 主题运行时 | props 上的 SiteData 字段 + post | **只允许主题碰这一层** |

项目灵魂（为什么要结构化）：`PROJECT_SOUL.md`。

---

## 6. 最小示例：从 example 抄什么

推荐复制顺序：

1. `themes/example/index.js` — Layout 骨架与 props 解构  
2. `themes/example/components/BlogItem.js` — 列表字段  
3. `LayoutSlug` 里对 `NotionPage` 的用法  
4. `config.js` — 主题默认项  

然后只改 JSX/CSS，**不要改数据获取**。

---

## 7. 相关代码与文档索引

| 路径 | 说明 |
|---|---|
| `lib/site/site.types.ts` | SiteData / BasePage 类型 |
| `lib/site/adapters/feishu/feishu.adapter.ts` | 组装 SiteData、enrich 详情 |
| `lib/site/adapters/feishu/feishu.content.ts` | 表 → 行 → 分类展开 → 正文 |
| `lib/feishu/types.ts` | FeishuBlock / FeishuPageContent |
| `lib/feishu/normalize.ts` | 原始 blocks → 中间模型 |
| `components/NotionPage.js` | 飞书时分流到 FeishuPage |
| `components/FeishuPage.js` | 详情正文入口 |
| `components/feishu/FeishuRenderer.tsx` | blocks 渲染 |
| `lib/config.js` | `siteConfig()` |
| `themes/example/` | 参考主题 |
| `PROJECT_SOUL.md` | 为什么要结构化 |
| `STABLE_FEISHU_DATA.md` | OpenAPI 稳定路径 |
| `FEISHU_DOCUMENT_CONTRACT.md` | 单篇文档字段 |
| `FEISHU_CONTENT_TABLE_CONTRACT.md` | 内容表类型 |
| `FEISHU_BITABLE_CONFIG_CONTRACT.md` | CONFIG 表 |

---

## 8. 给 AI 的提示词模板（可直接贴）

```text
在 notionnext-feishu 仓库新增主题 themes/<name>。
约束：
1. CMS_PROVIDER=feishu；禁止主题内请求飞书 API。
2. 数据只使用 props：posts/latestPosts、post、customMenu、
   categoryOptions、tagOptions、siteInfo、NOTION_CONFIG。
3. 正文必须用 <NotionPage post={post} />，不要用 blockMap/react-notion-x。
4. 配置用 siteConfig(key, default, props.NOTION_CONFIG)。
5. 链接优先 post.href，文章 slug 视为 node_token。
6. 处理 post.accessError。
7. 对齐 themes/example 的 Layout 导出集合。
请先读 docs/feishu/THEME_DATA_CONTRACT.md 再写代码。
```

---

## 9. 一句话

> **取数与清洗在 `lib/feishu` + `adapters/feishu`；主题只消费 SiteData/post，正文只走 NotionPage→FeishuRenderer。**  
> 新主题 = 换皮，不换数据协议。
