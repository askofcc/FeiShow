# AI 就绪度执行计划（给实现 Agent 用）

> 2026-08-15  
> **给 AI 执行，不是给人类空谈。** 按 Phase 顺序做；每步有文件、验收命令、完成定义。  
> 产品目标：用户能**方便拿到飞书经 FeishuNext 结构化之后的数据**（展示向），而不是飞书编辑器那套嵌套 JSON。

相关：已实现基线见 [AGENT_READINESS.md](./AGENT_READINESS.md)；数据契约见 [THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md)；总框架见 [NEXT_FRAMEWORK.md](./NEXT_FRAMEWORK.md)。

---

## 0. 任务边界（必须先读完再动手）

### 0.1 核心场景

用户或下游 Agent 想：**列出站点文章 → 拿到一篇干净的标题/摘要/正文（markdown 或 JSON）→ 带稳定公网 URL 可引用。**

飞书官方 JSON 是为编辑/协同/权限设计的，不适合这个场景。  
本计划**不重新取数**，只把现有中间模型（`SiteData` / `post` / `feishuContent`）做成**稳定、好发现、好调用**的出口。

### 0.2 允许改

- `pages/api/agent/**`
- `pages/api/llms.js`、`pages/api/robots.js`（仅发现协议）
- 新建 `lib/agent/**`（schema、序列化、文档生成，避免页面里堆逻辑）
- `docs/feishu/AGENT_API.md`（对外契约，给用户/AI 调用）
- `scripts/verify-agent-api.mjs`（验收）
- 必要时小改 `lib/utils/publicSiteLink.js`（禁止再引入 localhost 作为公网 URL）

### 0.3 禁止改

- 不要新开第二条飞书取数管线
- 不要伪造 Notion `recordMap`
- 不要做向量库、RAG、聊天 Agent、登录后私有语料
- 不要做 Commerce / 付费墙全文
- 不要把部署收敛（3 个 env）整包做完当成本计划的主路径（可顺手修 README 里 agent 用法，部署线见 NEXT_FRAMEWORK 方向 D）
- 不要扩大主题 UI 重构

### 0.4 完成的唯一产品定义

同时满足：

1. **发现：** `/llms.txt` 能指向列表和单篇机器入口  
2. **列表：** `GET /api/agent/posts` 返回稳定 JSON（有 `url`、`updatedAt`、单篇 json/md 链接）  
3. **单篇：** `GET /api/agent/posts/:slug` 返回 JSON；`?format=md` 返回 markdown  
4. **易用：** 一份 `docs/feishu/AGENT_API.md`，用户复制 3 条 curl 就能拿走数据  
5. **公网 URL：** 响应里不得出现 `localhost` / `127.0.0.1`（生产 Host 下）  
6. **验收脚本绿：** `node scripts/verify-agent-api.mjs --base <url>` 退出码 0  

C0–C2 代码已有雏形；本计划是把它收成**可交付契约**，并补齐缺口。

---

## 1. 现状（不要重写已有能力）

| 端点 | 文件 | 已有 |
|---|---|---|
| `GET /api/agent/posts` | `pages/api/agent/posts/index.js` | 列表 JSON `version:1`，含 `agent.json/markdown` |
| `GET /api/agent/posts/:slug` | `pages/api/agent/posts/[...slug].js` | enrich + 官方 md / plainText 回退 |
| `/llms.txt` `/llms-full.txt` | `pages/api/llms.js` | 索引 + 指向 agent |
| `/robots.txt` | `pages/api/robots.js` | 动态 Host |
| 公网 origin | `lib/utils/publicSiteLink.js` | 避免 localhost |

**已知缺口（按本计划修）：**

| ID | 缺口 | 为何挡「方便拿走数据」 |
|---|---|---|
| G1 | 没有对外 `AGENT_API.md` | 用户不知道调什么 |
| G2 | schema 未冻结：缺统一 `updatedAt`、`type`（Page/Notice）、错误形 | 下游不敢集成 |
| G3 | 列表默认不含 Page/Notice；无 `type`/`q`/`category` 过滤 | 拿不全展示内容 |
| G4 | 单篇 slug 含 `article/` 时 encode 双重路径易 404 | 从 llms 点进去可能失败 |
| G5 | 无 `scripts/verify-agent-api.mjs` | AI 无法客观收工 |
| G6 | 错误体不统一；500 无 `requestId` | 难排障 |
| G7 | CORS 未显式（公开只读 GET 应对浏览器/工具友好） | 前端小工具不好调 |
| G8 | 列表 `slug` 与 `agent.json` 路径可能不一致 | 用户拼 URL 失败 |

实现时先对照代码确认 G4/G8 是否仍存在，再改。

---

## 2. 目标契约（冻结后不要改字段名）

### 2.1 公共头

所有成功 JSON：

```json
{
  "version": 1,
  "generatedAt": "ISO-8601",
  "site": { "title": "", "description": "", "link": "https://..." }
}
```

所有失败 JSON：

```json
{
  "error": { "code": "NOT_FOUND|BAD_REQUEST|UPSTREAM|INTERNAL", "message": "..." },
  "slug": "optional"
}
```

HTTP：405 / 404 / 400 / 502 / 500 与 `code` 对齐。`UPSTREAM` = 飞书失败。

### 2.2 列表 `GET /api/agent/posts`

Query（全部可选）：

| 参数 | 默认 | 规则 |
|---|---|---|
| `limit` | 50 | 1–200 |
| `offset` | 0 | ≥0 |
| `type` | `post` | `post` / `page` / `notice` / `all` |
| `category` | — | 精确匹配 `post.category` |
| `tag` | — | 属于 `post.tags` |
| `q` | — | title/summary 子串，大小写不敏感 |

响应 `posts[]` 每项**必须**有：

```
id, type, title, slug, href, url,
summary, category, tags,
publishedAt, updatedAt,
documentId | null,
agent.json, agent.markdown
```

兼容：可暂时保留 `publishDay` / `lastEditedDay`，但新集成只文档化 `publishedAt` / `updatedAt`（ISO 或 `YYYY-MM-DD`，**全站一种**，推荐 ISO）。

`url` / `agent.*` 必须是 `resolvePublicSiteLink` 后的绝对 URL。

`slug` 规则：与详情路由一致。若内部 slug 是 `article/TOKEN`，则：

- `agent.json` = `{link}/api/agent/posts/{encodeURIComponent(slug)}` **或** 更稳：路径用 token 段 `.../posts/TOKEN` 且 `matchPost` 已支持 `endsWith`/`nodeToken`  
- 选一种写进 AGENT_API.md，列表和详情必须同一套

### 2.3 单篇 `GET /api/agent/posts/:slug`

- 默认 `Content-Type: application/json`  
- `?format=md` 或 `Accept: text/markdown` → markdown  
- JSON `post` **必须**有：列表字段 + `content` + `plainText` + `markdown` + `headings` + `accessError`  
- `accessError` 非空时仍 200，正文可空，**不要 500**  
- markdown / JSON `content` 从 `feishuContent` 投影，`markdownSource=feishu-blocks`；无结构时才回退 plainText  
- YAML front matter 保留 title/slug/url/date

### 2.4 发现

`/llms.txt` 必须包含：

- Site 段：home / sitemap / rss / `Agent posts JSON`  
- 每篇至少一条指向 **实际能 200 的** json 与 markdown URL  

---

## 3. Phase 执行顺序

每个 Phase：**改代码 → 跑验收命令 → 在本文件勾选 → 再进入下一 Phase。**  
不要并行改 schema 和部署文案到互相打架。

---

### Phase P0 — 冻结契约文档（先写后改）

**目的：** 用户和后续 AI 有一份调用说明。

**做：**

1. 新建 [`docs/feishu/AGENT_API.md`](../feishu/AGENT_API.md)，用中文写清：
   - 为什么不用飞书原始 JSON
   - 三个入口：llms / 列表 / 单篇
   - 参数表、字段表、3 条 curl、错误码
   - 注明「展示向结构化数据，非编辑 API」
2. 在 [`docs/feishu/README.md`](../feishu/README.md) 和根 `README.md` 加一行链接：「拿结构化数据 → AGENT_API.md」
3. 把本节 2.x 原文缩成 AGENT_API 的规范部分（字段名以 AGENT_API 为准，代码跟文档走）

**验收：**

```bash
test -f docs/feishu/AGENT_API.md
rg -n "api/agent/posts" docs/feishu/AGENT_API.md README.md
```

**完成定义：** 未读代码的人只看 AGENT_API 能写出正确 curl。

---

### Phase P1 — 抽出序列化层（避免页面复制粘贴）

**目的：** schema 只在一处，列表/详情/llms 不会漂移。

**做：**

1. 新建 `lib/agent/serialize.js`（或 `.ts`，跟仓库现有 API 风格）：
   - `pickPublished(allPages, { type })`
   - `normalizeSlug(page)` / `agentPaths(link, page)`
   - `toAgentPostSummary(page, link)`
   - `toAgentPostDetail(enriched, { link, markdown })`
   - `publicLink(req, props)` 包装 `resolvePublicSiteLink`
2. `pages/api/agent/posts/index.js` 与 `[...slug].js` 改为只做 HTTP + 调 serialize
3. `pages/api/llms.js` 的 json/md 链接改用同一 `agentPaths`

**验收：**

```bash
rg -n "toAgentPostSummary|agentPaths" pages/api/llms.js pages/api/agent/posts/index.js pages/api/agent/posts/\\[...slug\\].js
# 列表与 llms 不得再手写两套 agent URL 拼接
```

**完成定义：** 改一个字段名只需动 `lib/agent/serialize.js` + AGENT_API.md。

---

### Phase P2 — 补齐查询与类型（方便拿全展示内容）

**做：**

1. 列表支持 `type=post|page|notice|all`（默认 `post` 保持兼容）
2. 支持 `offset`、`category`、`tag`、`q`
3. 响应增加 `count`（本页）、`total`（过滤后总数）、`limit`、`offset`
4. 每条增加 `type`、`publishedAt`、`updatedAt`、`documentId`
5. CORS：`GET,HEAD` 对 `/api/agent/*` 设 `Access-Control-Allow-Origin: *`（只读公开）
6. OPTIONS 204

**验收：**

```bash
# 需本地或已部署 BASE
BASE=${BASE:-http://127.0.0.1:3460}
curl -sS "$BASE/api/agent/posts?limit=2" | python3 -c "import json,sys; d=json.load(sys.stdin); assert d['version']==1 and 'posts' in d and 'total' in d; p=d['posts'][0];
req=['id','type','title','slug','url','updatedAt','agent'];
assert all(k in p or k in p.get('agent',{}) for k in ['id','type','title','slug','url','updatedAt']);
assert 'json' in p['agent'] and 'markdown' in p['agent']"
curl -sS "$BASE/api/agent/posts?type=all&limit=5" | head -c 200
```

**完成定义：** AGENT_API 里的 query 全部实现；旧客户端只调无 query 的列表仍能用。

---

### Phase P3 — 单篇稳健性（从列表点进去必通）

**做：**

1. 复查 `matchPost`：同时接受 `TOKEN`、`article/TOKEN`、encode 后的 slug
2. 用列表返回的 `agent.json` **原样**请求必须 200
3. `accessError` → 200 + 字段说明，不 500
4. JSON 里 `markdownSource` 正常是 `feishu-blocks`；无 `feishuContent` 时才是 `plaintext-fallback`
5. 统一错误 JSON（见 2.1）

**验收：**

```bash
BASE=${BASE:-http://127.0.0.1:3460}
JSON=$(curl -sS "$BASE/api/agent/posts?limit=1")
# 用 python 抽出第一条 agent.json / agent.markdown 再 curl -sS -o /dev/null -w "%{http_code}"
```

脚本里实现，不要手点。

**完成定义：** 从列表拿到的两条 agent URL，对站点内每篇抽样（最多 5 篇）全部 200。

---

### Phase P4 — 验收脚本 + 反 localhost

**做：**

1. 新建 `scripts/verify-agent-api.mjs`：
   - 参数 `--base <url>`（默认 `http://127.0.0.1:3460`）
   - 检查：`/llms.txt`、`/robots.txt`、`/api/agent/posts`、第一条详情 json/md
   - `--base` 非 localhost 时：响应全文不得含 `localhost` / `127.0.0.1`
   - 校验 2.2 / 2.3 必填字段
   - 失败打印缺哪项，退出码 1
2. `package.json` 加 `"verify:agent": "node scripts/verify-agent-api.mjs"`
3. AGENT_API.md 底部写如何跑脚本

**验收：**

```bash
# 本地 dev 已启动
npm run verify:agent
# 或: node scripts/verify-agent-api.mjs --base https://feishu-next-beta.vercel.app
```

**完成定义：** 本地绿；若用户提供公网 `--base`，公网也绿（公网失败则记在 AGENT_READINESS 部署节，不假装代码没做完）。

---

### Phase P5 — 用户向「怎么拿走数据」（易用性）

**做：**

1. AGENT_API.md 最上面放「30 秒用法」：

```bash
BASE=https://your-domain
curl -sS "$BASE/llms.txt"
curl -sS "$BASE/api/agent/posts"
curl -sS "$BASE/api/agent/posts/<slug>?format=md" -o post.md
```

2. 说明与飞书原始 API 的差别（一表即可）  
3. 说明限流/缓存（`Cache-Control` 已有 s-maxage=300，文档写上）  
4. **不要**教用户用 tenant token 打飞书；教用户打 FeishuNext

**验收：** AGENT_API 文首 20 行内能完成一次导出。

---

## 4. 给执行 AI 的工作方式

1. 先读本文件 §0–§2 和现有三个 API 文件，**列将改文件清单**再改。  
2. 每完成一个 Phase，在本文该 Phase 标题下把 `- [ ]` 改成 `- [x]`（P0–P5 自行加 checkbox）。  
3. 不要一次提交「重构全世界」；每 Phase 一次或两次 commit，信息前缀 `feat(agent):` / `docs(agent):`。  
4. 本地需 `FEISHU_*` 与 dev server；没有凭证时至少保证 schema 单测或对 fixture 的 serialize 单测。  
5. 若与 THEME_DATA_CONTRACT 冲突：展示字段跟契约；agent 可**多**字段，不可改掉主题已用字段。  
6. 公网部署权限问题（bitable scope、LINK=localhost）属运维，记入 AGENT_READINESS §8，**不要为了绿而硬编码域名**。

---

## 5. 非目标（写进计划以免 AI 发挥）

| 不做 | 原因 |
|---|---|
| Embedding / 向量检索 | 超出「拿走结构化数据」 |
| Webhook 实时同步 | 后置；现有 ISR + cache 足够展示 |
| 写回飞书 | 展示产品，不写 |
| 25 主题为 agent 改 UI | 机器走 API |
| GraphQL | REST 已够简单 |

---

## 6. 最终勾选（全部完成后才算 AI 就绪度本迭代结束）

- [ ] `docs/feishu/AGENT_API.md` 存在且 README 已链
- [ ] `lib/agent/serialize.js`（或等价）为唯一序列化点
- [ ] 列表支持 type/limit/offset/category/tag/q，字段含 url/updatedAt/agent
- [ ] 列表给出的 json/md URL 抽检 200
- [ ] `scripts/verify-agent-api.mjs` 本地退出 0
- [ ] 生产 Host 下响应无 localhost（有公网则验证）
- [ ] 用户只靠 AGENT_API 三行 curl 能导出一篇 md

---

## 7. 一句话

> **把已经洗好的飞书展示数据，做成发现得了、字段稳、一篇命令就能拿走的只读 API。**  
> 不是再做一个飞书，也不是再做一个聊天机器人。
