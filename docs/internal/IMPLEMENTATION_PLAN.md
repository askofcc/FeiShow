# FeishuNext 实施总计划（二开路径）

> 状态：**计划锁定，尚未按本计划开工**  
> 日期：2026-07-23  
> 目的：避免「做着做着少一块」——先列全目标与任务，再动手。  
> 策略：**NotionNext 二开（壳）+ 飞书数据层替换（本仓库资产迁入）**

---

## 0. 一句话目标

> 用 **NotionNext 的前端壳与站点逻辑**，换成 **飞书三块数据**，做出体验对齐 NotionNext（先锁 `example` 主题）的 **FeishuNext**。

**不是：** 在空仓库里手搓 UI 逼近 NotionNext。  
**不是：** 伪造完整 Notion `recordMap` 喂 `react-notion-x`。  
**是：** 二开 NotionNext → 换 CMS 适配层 + 正文渲染器。

---

## 1. 核心场景与核心需求（开工前提）

| 项 | 定论 |
|---|---|
| 核心场景 | 团队/产品已在飞书写文档与维护内容，需要独立域名的 SEO 友好公开站 |
| 核心需求 | 飞书当后台，站点当对外 Web 资产；菜单/文章/页面/分类可配置；阅读体验接近 NotionNext |
| 非目标（一期） | 25 主题全开、广告/会员、Live2D、完整 protobuf 逆向、像素级全插件 1:1 |
| 客观约束 | 必须官方 OpenAPI + 应用鉴权；文档无 Notion 级 properties；图标/密码 API 能力有限 |

---

## 2. 数据契约（已定死，实现必须遵守）

### 2.1 三块数据

| # | 名称 | 飞书载体 | 契约文档 | 代码状态 |
|---|---|---|---|---|
| ① | 文档正文 | Docx + Wiki 节点 | `FEISHU_DOCUMENT_CONTRACT.md` | 半成品：auth/docx/media/normalize/renderer 有 |
| ② | 内容配置 | 多维表「Notion 博客」`tbl6eQEHZ6ShGBk5` | `FEISHU_CONTENT_TABLE_CONTRACT.md` / `PROJECT_BASELINE.md` §3 | **未按四类模型重写** |
| ③ | 站点配置 | CONFIG-TABLE `tbl4qPlVgMLg5eaH` | `FEISHU_BITABLE_CONFIG_CONTRACT.md` | **表已建，代码未读** |

### 2.2 内容表类型（#2）— 实现只认这些

| 类型 | 行为 |
|---|---|
| 菜单 / 子菜单 | 导航；不拉正文 |
| 文章 | 列表 + 详情读 ① |
| 页面 | 独立页模板 + 读 ① |
| 分类 | 文档=父 wiki → 自动展开子文档为文章 |

**刻意不做：** 表字段全集对齐 Notion（状态/密码/Config 行堆在内容表）。

### 2.3 API 主路径

见 `STABLE_FEISHU_DATA.md`。禁止网页 protobuf / clientvars 作基座。

---

## 3. 现有资产盘点（半成品）

### 3.1 仓库：`/Users/qiushuanglong/Documents/FeishuNext`

| 资产 | 路径 | 评价 | 二开时如何用 |
|---|---|---|---|
| 飞书 auth/client | `src/lib/feishu/auth.ts` `client.ts` | 可用 | 迁入 fork 的 `lib/feishu/` |
| bitable 读表 | `src/lib/feishu/bitable.ts` | 可用，需按 #2/#3 字段解析重写上层 | 保留底层 search |
| wiki 树 | `tree.ts` `wiki.ts` `list-root.ts` | list-root 主路径已通 | **分类展开**复用；不再当唯一索引源 |
| docx + normalize | `docx.ts` `normalize.ts` | 常用块已映射 | 正文唯一路径 |
| FeishuRenderer | `components/renderer/FeishuRenderer.tsx` | 可用 | 替换 `NotionPage`/`NotionRenderer` |
| media/board API | `app/api/media` `board` | 可用 | 迁入 |
| 手搓 example 主题 | `src/theme/example/` | 曾对齐测量，但仍是仿写 | **二开后弃用为壳源**，仅作对照参考 |
| get-site-data | `src/lib/site/get-site-data.ts` | list-root 优先；bitable 未按四类模型 | **重写为 FeishuSiteAdapter** |
| 契约/样本 docs | `docs/*` | 关键，继续当 SSOT | 迁入 fork `docs/feishu/` |
| setup 脚本 | `scripts/setup_notion_like_template.py` | 建表示例用 | 保留 |
| 凭证 | `.env.local` | 有 live app | 二开 env 映射 |

### 3.2 NotionNext 本地源

路径：

`/Users/qiushuanglong/Documents/Codex/2026-07-01/notionnext-org-notionnext-https-github-com/work/NotionNext`

版本线索：`package.json` → `4.10.3`，已有 `lib/site/adapters/notion/` 适配器形态（适合再加 `feishu` adapter）。

### 3.3 当前最大缺口（为何以前「总差一点」）

1. **实施路径摇摆**：手搓 FeishuNext UI ↔ 迁 example ↔ 又谈整仓二开，未锁仓库策略。  
2. **数据主路径摇摆**：list-root / bitable 全字段 / 简化内容表 混用，代码与 `PROJECT_BASELINE` 不一致。  
3. **无「整包壳 + 适配层」验收闭环**：靠人工「像不像」，易漏菜单/配置/页面模板。  
4. **#2 四类模型、#3 CONFIG 读入未落地**。  
5. **git 无提交**（`main` 尚无 commit）— 二开记录无法回溯。

---

## 4. 架构定案（二开）

```text
┌─────────────────────────────────────────────────────────┐
│  NotionNext fork（主工程）                                │
│  pages/*  themes/*  conf/*  plugins/*  SEO/RSS/缓存壳    │
│         ↑ props: SiteData / post / NOTION_CONFIG 形状     │
│  lib/site/adapters/feishu/*   ← 新增（核心改动）          │
│  components/FeishuPage.tsx    ← 替换 NotionPage 正文位    │
│  lib/feishu/*                 ← 从 FeishuNext 迁入        │
└─────────────────────────────────────────────────────────┘
         ↑ 官方 OpenAPI
  ②内容表  ③CONFIG表  ①docx/wiki/media
```

### 4.1 替换面（只动这些）

| NotionNext 原件 | 替换为 |
|---|---|
| `lib/site/adapters/notion/*` 或 `fetchGlobalAllData` Notion 实现 | `adapters/feishu/*` |
| `components/NotionPage` + `react-notion-x` | `FeishuRenderer` 薄封装 `FeishuPage` |
| `blog.config` 的 `NOTION_PAGE_ID` 驱动 | 飞书 env：内容表 + CONFIG 表 + app 凭证 |
| Notion 图片 mapImageUrl | `/api/media/[token]` 或等价 |

### 4.2 尽量不改

- `themes/example` 及后续按需主题  
- 路由页：`index` / `archive` / `search` / `category` / `tag` / `page`  
- 缓存、ISR、revalidate、sitemap/RSS 框架  
- `siteConfig()` / `NOTION_CONFIG` **消费形态**（值由飞书 CONFIG 填）

### 4.3 中间模型对齐策略

目标：主题仍吃 NotionNext 的 `SiteData` 字段名（`allPages` `latestPosts` `customMenu` `NOTION_CONFIG`…）。

适配层负责：

| 飞书 | → NotionNext 字段 |
|---|---|
| 内容表·文章 + 分类展开 | `allPages` type=Post, status=Published |
| 内容表·页面 | type=Page |
| 内容表·菜单/子菜单 | `customMenu` / Menu+SubMenu |
| 无 slug | `slug = node_token` 或稳定 id |
| 无 status | 一律 Published（表无草稿则不过滤） |
| CONFIG 启用行 | `NOTION_CONFIG[KEY]=value` |
| docx blocks | `post` 上挂 `feishuContent`；渲染不走 blockMap |

**禁止：** 把飞书 JSON 转完整 `ExtendedRecordMap`。

---

## 5. 阶段与任务清单（按序执行）

> 原则：每阶段有**可勾选验收**，未过不进入下一阶段。  
> 记录：每阶段在 `docs/FORK_CHANGELOG.md` 追加条目（见 §7）。

### Phase 0 — 工程基线与记录（0.5～1 天）

- [ ] **P0.1** 选定主工程目录策略：  
  - 推荐：`Documents/FeishuNext` 清空为 NotionNext fork **或** 旁挂 `Documents/FeishuNext-fork`  
  - 写死在本文件「选定路径」一节（开工时填）  
- [ ] **P0.2** 从本地 NotionNext 复制/clone 为 fork 底；保留 MIT LICENSE 与原作者声明  
- [ ] **P0.3** 建立 git：首 commit = 上游干净底；第二 commit = 加 `docs/feishu/` 契约  
- [ ] **P0.4** 建立 `docs/FORK_CHANGELOG.md`、`docs/IMPLEMENTATION_PLAN.md`（本文）  
- [ ] **P0.5** 建立 env 映射表：`FEISHU_*` ↔ 原 `NOTION_*` / `blog.config`  
- [ ] **P0.6** 跑通上游 example 主题 demo（确认底可 build）

**验收：** fork 能 `yarn dev` 打开 example；git 有清晰历史。

---

### Phase 1 — 飞书 SDK 迁入（1 天）

- [ ] **P1.1** 迁入 `lib/feishu/{auth,client,bitable,docx,wiki,tree,media,normalize,board,embed-meta}.ts`  
- [ ] **P1.2** 迁入 `FeishuRenderer` + 必要 CSS（`notion.css` 中飞书阅读相关）  
- [ ] **P1.3** 迁入 `/api/media` `/api/board`（或 pages/api 等价）  
- [ ] **P1.4** 单元/脚本：token 获取、一条 bitable search、一篇 blocks 拉取（fixture 或 live）  
- [ ] **P1.5** 依赖：尽量不引入 `notion-client` 主路径（可暂留但死代码逐步删）

**验收：** 独立脚本能打印内容表 N 条 + 某 doc 标题与 block 数。

---

### Phase 2 — 适配器：三块数据 → SiteData（核心，2～3 天）

- [ ] **P2.1** 实现 `fetchSiteFromFeishu()`  
- [ ] **P2.2** 读 **#3 CONFIG-TABLE** → `NOTION_CONFIG` + siteInfo  
- [ ] **P2.3** 读 **#2 内容表**，按类型拆分：  
  - 菜单/子菜单 → customMenu  
  - 页面 → pages  
  - 文章 → posts  
  - 分类 → wiki children 展开并入 posts（带 category 名）  
- [ ] **P2.4** 解析「文档」列（URL / mention / token）→ `get_node` → `document_id`  
- [ ] **P2.5** 映射 `BasePage`/`NavPage` 必填字段（title/slug/type/status/href/date/summary/cover）  
- [ ] **P2.6** 详情：`getPost` / blocks 加载挂到 post，权限失败设 lock 标记  
- [ ] **P2.7** 缓存键与 revalidate 对齐 NotionNext 习惯  
- [ ] **P2.8** 从 `fetchGlobalAllData` 或 adapter 注册处切换默认源为 feishu（env 开关 `CMS_PROVIDER=feishu`）

**验收（脚本/页面）：**

| 检查项 | 通过标准 |
|---|---|
| 菜单 | 顶栏出现内容表配置的菜单项 |
| 文章列表 | 文章行 + 分类展开子文均出现 |
| 文章详情 | 200，有正文块 |
| 页面 | 独立 slug 可开 |
| CONFIG | TITLE/AUTHOR 与表一致（启用行） |
| 无权限文 | PostLock 不崩站 |

---

### Phase 3 — 正文渲染接入主题（1～2 天）

- [ ] **P3.1** 新增 `components/FeishuPage.tsx`（props 兼容 post）  
- [ ] **P3.2** `themes/example` 中 `NotionPage` → `FeishuPage`（仅 example 先改）  
- [ ] **P3.3** Announcement 等引用 NotionPage 的点一并替换或条件分支  
- [ ] **P3.4** TOC：用 normalize 的 headings 喂侧栏 Catalog  
- [ ] **P3.5** 封面：document meta.cover → pageCoverThumbnail  
- [ ] **P3.6** 对照 `docs/PARITY_STATUS.md` 清单回归壳层 class

**验收：** example 主题下首页 + 文章页视觉对照 preview example；`verify` 脚本绿。

---

### Phase 4 — 路由与站点能力对齐（1～2 天）

- [ ] **P4.1** 首页列表 / 分页  
- [ ] **P4.2** archive 按月  
- [ ] **P4.3** search  
- [ ] **P4.4** category / tag（有数据才显示；分类来自内容表「分类」+ 可选标签字段）  
- [ ] **P4.5** 404 / PostLock  
- [ ] **P4.6** sitemap / RSS / robots / 可选 llms.txt  
- [ ] **P4.7** 暗色 / 分享栏 / 上下篇（主题自带则只保证数据字段够）

**验收：** 路由清单全部 200；无飞书凭证时有明确错误页或 demo 开关。

---

### Phase 5 — 飞书能力增强（二期，可排期）

- [ ] **P5.1** 封面稳定 + 列表卡片图  
- [ ] **P5.2** 图标：继续挖 API 或内容表图标列兜底  
- [ ] **P5.3** 密码/加密：权限失败体验打磨（不做表内 password 伪加密除非明确要求）  
- [ ] **P5.4** 评论：飞书文档评论 API 或保留 Twikoo 配置位  
- [ ] **P5.5** 更多 block：公式增强、未覆盖 embed  
- [ ] **P5.6** 第二主题（如 simple/gitbook）— 仅换 NotionPage 引用点  

---

### Phase 6 — 清理与产品化（持续）

- [ ] **P6.1** 旧 FeishuNext 手搓页面标记 deprecated 或归档到 `legacy/`  
- [ ] **P6.2** README 重写：飞书配置步骤 + 与 NotionNext 差异  
- [ ] **P6.3** 删除/隔离 notion-client 主路径依赖（减小包体）  
- [ ] **P6.4** 自动化：`yarn verify:feishu`（路由+关键 DOM+可选截图）  
- [ ] **P6.5** 首次有意义的 tag：`v0.1.0-feishu`

---

## 6. 明确不做 / 延后（防范围膨胀）

| 项 | 原因 |
|---|---|
| 伪造 recordMap | 长期兼容税 |
| 25 主题一期全开 | 工作量爆炸；先 example |
| 网页端 protobuf 主路径 | 不稳定 |
| 内容表恢复 Notion 全字段 | 与用户简化模型冲突 |
| 自定义 slug 强制 | 用户已定 node_token |
| 发布状态强依赖 | 用户已定可见即发布 |
| Live2D / busuanzi 等 | 非核心 |

---

## 7. 二开记录规范（强制）

### 7.1 文档

| 文件 | 用途 |
|---|---|
| `docs/IMPLEMENTATION_PLAN.md` | 本文：目标与任务总表 |
| `docs/FORK_CHANGELOG.md` | 每次改动：日期/阶段/文件/原因/风险 |
| `docs/feishu/*` | 从现仓库迁入的契约，SSOT |
| `docs/UPSTREAM.md` | 上游 NotionNext 版本、commit、许可证 |

### 7.2 Git

- 分支：`main` = 可运行飞书版；`upstream/*` 可选跟踪上游  
- 提交信息前缀：`feishu:` `theme:` `docs:` `chore:`  
- **禁止**大范围格式化与业务混提  
- 每完成一个 Phase 打 tag：`phase-0` …  

### 7.3 变更原则

1. 主题目录尽量零逻辑，只换 import  
2. 业务判断只在 `adapters/feishu`  
3. 新能力先写契约再写代码  
4. 发现与契约冲突 → **先改文档再改代码**，并记 CHANGELOG  

---

## 8. 环境与验收资产（已有）

### 8.1 Live 飞书资源

| 用途 | 链接/ID |
|---|---|
| 内容表 #2 | https://test-d2al261ggga5.feishu.cn/wiki/D6khw3w32iSKkfkiLFUcOoDenMd · `TafHbLNMTazT6NsnFgEcTry6n8c` / `tbl6eQEHZ6ShGBk5` |
| 配置表 #3 | https://test-d2al261ggga5.feishu.cn/wiki/Xk8gw3V1fiBzTukezRAcnylpn63 · `JGShbeVp9aGGV3s2J4qcMmGAn0b` / `tbl4qPlVgMLg5eaH` |
| 示例文档根/树 | list root 曾用 `AHHowAmX9itAKWkHvWOcqQOPneg` |
| 对照 Notion 配置页 | https://tanghh.notion.site/8f4fe6b17a9e43e0bcfb6edb50f10a62 |
| 对照 Notion 内容库 | https://tanghh.notion.site/02ab3b8678004aa69e9e415905ef32a5 |

### 8.2 验收清单（总）

```text
[ ] yarn build 通过
[ ] / 200 有文章列表
[ ] /article 或等价文章路由 200 有 Feishu 正文
[ ] 菜单来自内容表
[ ] CONFIG TITLE 生效
[ ] 分类展开文章出现
[ ] 页面类型独立可访问
[ ] 无权限文 PostLock
[ ] /archive /search /category /tag 不 500
[ ] sitemap + rss 200
[ ] example 主题 DOM：theme-example / titlebar / posts-wrapper
```

---

## 9. 风险与缓解

| 风险 | 缓解 |
|---|---|
| NotionNext 版本新、Pages Router 与现 FeishuNext App Router 不一致 | 二开跟上游 Pages，不把旧 app/ 当主 |
| 主题深绑 blockMap 字段 | 适配层给默认值；渲染走 FeishuPage |
| 内容表 mention 字段形态不一 | 统一 parser + 样本 JSON 测 |
| 子菜单挂靠规则弱 | 约定「顺序紧跟」或加父菜单列（改契约） |
| 权限遗漏导致空站 | 启动时 health 检查 + 明确报错 |
| 范围再次膨胀 | 只执行本文 checklist；新增项必须改本文 |

---

## 10. 推荐开工顺序（你确认后执行）

1. **Phase 0** 落 fork 工程与 git 记录  
2. **Phase 1** 迁飞书 SDK  
3. **Phase 2** 三块数据适配（**最关键**）  
4. **Phase 3** example 正文替换  
5. **Phase 4** 路由验收  
6. Phase 5+ 增强  

**开工前你只需确认两件事：**

1. 主工程放哪：覆盖当前 `FeishuNext` 还是旁挂新目录？  
2. 是否锁定「只做 example 主题一期」？

确认后按 Phase 0 开干，不再并行开第三条架构路线。

---

## 11. 选定路径（开工时填写）

| 项 | 选择 |
|---|---|
| 主工程路径 | _待填_ |
| 上游 NotionNext 版本/commit | 4.10.3 / _待填_ |
| 一期主题 | example（建议锁定） |
| CMS 开关 | `CMS_PROVIDER=feishu` |
| 旧 FeishuNext 代码 | 迁 `lib/feishu` + 归档其余 |

---

## 12. 与历史讨论的对齐声明

| 历史摇摆 | 本计划定案 |
|---|---|
| 手搓 FeishuNext 壳 | 停止作为主路径 |
| example 组件仿写 | 仅参考；壳以 fork 内 themes/example 为准 |
| 纯 list-root 无表 | 降为「分类展开」子能力 |
| 全字段 Notion 镜像表 | 否；用用户简化 #2 |
| NotionNext 二开换数据 | **是，唯一主路径** |

---

## 13. 2026-07-23 用户澄清（计划修订，仍未开工）

### 13.1 主工程位置

- **定：** 旁挂新目录（与当前 `Documents/FeishuNext` 并列），不覆盖旧仓。  
- 旧仓定位：飞书 SDK / 契约 / 样本 / 历史半成品，**迁入后只读参考**。  
- 新仓命名建议（开工时二选一）：`FeishuNext-app` 或 `notionnext-feishu`。

### 13.2 主题策略（修订）

**用户意图：** 一期不必“锁死只做一个主题”；理想是数据层适配后，官方/社区主题都能用，降低后续维护。

**技术定论（基于上游源码实测）：**

| 判断 | 说明 |
|---|---|
| 架构上可多主题 | NotionNext 用 `themes/theme.js` 动态加载主题；`THEME` / `?theme=` 切换 |
| 主题几乎都依赖 `NotionPage` | 约 20+ 主题的 `index.js` / Announcement 引用 `@/components/NotionPage` |
| 部分主题还摸 `blockMap` | 列表卡片摘要、Announcement 等少数文件直接读 `post.blockMap` |
| 因此 | **不是“只换 adapter 就 100% 全主题零改”**，但 **换共享 `NotionPage` + 补齐 SiteData 字段后，大部分主题可“开箱可用”** |

**修订后的策略（比“锁 example”更贴你的目标）：**

1. **目标态（对）：** 数据层 + 统一正文组件适配好 → 多主题可切换；上游新主题只要仍走 `NotionPage`/`SiteData`，维护成本低。  
2. **验收策略（不是锁死交付一个主题）：**  
   - 主验收主题：`example`（布局简单、对照文档多）  
   - 冒烟主题：至少再开 `simple` + `gitbook`（博客 + 文档站两种形态）  
   - 其余主题：不逐个像素验收，只保证不 500、正文能出  
3. **实现关键（决定能不能“全主题”）：**  
   - **优先改共享层**：`components/NotionPage.js` → 内部转调 `FeishuRenderer`（或同文件条件渲染），而不是每个 themes/* 改一遍  
   - 对仍读 `blockMap` 的卡片：适配层给安全空值 / 用 `summary`/`plainText` 兜底，必要时小补丁  
4. **不能承诺的：** 每个主题每个插件像素级 1:1；依赖 Notion 特有块预览的卡片可能降级为摘要文字。

### 13.3 记录方式

- **主记录：Git**（commit / tag / PR 描述）。  
- **文档只保留“怎么干”**：`IMPLEMENTATION_PLAN.md` + 迁入的 feishu 契约。  
- **弱化**独立 `FORK_CHANGELOG.md` 流水账；如需可删或改成“Git 约定一页纸”。

### 13.4 “上游更新模板也能用”——是否可行？

**大体可行，有条件。**

```text
可行部分：
  上游只改主题样式/布局，仍吃 SiteData + NotionPage
  → 你 merge 上游 themes/*，数据层不动，新主题往往直接可用

需要你跟进的部分：
  上游改了 SiteData 字段 / 配置 key / NotionPage props
  → 适配层要对齐
  上游主题开始深度依赖 recordMap 内部结构做特效
  → 该主题要小补丁或降级

不可自动继承的部分：
  上游“新增一种依赖 Notion 数据库属性的运营功能”
  → 飞书侧无对应物时仍要兼容或砍掉
```

所以你的直觉对：**维护成本主要在数据适配层；主题跟上游，比自己维护 25 套壳便宜。**  
不是零成本，但是正确的省维护结构。

### 13.5 仍待你拍板（开工前）

| # | 问题 | 建议默认 |
|---|---|---|
| 1 | 旁挂目录名 | `Documents/notionnext-feishu` |
| 2 | 默认主题 | `example`（可 `?theme=simple` 切换） |
| 3 | 一期冒烟主题 | example + simple + gitbook |
| 4 | 旧 FeishuNext 仓 | 保留不删，只迁代码进新仓 |
| 5 | 记录 | Git only；计划文档保留 |

确认以上默认即可进入 Phase 0（仍等你说开干）。
