# FeishuNext 可执行任务清单

> 主工程：`/Users/qiushuanglong/Documents/notionnext-feishu`  
> 旧仓参考：`/Users/qiushuanglong/Documents/FeishuNext`  
> 记录：以 Git commit 为准；本文只列任务与验收。

## 已锁定决策

| 项 | 决定 |
|---|---|
| 主工程 | 旁挂 `notionnext-feishu`（NotionNext 二开） |
| 旧仓 | 保留，迁 SDK/契约后只读 |
| 主题 | 共享 `NotionPage` 适配 → 多主题可开；主验 example，冒烟 simple+gitbook |
| 数据 | ①文档 ②内容表 ③CONFIG 表 |
| 不做 | 伪造 recordMap；protobuf 主路径；一期 25 主题像素验收 |

## Phase 0 — 工程基线

- [x] 旁挂目录 clone NotionNext
- [x] remote `upstream` = GitHub NotionNext
- [x] 分支 `feishu/main`
- [x] 迁入 feishu 契约 docs
- [x] yarn install（npx yarn@1.22.22）+ next 可用
- [x] 首批 commit：docs + 说明
- [x] `.env.feishu.example` + 本地 `.env.local`

**验收：** `yarn dev` 能起（Notion 默认 demo 亦可）；契约在 `docs/feishu/`。

## Phase 1 — 飞书 SDK 迁入

- [x] `lib/feishu/*` 已迁入
- [x] `components/feishu/FeishuRenderer.tsx` + `FeishuPage`
- [x] `pages/api/feishu/media|board`
- [x] `scripts/feishu-probe.mjs` live 通过

**验收：** 脚本 live 打印内容表条数与示例文章 title。

## Phase 2 — Adapter（核心）

- [x] `lib/site/adapters/feishu/*`
- [x] 读 CONFIG 表 → NOTION_CONFIG
- [x] 读内容表 → 菜单/文章/页面/分类展开
- [x] `CMS_PROVIDER=feishu` 切换
- [x] 详情 blocks + accessError

**验收：** 首页列表来自飞书；菜单可配置；文章详情有正文。

## Phase 3 — 正文接入主题

- [x] 共享 `NotionPage` 内部转 FeishuRenderer
- [x] TOC：post.toc ← feishuHeadings；cover token 已映射
- [x] example 主路径：首页+文章 200 live

**验收：** example 主题文章页可读；`?theme=simple` 不 500。

## Phase 4 — 站点能力 + 冒烟

- [x] archive/search/category/tag/sitemap/rss 200
- [x] example/simple/gitbook 热路径 DOM id 正确
- [x] FEISHU.md + PHASE4_VERIFY.md

**验收：** 路由清单 200；三主题冒烟通过。

## Live 资源

| 用途 | ID/URL |
|---|---|
| 内容表 | `TafHbLNMTazT6NsnFgEcTry6n8c` / `tbl6eQEHZ6ShGBk5` |
| CONFIG | `JGShbeVp9aGGV3s2J4qcMmGAn0b` / `tbl4qPlVgMLg5eaH` |
| App | 见旧仓 `.env.local`（不入库） |

## 效果预期（一期结束）

用户配置飞书应用 + 两张表后，得到 NotionNext 级站点壳，内容来自飞书；可切换主题；上游 themes 可 merge 复用（适配层偶发跟进）。


## Phase 4 结论

见 [PHASE4_VERIFY.md](./PHASE4_VERIFY.md)。主路径已通过。
