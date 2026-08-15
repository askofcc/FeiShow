# FeishuNext 总览（通读即懂）

> **读这一份，应能回答：** 项目为什么存在、现在长什么样、核心怎么跑、仓库为什么曾经很乱、以后做什么。  
> 细节契约仍链到其它文档；本文是目录与叙事主线。  
> 更新日期：2026-07-28  
> 本地目录：`/Users/qiushuanglong/Documents/FeishuNext`（见 [LOCAL_WORKSPACE.md](./LOCAL_WORKSPACE.md)）  
仓库：[askofcc/FeishuNext](https://github.com/askofcc/FeishuNext) · 演示：[feishunext.srint.cn](https://feishunext.srint.cn/)

---

## 0. 三十秒版

```text
人在飞书写内容（文档 + 多维表格）
        ↓ 官方 OpenAPI（必须鉴权）
FeishuNext 清洗成「展示向」结构化数据
        ↓
NotionNext 风格的站点壳（主题 / SEO / 列表 / 阅读）
        ↓
独立站 https://feishunext.srint.cn/
```

| 问题 | 答案 |
|---|---|
| 是什么 | 飞书当 CMS 的公开站点系统 |
| 不是什么 | 不是飞书编辑器；不是官方 NotionNext |
| 灵魂 | 把飞书「编辑态 JSON」变成「展示态结构」 |
| 前端从哪来 | 基于 NotionNext（MIT）二开主题与壳 |
| 数据从哪来 | 飞书 OpenAPI + 自研 adapter |
| 现在主线 | 数据结构化 + 站点可读 |
| 以后 | AI 就绪（检索/摘要/Agent 引用），不抢当前主线 |

---

## 1. 从讨论到立项：为什么做

### 1.1 起点（历史讨论的结论）

最初对标的是 Notion 生态里的 **NotionNext**：Notion 写作 → 独立站。  
飞书侧有相似需求痕迹，但没有同等级「飞书 → 公开站」产品。

中间走过几条弯路，后来收束为：

1. **不要**伪造完整 Notion `recordMap` 喂 `react-notion-x`（长期最痛）。  
2. **要**复用 NotionNext 的站点体验（主题、SEO、列表/阅读信息架构）。  
3. **要**按飞书现实建模：文档几乎无自定义属性；列表靠多维表格或父文档子树。  
4. 公开分享 ≠ 免鉴权 JSON API；产品主路径必须是 **OpenAPI + 应用授权**。

### 1.2 核心痛点（产品灵魂）

飞书文档 API 返回的 JSON **为编辑、协同、权限设计**，不是为外部展示优化：

- 嵌套深、标记多、人读不动  
- 直接给前端/AI 用，易读性与稳定性都差  

### 1.3 核心价值

**只做展示场景需要的清洗与重组：**

```text
飞书复杂 JSON → 结构化中间模型 → 站点（人读）→（未来）AI 出口（机读）
```

官方强在「写与管」；我们补「对外 Web 资产」。  
详述：[PROJECT_SOUL.md](./PROJECT_SOUL.md)

### 1.4 内容组织（飞书简化模型）

相对 Notion「一行=一页+一堆属性」，飞书侧定为：

| # | 块 | 载体 | 干什么 |
|---|---|---|---|
| ① | 文档正文 | Docx + Wiki 节点 | 一篇长什么样 |
| ② | 内容配置 | 多维表格 | 菜单/文章/页面/**分类父页展开** |
| ③ | 站点配置 | CONFIG 表（名/值/启用） | TITLE、开关等 |

分类行只挂**父文档**，子文自动从 wiki 树拉出——这是相对 Notion 的简化优势。  
详述：[PROJECT_BASELINE.md](./PROJECT_BASELINE.md)、[FEISHU_CONTENT_TABLE_CONTRACT.md](../feishu/FEISHU_CONTENT_TABLE_CONTRACT.md)

---

## 2. 现在项目结构（代码 + 文档）

### 2.1 运行时数据流

```text
.env / CONFIG 表
      │
      ▼
lib/feishu/*          auth, bitable, wiki, docx, media, normalize
      │
      ▼
lib/site/adapters/feishu/*
      fetchSiteFromFeishu()  → SiteData（列表/菜单/配置）
      enrichFeishuPost()     → post.feishuContent + toc
      │
      ▼
pages/*  getStaticProps / resolvePostProps
      │
      ▼
themes/*  Layout* 只吃 props
      │
      ▼
正文：NotionPage →（飞书时）FeishuPage → FeishuRenderer
```

**主题禁止**直接请求飞书 API；**禁止**把 `blockMap` 当 Notion recordMap 用。  
契约：[THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md)

### 2.2 目录职责（改代码时看这张表）

| 路径 | 归属 | 说明 |
|---|---|---|
| `lib/feishu/` | **自有** | OpenAPI 与结构化 |
| `lib/site/adapters/feishu/` | **自有** | 主题可用的 SiteData |
| `components/feishu/` `FeishuPage.js` | **自有** | 正文渲染 |
| `pages/api/feishu/` | **自有** | 图片/画板代理 |
| `docs/feishu/` | **自有** | 产品与数据真理源 |
| `themes/` `pages/` 大部分 | **上游壳** | 可跟随 NotionNext 更新 |
| `docs/user-guide/` `GOVERNANCE*` 等 | **上游遗留** | 不是 FeishuNext 运营文档 |
| `docs/upstream/` | 备份 | 原版 NotionNext README |

更短地图：[../REPO_MAP.md](./REPO_MAP.md)

### 2.3 主题能用的数据（摘要）

| 场景 | 字段 |
|---|---|
| 列表 | `posts` / `latestPosts`：`title` `href` `slug` `summary` `category` `tags` `pageCoverThumbnail` |
| 详情 | `post` + `feishuContent` + `toc` + `accessError` |
| 导航 | `customMenu` |
| 配置 | `siteConfig('KEY', default, props.NOTION_CONFIG)` |
| 正文组件 | **唯一** `<NotionPage post={post} />` |

`slug` 在飞书路径下默认是 **wiki `node_token`**（稳定，不靠自定义 slug）。

### 2.4 环境与演示

```bash
CMS_PROVIDER=feishu
FEISHU_APP_ID / FEISHU_APP_SECRET
FEISHU_CONTENT_*   # 内容表
FEISHU_CONFIG_*    # CONFIG 表
NEXT_PUBLIC_LINK=https://feishunext.srint.cn/
NEXT_PUBLIC_THEME=example
```

模板：根目录 `.env.feishu.example`

---

## 3. 仓库与分支为什么「乱」、现在怎么管

### 3.1 乱从哪来

| 来源 | 现象 | 是否我们的锅 |
|---|---|---|
| 从 NotionNext **整仓 clone** | 根目录上百文件、25 主题、上游 user-guide/治理文档 | 二开必然带上；用文档分区，不靠删光 |
| `git fetch upstream` **默认拉全部分支** | `git branch -a` 出现 200+ `upstream/codex/*` `upstream/deploy/*`… | **不是本产品分支**，是上游远程引用 |
| 本地曾有多条线 | `main`（上游旧快照）、`feishu/main`（产品）、`feishu-export`（早期导出） | 命名不清时会懵 |
| origin 上旧导出 | `origin/main` 可能仍是早期 private export，落后于本地 `feishu/main` | 需 push 对齐 |

### 3.2 当前约定的分支模型（已整理）

| 分支 / 引用 | 含义 | 你日常 |
|---|---|---|
| **`main`** | **FeishuNext 产品主线**（当前应在这开发） | 默认工作分支 |
| `main`（本地） | clone 时的上游历史锚点，**不是**飞书产品线 | 一般别在这写功能 |
| `origin/main` | GitHub 产品远程 | `git push origin main` |
| `origin/main` | 远程默认分支；可能仍是旧导出 | 可按需改默认分支或快进合并 |
| `upstream/main` | NotionNext 官方主线（**只读跟踪**） | 仅同步前端时 fetch |

**已做清理：**

- `upstream` 的 fetch 限制为 **只跟踪 `main`**，去掉上百条无关 remote-tracking 分支噪音  
- 删除过时本地分支 `feishu-export`（若存在）

以后若再出现上百 `upstream/*`：

```bash
git config remote.upstream.fetch '+refs/heads/main:refs/remotes/upstream/main'
git fetch upstream --prune
```

### 3.3 推荐日常命令

```bash
# 开发
git checkout main
# …

# 推自己的产品线（私有仓）
git push -u origin main

# 看上游前端更新（不自动合并）
git fetch upstream
git log main..upstream/main --oneline -- themes components | head
```

同步策略细节：[UPSTREAM.md](./UPSTREAM.md)

### 3.4 和「两个本地目录」的关系

| 路径 | 角色 |
|---|---|
| `Documents/FeishuNext` | **真正开发树**（git = askofcc/FeishuNext） |
| `Documents/FeishuNext` | 早期半成品；见其中 `MOVED.md`，勿再当主仓 |

---

## 4. 已经做成什么 / 还没做什么

### 4.1 已具备（主路径）

- 飞书鉴权 + 内容表 + CONFIG 表驱动站点  
- 分类父页展开子文档  
- Docx blocks → normalize → FeishuRenderer  
- 媒体代理、权限失败可提示  
- NotionNext 主题壳可切换（example 主验）  
- 产品品牌默认 FeishuNext / 演示域；LICENSE 保留上游版权  
- 契约文档集中在 `docs/feishu/`

### 4.2 明确后置 / 不做（防范围膨胀）

| 项 | 态度 |
|---|---|
| 伪造 recordMap | 不做 |
| 网页 protobuf 当主数据源 | 不做 |
| 25 主题像素级 1:1 | 不做 |
| Notion 全字段镜像（密码属性等） | 不做或降级 |
| **AI 就绪**（检索、摘要、llms、Agent） | **后置**：等结构稳 |

### 4.3 未来路线（由粗到细）

**P0 — 结构与稳定（当前主线）**

- 内容表/CONFIG/正文契约与实现一致  
- 列表、详情、菜单、分类展开回归稳定  
- 封面/图标等展示字段按官方能力补齐（有则用）  
- 主题只消费 `THEME_DATA_CONTRACT`，AI 开新主题可照做  

**P1 — 产品完整度**

- 部署文档（Vercel 等）以飞书变量为准  
- 演示站与私有仓 README 长期一致  
- 按季选择性合并 upstream **themes/壳**（不合并 Notion 数据层）  
- 清理或归档更多上游 user-guide 噪音（可选）  

**P2 — AI 就绪（立项后才开任务）**

- 稳定 Markdown/纯文本/JSON 内容出口  
- 标题+锚点+来源 URL 的引用结构  
- `llms.txt` / 检索分块等  
- **前提：** P0 中间模型稳定，不在原始飞书 JSON 上堆 AI  

---

## 5. 核心概念词表

| 词 | 含义 |
|---|---|
| `node_token` | 知识库节点 ID，常作 URL slug |
| `obj_token` / `documentId` | 真正拉 docx 正文的 ID |
| 内容表 | 站里有什么（菜单/文章/页面/分类） |
| CONFIG 表 | 站叫什么、开哪些开关 |
| `SiteData` | 主题看到的全站 props 包 |
| `feishuContent` | 详情页结构化正文（非 recordMap） |
| `CMS_PROVIDER=feishu` | 走飞书适配，不走 Notion 主路径 |
| upstream | NotionNext 官方，只读同步前端 |

---

## 6. 文档索引（按阅读顺序）

| 顺序 | 文档 | 用途 |
|---|---|---|
| 0 | [DECISION_LOG.md](./DECISION_LOG.md) | **讨论共识与运维注意（回看决策）** |
| 1 | **本文 PROJECT_GUIDE** | 全局叙事 |
| 2 | [PROJECT_SOUL.md](./PROJECT_SOUL.md) | 痛点与价值 |
| 3 | [PROJECT_BASELINE.md](./PROJECT_BASELINE.md) | 三块数据与边界 |
| 4 | [STABLE_FEISHU_DATA.md](../feishu/STABLE_FEISHU_DATA.md) | API 主路径 |
| 5 | [THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md) | 主题/AI 怎么调数据 |
| 6 | [UPSTREAM.md](./UPSTREAM.md) | 怎么跟前端上游 |
| 7 | [../REPO_MAP.md](./REPO_MAP.md) | 目录地图 |
| 8 | 根 [README.md](../../README.md) | 克隆与启动 |

单篇文档字段、块映射、验收记录等：同目录其它 `FEISHU_*.md`、`PHASE4_VERIFY.md`。

---

## 7. 一句话收束

> **FeishuNext = 飞书展示向结构化数据层 + NotionNext 站点壳。**  
> 分支上请盯住 **`main`**；上游上百条 remote 分支是 NotionNext 的历史，不是我们的功能分支。  
> 现在把结构做对；AI 就绪是同一结构上的下一章，不是另一条产品。
