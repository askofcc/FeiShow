# 仓库地图

本地目录与分支纪律见 [LOCAL_WORKSPACE.md](./LOCAL_WORKSPACE.md)。

## 先读

| 路径 | 说明 |
|---|---|
| [README.md](../../README.md) | 产品入口 |
| [PROJECT_SOUL.md](./PROJECT_SOUL.md) | 为什么做 |
| [NEXT_FRAMEWORK.md](./NEXT_FRAMEWORK.md) | 做到哪、下一步 |
| [../feishu/AGENT_API.md](../feishu/AGENT_API.md) | JSON / Markdown 出口 |
| [../feishu/THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md) | 主题怎么调数据 |
| [../feishu/STABLE_FEISHU_DATA.md](../feishu/STABLE_FEISHU_DATA.md) | 飞书 API 主路径 |
| [../deploy/feishu-minimal.md](../deploy/feishu-minimal.md) | 部署 |
| [UPSTREAM.md](./UPSTREAM.md) | 怎么跟 NotionNext |
| `.env.feishu.example` | 环境变量 |

## 改飞书逻辑时动这里

| 路径 | 说明 |
|---|---|
| `lib/feishu/` | OpenAPI、normalize、`contentToMarkdown` |
| `lib/site/adapters/feishu/` | SiteData 组装 |
| `lib/agent/` | 列表/单篇投影 |
| `components/FeishuPage.js` / `components/feishu/` | 正文 HTML |
| `pages/api/agent/` | 机器出口 |
| `pages/api/feishu/` | 媒体与 health |

## 二开基座（少改，可跟 upstream）

`themes/`、`pages/`、`components/`、`conf/`、`blog.config.js`

## 不要当现行文档

| 路径 | 说明 |
|---|---|
| [`old/docs/`](../../old/docs/) | 上游 NotionNext 文档站 |
| [`old/docs/internal-history/`](../../old/docs/internal-history/) | 本项目过程稿（计划、阶段清单） |
