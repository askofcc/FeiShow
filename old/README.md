# old/ — 与当前产品主线无关的上游遗留

从仓库根上挪出来的 **NotionNext 文档站、治理包装、维护脚本、自动流程**。  
**不是**运行中的前端，也不是飞书数据层。

主产品日常只看：

- 根目录 `README.md`
- `docs/feishu/`
- `docs/internal/`
- `docs/deploy/`

## 为什么有些 Notion 后端代码还在原位

下面这些 **不能** 简单搬进 `old/`，否则现成前端会在启动时 import 失败：

| 仍留在主树 | 原因 |
|---|---|
| `themes/` `pages/` `components/` | 我们用的就是这套前端 |
| `conf/*`（含 `notion.config.js`） | `blog.config.js` 会 `require`，主题读 `siteConfig` |
| `lib/db/notion/` | `SiteDataApi.js` 仍静态引用；运行主路径是飞书，但模块还在 |
| `lib/feishu/` `lib/site/adapters/feishu/` | 当前后端主线 |
| `next-sitemap.config.js` | `post-build` 还在用 |

要拆 Notion 后端代码，需要先改 `SiteDataApi.js` 的 import，再搬。那是下一步，不是这次。

## 这里有什么

| 目录 | 原来是什么 |
|---|---|
| `docs/user-guide` `docs/developer` `docs/community` | NotionNext 官方文档站内容 |
| `docs/upstream` `docs/performance` | 上游 README 备份、性能备忘 |
| `docs/internal-history/` | 本项目阶段计划 / 清单（过程稿） |
| `docs/vitepress-public/` | 原 VitePress 文档站静态资源 |
| `docs/public-legacy/` | 上游文档配图（体积大，仅归档） |
| `root-docs/` | 根上 GOVERNANCE / MAINTAINERS / 英文 README / 重复的 `FEISHU.md` |
| `vitepress/` | 上游文档站构建（原 `.vitepress`） |
| `scripts/` | 文档迁移、翻译、主题文档、质量检查、版本 bump 等 |
| `github/` | Dependabot、上游同步、GHCR、FUNDING、旧 Issue/PR 模板 |
| `config-examples/` | 原 `.env.example`（Notion `NOTION_PAGE_ID`）、`netlify.toml` |

飞书环境变量模板仍在根上：`.env.feishu.example`。

## 2026-08-15 再收两层

**会自动造分支 / 和产品入口重复：**

| 文件 | 原因 |
|---|---|
| `github/dependabot.yml` | 每周自动开依赖升级分支 |
| `github/bump-version-on-main.yml` | 每次推 main 再建 `chore/bump-package-version` |
| `github/sync.yaml` | 每天尝试把上游 NotionNext 合进来 |
| `github/pushUrl.yml` + `scripts/pushUrl.py` | 上游百度推送 |
| `root-docs/FEISHU.md` | 与根 README 重复 |
| `lighthouserc.js` / `validation-report.json` | 上游性能脚手架 |

**跟 FeishuNext 日常开发无关的包装：**

| 文件 | 原因 |
|---|---|
| `scripts/health-check.js` 等 | 上游维护脚本；`package.json` 对应命令已删 |
| `github/docker-ghcr.yaml` | 每次推 main 打 GHCR 镜像，当前不发镜像 |
| `github/CODEOWNERS` | 指向上游 `@tangly1024` |
| `github/ISSUE_TEMPLATE/*`、`pull_request_template.md` | 把人送到 NotionNext Discussions |
| `config-examples/netlify.toml` | 产品走 Vercel |
| `docs/vitepress-public/` | 文档站已不构建 |
| `__tests__/scripts/translate/` | 上游文档翻译单测，脚本已不在主树 |

产品入口只认根目录 `README.md`。

## VitePress 整套已归档（不再构建）

产品不用 GitHub / VitePress 文档站。相关文件都在 `old/`：

| 路径 | 原来是什么 |
|---|---|
| `vitepress/` | 原 `.vitepress` 主题与配置 |
| `docs/vitepress-public/` | 文档站静态资源 |
| `github/deploy-docs-site.yml` | 上游文档站 workflow |
| `scripts/generate-theme-user-docs.mjs` | 给 VitePress 生成主题文档 |

根目录 `package.json` 已去掉 `vitepress` 依赖；CI 不再跑 `docs:site:build`。

