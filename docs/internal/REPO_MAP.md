# 仓库地图（FeishuNext）

> 解决「clone 下来不知道先看哪」的问题。

## 优先阅读（FeishuNext 自有）

| 路径 | 说明 |
|---|---|
| [README.md](../README.md) | 产品入口 |
| [feishu/PROJECT_GUIDE.md](./feishu/PROJECT_GUIDE.md) | 结构总览 |
| [feishu/DECISION_LOG.md](./feishu/DECISION_LOG.md) | **决策/共识/运维（回看讨论）** |
| [docs/feishu/PROJECT_SOUL.md](./feishu/PROJECT_SOUL.md) | 为什么做 |
| [docs/feishu/THEME_DATA_CONTRACT.md](./feishu/THEME_DATA_CONTRACT.md) | 主题如何用数据 |
| [docs/feishu/STABLE_FEISHU_DATA.md](./feishu/STABLE_FEISHU_DATA.md) | 飞书 API 主路径 |
| [docs/feishu/UPSTREAM.md](./feishu/UPSTREAM.md) | 如何跟 NotionNext 前端 |
| [FEISHU.md](../FEISHU.md) | 开发速查（可与 README 互补） |
| `.env.feishu.example` | 环境变量模板 |

## 自有代码（改飞书逻辑时动这里）

| 路径 | 说明 |
|---|---|
| `lib/feishu/` | OpenAPI 客户端与 normalize |
| `lib/site/adapters/feishu/` | SiteData 组装 |
| `components/FeishuPage.js` / `components/feishu/` | 正文 |
| `pages/api/feishu/` | 媒体代理 |
| `scripts/feishu-*.mjs` / `phase4-verify.mjs` | 探测与验收 |

## 二开基座（尽量少改，可跟 upstream）

| 路径 | 说明 |
|---|---|
| `themes/` | 主题 |
| `pages/` | 路由壳（已接 feishu 分支的除外） |
| `components/` | 通用 UI（PoweredBy/SEO 已产品化） |
| `conf/` / `blog.config.js` | 配置 |

## 上游遗留（不要当 FeishuNext 文档）

| 路径 | 说明 |
|---|---|
| `docs/user-guide/` | NotionNext 用户指南 |
| `docs/developer/` 部分 | 上游开发者文档 |
| `GOVERNANCE*` `MAINTAINERS*` `CONTRIBUTING*` | 上游社区治理 |
| `docs/upstream/` | 我们备份的上游 README |
| `PROJECT_COMPLETION_REPORT.md` 等根目录报告 | 上游工程产物 |

贡献 FeishuNext：开 Issue/PR 到 **askofcc/FeishuNext**，不要按上游 CONTRIBUTING 往 notionnext-org 提。


## 分支怎么看

| 名字 | 是什么 |
|---|---|
| `feishu/main` | FeishuNext 产品线（日常开发） |
| `main`（本地） | 历史上游锚点，勿当产品默认 |
| `upstream/main` | NotionNext 官方主线（只读） |
| `origin/*` | GitHub askofcc/FeishuNext |

曾经 `git branch -a` 刷屏：因为 `fetch upstream` 默认拉了上游**全部**远程分支（deploy/codex/release…）。  
现已限制为只获取 `upstream/main`。详情见 [feishu/PROJECT_GUIDE.md](./feishu/PROJECT_GUIDE.md) §3。
