# old/ — 与当前产品主线无关的上游遗留

这里是从仓库根上挪出来的 **NotionNext 文档站、治理包装、文档迁移脚本**。  
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

要拆 Notion 后端代码，需要先改 `SiteDataApi.js` 的 import，再搬。那是下一步，不是这次。

## 这里有什么

| 目录 | 原来是什么 |
|---|---|
| `docs/user-guide` `docs/developer` `docs/community` | NotionNext 官方文档站内容 |
| `docs/upstream` `docs/performance` | 上游 README 备份、性能备忘 |
| `root-docs/` | 根上 GOVERNANCE / MAINTAINERS / 英文 README 等 |
| `vitepress/` | 上游文档站构建（原 `.vitepress`） |
| `scripts/` | 文档迁移、翻译、主题文档生成等 |
| `github/` | FUNDING、讨论区模板、docs-site workflow |
| `config-examples/` | 原 `.env.example`（Notion `NOTION_PAGE_ID` 主路径） |

飞书环境变量模板仍在根上：`.env.feishu.example`。
