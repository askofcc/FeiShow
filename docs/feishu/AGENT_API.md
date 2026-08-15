# 拿走结构化数据（Agent API）

飞书官方 JSON 是给编辑器用的。本站已经洗成展示数据；机器请调这里，不要再打飞书 OpenAPI。

```text
官方 blocks / 内容表
  → SiteData + feishuContent     （站点后端，已有）
      ├─ HTML 人读页
      ├─ GET /api/agent/posts           列表 JSON
      └─ GET /api/agent/posts/:slug     单篇 JSON + Markdown
```

列表、单篇都只投影这一份中间模型。**不再调用**官方 `docs/v1/content?content_type=markdown`。

人读 HTML 是最全阅读面。JSON/MD 保证标题、段落、列表、代码、图片等可读正文；白板/插件等读不到的块不编造。

---

## 30 秒

```bash
BASE=https://your-domain   # 本地: http://127.0.0.1:3460

curl -sS "$BASE/llms.txt"
curl -sS "$BASE/api/agent/posts"
curl -sS "$BASE/api/agent/posts/<slug>"            # JSON
curl -sS "$BASE/api/agent/posts/<slug>?format=md"  # Markdown
```

`<slug>` 用列表里的 `slug`（一般是飞书 node token）。

---

## 入口

| URL | 格式 | 用途 |
|---|---|---|
| `/llms.txt` | 文本 | 发现：站点 + 文章 + 机器入口 |
| `/llms-full.txt` | 文本 | 同上，带摘要、更多条 |
| `GET /api/agent/posts` | JSON | 目录，无全文 |
| `GET /api/agent/posts/:slug` | JSON | 单篇：元数据 + `content` + `plainText` + `markdown` |
| 同上 `?format=md` | Markdown | 单篇存盘 |

---

## 列表 `GET /api/agent/posts`

来源：`fetchGlobalAllData()` 的 `allPages`，与首页同一份索引。

Query：`limit`（1–200，默认 50）、`offset`、`type`（`post` / `page` / `notice` / `all`，默认 `post`）、`category`、`tag`、`q`。

成功体：`version`、`generatedAt`、`site`、`total`、`count`、`posts[]`。

每条：`id` `type` `title` `slug` `href` `url` `summary` `category` `tags` `publishedAt` `updatedAt` `documentId` `agent.json` `agent.markdown`。

---

## 单篇

来源：与文章页相同的 `enrichFeishuPost()` → `feishuContent`。

- `content`：处理后的 blocks（不含 `blockMap`）
- `markdown`：从这些 blocks 投影，`markdownSource` 正常是 `feishu-blocks`
- 无结构时才是 `plaintext-fallback`
- 无权限仍 **200**，看 `accessError`，不要当失败再打飞书

JSON 另有：`author` `plainText` `headings`。

`?format=md` 带 YAML front matter（title/slug/url/date/markdownSource）。

---

## 范围

**必须（本迭代已落地）：** 发现、列表 JSON、单篇 JSON/MD、调用说明、验收脚本。

**应该（加固，仍是同一出口）：** 字段冻结、筛选分页、无权限不 500、CORS 只读。公网 URL 正确属于部署（方向 D），不是再取一遍飞书。

**不必做：** 向量库/RAG/问答、写回飞书、伪造 Notion recordMap、爬公开页 protobuf、为 Agent 重做主题、GraphQL/MCP 全家桶。

---

## 错误与缓存

```json
{ "error": { "code": "NOT_FOUND|BAD_REQUEST|INTERNAL", "message": "..." } }
```

公开只读，CORS `*`。缓存约 5 分钟（`s-maxage=300`）。

主题怎么用同一份数据 → [THEME_DATA_CONTRACT.md](./THEME_DATA_CONTRACT.md)
