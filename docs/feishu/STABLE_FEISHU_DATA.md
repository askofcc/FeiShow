# 飞书稳定数据请求主路径

> 目标：FeishuNext 的列表 / 正文 / 图片**必须**建立在飞书开放平台官方 OpenAPI 上，而不是网页端会话 API、clientvars 或 protobuf gateway。
>
> 对照样本：
> - 官方形态：`docs/samples/feishu-bitable-records-official.json`、`docs/samples/feishu-docx-blocks-official.json`
> - 不稳定网页路径实测：`docs/samples/feishu-live-api-probe/`
> - 与 Notion 对比：`docs/samples/side-by-side-comparison.json`、`docs/samples/notion-live-api-probe/`

---

## 1. 结论（先读这段）

| 用途 | 稳定？ | 路径 |
|---|---|---|
| 鉴权 | ✅ 稳定 | `POST /open-apis/auth/v3/tenant_access_token/internal` |
| 文章列表/索引 | ✅ 稳定 | `POST /open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search` |
| 正文 blocks | ✅ 稳定 | `GET /open-apis/docx/v1/documents/{document_id}/blocks` |
| 文档元信息 | ✅ 稳定 | `GET /open-apis/docx/v1/documents/{document_id}` |
| 图片/附件下载 | ✅ 稳定 | `GET /open-apis/drive/v1/medias/{file_token}/download` |
| Wiki 节点 → 真实 doc token | ✅ 稳定（官方） | `GET /open-apis/wiki/v2/spaces/get_node?token=` |
| Markdown 导出 | ⚠️ 可选补充 | `GET /open-apis/docs/v1/content?doc_type=docx&content_type=markdown` |
| 网页 wiki `get_node`（无 open token） | ❌ 不稳定 | 常 `Login Required` |
| `bitable/.../clientvars` | ❌ 不稳定 | gzip+base64 内部态，结构非开放 REST |
| `im/gateway` protobuf | ❌ 不稳定 | 协同/正文内部通道，访客态易 403 |
| 用户 cookie + 抓公开 HTML | ❌ 不稳定 | 登录壳 / 会话过期 / 反爬 |

**主路径一句话：**

```text
APP_ID/SECRET
  → tenant_access_token（内存缓存，过期前 60s 刷新）
  → bitable records/search（分页拉全表索引）
  → 对每条已发布记录：docx blocks（分页）+ 可选 document meta
  → drive medias download（经 /api/media 代理，强缓存）
  → normalize → Post / FeishuBlock → 页面渲染
```

实现位置：`src/lib/feishu/{auth,client,bitable,docx,media,wiki,normalize}.ts` + `src/lib/site/get-site-data.ts`。

---

## 2. 权限与环境前提

### 2.1 应用权限（企业自建应用）

至少开通并**发布**权限版本：

| 权限 scope（常见名） | 用途 |
|---|---|
| `bitable:app` / 多维表格相关读权限 | 读记录作站点索引 |
| `docx:document` / 云文档读权限 | 读 docx blocks |
| `drive:drive` / 云空间读权限 | 下载图片、附件 |
| `wiki:wiki` 或知识库读权限（若文档挂在 wiki 下） | `get_node` 把 wiki token 解析成 `obj_token` |

### 2.2 资源授权

- 把**多维表格**和相关 **Docx / Wiki 节点**分享给该应用（或所属机器人），仅「可读」即可。
- 高级权限多维表格：部分附件下载需要额外 `extra` 参数（见 §5.4）；尽量用「应用有权访问」的表，避免复杂权限绕过。

### 2.3 环境变量

见根目录 `.env.example`。核心：

```bash
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
FEISHU_BITABLE_APP_TOKEN=bascnxxx   # 多维表格 app_token
FEISHU_BITABLE_TABLE_ID=tblxxx
FEISHU_BITABLE_VIEW_ID=vewxxx       # 可选；用于过滤/排序视图
FEISHU_DOMAIN=https://open.feishu.cn  # 国际版常用 https://open.larksuite.com
NEXT_PUBLIC_REVALIDATE_SECOND=60
REVALIDATION_TOKEN=...              # 可选，on-demand revalidate
```

字段映射（中文表头默认）：

| Env | 默认 | 说明 |
|---|---|---|
| `FEISHU_FIELD_TITLE` | 标题 | 文本 |
| `FEISHU_FIELD_SLUG` | Slug | 文本；缺省时由标题 slugify |
| `FEISHU_FIELD_STATUS` | 状态 | 单选；`FEISHU_PUBLISHED_STATUS=已发布` |
| `FEISHU_FIELD_TYPE` | 类型 | 文章/文档/页面 |
| `FEISHU_FIELD_CATEGORY` | 分类 | |
| `FEISHU_FIELD_TAGS` | 标签 | 多选 |
| `FEISHU_FIELD_SUMMARY` | 摘要 | |
| `FEISHU_FIELD_COVER` | 封面 | 附件 → file_token → `/api/media/{token}` |
| `FEISHU_FIELD_DATE` | 发布时间 | 日期/时间戳 |
| `FEISHU_FIELD_DOCUMENT` | 文档 | **docx token** 或 `.../docx/{id}` / `.../wiki/{token}` URL |

**文档字段建议：** 直接填 Docx token（`doxcn...`）最稳。若填 Wiki 链接，服务端需再调 `wiki get_node` 解析 `obj_token`（官方 OpenAPI，仍属稳定路径）。

### 2.4 域名

| 区域 | OpenAPI 域名 |
|---|---|
| 飞书国内 | `https://open.feishu.cn` |
| Lark 国际 | `https://open.larksuite.com` |

统一用 `FEISHU_DOMAIN`，不要写死。

---

## 3. 推荐请求顺序（运行时）

```text
[启动/请求]
    │
    ├─1─ tenant_access_token
    │      命中内存缓存且距过期 > 60s → 直接用
    │      否则 POST internal → 缓存 token + expire
    │
    ├─2─ bitable records/search（列表）
    │      page_size=100（最大可达 500，视接口文档）
    │      automatic_fields=true（拿创建/修改时间）
    │      可选 view_id
    │      while has_more: page_token 翻页，上限 maxPages
    │
    ├─3─ 本地过滤 / 映射
    │      status == 已发布
    │      type → post | doc | page
    │      document 字段 → documentId（必要时 wiki resolve）
    │
    ├─4─ 单篇详情（按 slug）
    │      GET documents/{id}          # 标题/revision（可失败降级）
    │      GET documents/{id}/blocks   # 全量 blocks 分页
    │      normalize → FeishuBlock[]
    │
    └─5─ 媒体（按需，浏览器命中 /api/media/[token]）
           GET medias/{file_token}/download
           响应 Cache-Control 强缓存（如 1 天）
```

站点层缓存（已在 `get-site-data.ts`）：

- `unstable_cache(..., { revalidate: NEXT_PUBLIC_REVALIDATE_SECOND, tags: ["feishu-site"] })`
- 单篇：`tags: ["feishu-site", "feishu-post-{slug}"]`
- 主动刷新：`POST /api/revalidate` + `REVALIDATION_TOKEN`

**原则：OpenAPI 调用次数 = 缓存未命中时的次数。** 列表与正文都不要在无缓存路径上对每个页面重复拉全站。

---

## 4. 各接口约定（稳定路径详解）

### 4.1 tenant_access_token

```http
POST {FEISHU_DOMAIN}/open-apis/auth/v3/tenant_access_token/internal
Content-Type: application/json

{"app_id":"...","app_secret":"..."}
```

成功响应要点：

```json
{
  "code": 0,
  "msg": "ok",
  "tenant_access_token": "t-xxx",
  "expire": 7200
}
```

实践：

- 进程内缓存；**提前 60s** 刷新，避免边界过期。
- 收到 token 失效类错误码（常见 `99991663` / `99991668` 等）→ **清缓存并重试 1 次**。
- 不要每个 bitable/docx 请求都重新要 token。

代码：`src/lib/feishu/auth.ts`。

### 4.2 多维表格 records/search（列表）

```http
POST {FEISHU_DOMAIN}/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/search
Authorization: Bearer {tenant_access_token}
Content-Type: application/json

{
  "page_size": 100,
  "page_token": "...",          // 第二页起
  "view_id": "vewxxx",          // 可选
  "automatic_fields": true
}
```

响应形状（官方样本见 `docs/samples/feishu-bitable-records-official.json`）：

```json
{
  "code": 0,
  "data": {
    "has_more": false,
    "page_token": "",
    "items": [
      {
        "record_id": "recxxx",
        "fields": { "标题": "...", "Slug": "...", "状态": "已发布", "...": "..." },
        "created_time": 1691049973000,
        "last_modified_time": 1691049973000
      }
    ]
  }
}
```

分页：

- 以 `has_more` + `page_token` 为准，**不要**假设一次拉完。
- 代码默认 `pageSize=100`、`maxPages=20`（约 2000 条上限）；站点再大应提高上限或按 view 拆表。
- 字段值形态多样（文本 / 数组 text / 附件 file_token / 单选字符串），统一经 `extractTextField` 等解析。

代码：`src/lib/feishu/bitable.ts` → `listBitableRecords`。

### 4.3 Docx blocks（正文）

```http
GET {FEISHU_DOMAIN}/open-apis/docx/v1/documents/{document_id}/blocks
  ?page_size=500
  &document_revision_id=-1
  &page_token=...
Authorization: Bearer {tenant_access_token}
```

- `document_revision_id=-1`：取最新版本。
- `page_size` 最大 500；长文必须翻页（代码 `guard < 30` ≈ 15000 blocks 上限）。
- 响应 `items[]` 为扁平 block 列表，靠 `block_id` / `parent_id` / `children` 建树（见官方样本 `feishu-docx-blocks-official.json`）。

元信息（可选）：

```http
GET /open-apis/docx/v1/documents/{document_id}
```

Markdown 旁路（**不作为主渲染**，仅调试/降级）：

```http
GET /open-apis/docs/v1/content?doc_token={id}&doc_type=docx&content_type=markdown
```

代码：`lib/feishu/docx.ts` → `listDocumentBlocks` / `getDocumentMeta`。站点正文与 Agent Markdown 都走 blocks → `feishuContent`，不使用官方 Markdown 导出。

### 4.4 Wiki token → document_id（官方、可选但推荐支持）

多维表格「文档」列常贴 Wiki 链接：

```text
https://xxx.feishu.cn/wiki/{wiki_token}
```

`wiki_token` **不是** docx `document_id`。应用有知识库权限时：

```http
GET /open-apis/wiki/v2/spaces/get_node?token={wiki_token}
Authorization: Bearer {tenant_access_token}
```

成功时用返回的 `node.obj_token`（及 `obj_type`）作为后续 docx 的 `document_id`。

注意：

- 这是 **OpenAPI**，与网页 ` /space/api/wiki/v2/tree/get_node/`（需登录 cookie）不是一回事。
- 样本 `docs/samples/feishu-live-api-probe/get_node.json` 是**网页无会话**失败样例（`Login Required`），证明不能用公开 curl 替代 OpenAPI。

代码：`src/lib/feishu/wiki.ts`（解析）+ `listDocumentBlocks` 失败回退解析。

### 4.5 媒体 download（图片）

```http
GET {FEISHU_DOMAIN}/open-apis/drive/v1/medias/{file_token}/download
Authorization: Bearer {tenant_access_token}
```

实践：

- **不要**把 tenant token 暴露给浏览器；一律经站点代理：`/api/media/[token]`。
- 响应加 `Cache-Control: public, max-age=86400`（或更长），降低 QPS 压力。
- 封面/正文图片字段里优先存 `file_token`，前端只认同源代理 URL。
- 高级权限多维表格附件：若 403，查阅官方「下载素材」文档的 `extra` 参数（由 list 接口返回的临时授权拼出）；MVP 优先保证「应用可读」的表。

代码：`src/lib/feishu/media.ts` + `src/app/api/media/[token]/route.ts`。

---

## 5. 限流、重试、错误处理

### 5.1 通用约定

| 场景 | 处理 |
|---|---|
| HTTP 429 / 业务频控码（常见 `99991400`） | 指数退避重试 2–3 次（如 300ms → 900ms → 2s） |
| HTTP 5xx / 网络失败 | 同上有限重试 |
| `code !== 0` 且非频控 | 抛错，带上 `code`、`msg`、path |
| Token 失效 | 清 token 缓存，**整次请求重试 1 次** |
| 单篇 docx 失败 | 列表仍可用；详情返回摘要级 Post 或 404，不拖垮整站 |
| 媒体失败 | `/api/media` 返回 502 JSON，页面可用 alt/占位 |

### 5.2 限流经验值（以官方文档为准，此处作运维预算）

不同接口文档单列 QPS/日限额；落地时按**最严一档**预算：

| 接口族 | 运维建议 |
|---|---|
| auth token | 缓存，几乎不构成瓶颈 |
| bitable search | 全站列表一次缓存；避免每个 SSR 直打 |
| docx blocks | 按 slug 缓存；构建 `generateStaticParams` 时控制并发 |
| media download | **最严**：优先 CDN/Cache-Control；热图不要无缓存穿透 |

构建期若并发拉多篇正文，自行做 **p-limit（如 2–3）**，避免触发频控。

### 5.3 错误信息最小标准

抛错字符串至少包含：

```text
Feishu API error {code}: {msg} ({METHOD path})
```

非 JSON 响应：

```text
Feishu request failed: {status} {statusText} ({path})
```

### 5.4 失败降级矩阵

| 失败点 | 降级 |
|---|---|
| 无 `FEISHU_APP_ID` 或 `FEISHU_DEMO=true` | **Demo fixtures** 全站可预览 UI |
| token 获取失败 | 不启动 live；构建/请求报错日志清晰 |
| bitable 全失败 | 无列表；勿 silent 空站伪装成功（开发期应 fail loud） |
| 单条 documentId 缺失 | 仅标题/摘要页，无正文 |
| wiki token 未解析 | 先按原 token 调 docx；失败再 get_node；仍失败则无正文 |
| docx blocks 失败 | 详情 404 或仅 meta；列表不受影响 |
| media 失败 | 图裂/占位；正文文字仍在 |
| revalidate 未配置 token | 仅时间 ISR；生产建议配 `REVALIDATION_TOKEN` |

---

## 6. 缓存与 ISR（稳定路径配套）

```text
请求页
  → Next unstable_cache(getSiteData / getPostBySlug)
       revalidate = NEXT_PUBLIC_REVALIDATE_SECOND（默认 60）
  → 未命中才打 OpenAPI
  → feishuFetch 也可带 next.revalidate（与站点层双保险）
```

主动刷新：

```bash
curl -X POST "$SITE/api/revalidate" \
  -H 'content-type: application/json' \
  -d '{"token":"'"$REVALIDATION_TOKEN"'","tag":"feishu-site"}'
```

飞书侧「自动化 / 出站 Webhook」可在记录更新后调上述接口（可选，非 MVP 阻塞）。

媒体：

- 代理层 `max-age=86400`
- 文件 token 变更视为新 URL，旧缓存自然失效

---

## 7. 不稳定路径对照（明确不要做基座）

基于 `docs/samples/feishu-live-api-probe/` CDP 实测：

| 路径 | 实测现象 | 为何不稳 |
|---|---|---|
| 公开 wiki URL 直接 curl | HTML 登录壳（`html-extract.txt`） | 无会话 ≠ 公开 JSON |
| `GET /space/api/wiki/v2/tree/get_node/` | `{"code":5,"msg":"Login Required"}`（`get_node.json`） | 网页会话 API |
| `GET /space/api/v1/bitable/{app}/clientvars` | `base`/`table` 为 gzip+base64 内部 CLIENT_VARS | 非开放 fields 模型，随时变 |
| `POST .../im/gateway/` protobuf | 200/403 混杂 | 二进制协议 + 风控，不可维护 |
| 浏览器访客 cookie 复用 | 访客会话可过期、需 UA/指纹 | 运维与合规风险高 |
| Notion 式 `/api/v3/loadPageChunk` | 飞书无对等稳定公开接口 | 不可类推 |

对比结论（与 `notion-vs-feishu-content-api.md` 一致）：

- Notion 公开页常可服务端打 `/api/v3` 拿 recordMap。
- 飞书公开页「浏览器能看」≠「服务端无鉴权 JSON」。
- 产品列表字段在**多维表格**，不在 wiki 节点上；因此索引必须 bitable OpenAPI。

---

## 8. 与 NotionNext 数据路径对照

| 步骤 | NotionNext | FeishuNext（稳定） |
|---|---|---|
| 鉴权 | 多为公开页 / integration | tenant_access_token |
| 列表 | collection / DB query | bitable records/search |
| 正文 | recordMap blocks | docx blocks list |
| 图片 | signed_urls | medias download + 自建代理 |
| 渲染模型 | ExtendedRecordMap | `Post` + `FeishuBlock`（**不**伪装 recordMap） |

样本对照：`docs/samples/side-by-side-comparison.json`。

---

## 9. 实现检查清单（落地用）

- [ ] 应用权限已发布，表格/文档已授权给应用
- [ ] `.env.local` 四件套：`APP_ID` / `SECRET` / `BITABLE_APP_TOKEN` / `BITABLE_TABLE_ID`
- [ ] 多维表格有「已发布」过滤字段与文档列
- [ ] 文档列优先 docx token；wiki 链接则应用具备 wiki 读权限
- [ ] 本地 `npm run dev` 非 demo 模式能拉到列表
- [ ] 单篇正文 blocks 非空，图片走 `/api/media/...`
- [ ] `NEXT_PUBLIC_REVALIDATE_SECOND` 与内容更新频率匹配
- [ ] 生产配置 `REVALIDATION_TOKEN` 或接受纯 ISR 延迟
- [ ] **没有**依赖 cookie / clientvars / protobuf 的代码路径

---

## 10. 推荐「手测」curl（有凭证时）

```bash
# 1) token
curl -s "$FEISHU_DOMAIN/open-apis/auth/v3/tenant_access_token/internal" \
  -H 'Content-Type: application/json' \
  -d "{\"app_id\":\"$FEISHU_APP_ID\",\"app_secret\":\"$FEISHU_APP_SECRET\"}"

# 2) 列表（替换 TOKEN / APP / TABLE）
curl -s -X POST \
  "$FEISHU_DOMAIN/open-apis/bitable/v1/apps/$FEISHU_BITABLE_APP_TOKEN/tables/$FEISHU_BITABLE_TABLE_ID/records/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"page_size":20,"automatic_fields":true}'

# 3) 正文
curl -s \
  "$FEISHU_DOMAIN/open-apis/docx/v1/documents/$DOC_ID/blocks?page_size=50&document_revision_id=-1" \
  -H "Authorization: Bearer $TOKEN"

# 4) 图片（保存到文件）
curl -sL \
  "$FEISHU_DOMAIN/open-apis/drive/v1/medias/$FILE_TOKEN/download" \
  -H "Authorization: Bearer $TOKEN" -o /tmp/feishu-media.bin
```

响应 `code === 0` 才算通路打通。

---

## 11. 代码地图

| 文件 | 职责 |
|---|---|
| `src/lib/feishu/auth.ts` | tenant token 获取与缓存、失效清理 |
| `src/lib/feishu/client.ts` | 统一 Bearer 请求、重试、错误包装 |
| `src/lib/feishu/bitable.ts` | records/search 分页、字段抽取 |
| `src/lib/feishu/docx.ts` | blocks / meta / markdown |
| `src/lib/feishu/wiki.ts` | wiki token → obj_token |
| `src/lib/feishu/media.ts` | medias download |
| `src/lib/feishu/normalize.ts` | record → PostSummary，blocks → FeishuBlock |
| `src/lib/site/get-site-data.ts` | ISR 缓存与站点聚合 |
| `src/app/api/media/[token]/route.ts` | 浏览器侧媒体代理 |
| `src/app/api/revalidate/route.ts` | 按需刷新 |

---

## 12. 后续建议（不阻塞主路径）

1. 构建/批量拉正文时加并发限制与 429 可观测日志。
2. 多维表格「文档」列统一为 docx token，减少 wiki 解析跳数。
3. 封面与正文图片统一走 file_token + 代理，避免短期外链过期。
4. 飞书自动化 Webhook → `/api/revalidate`，缩短 ISR 空窗。
5. 继续把官方成功响应样本放进 `docs/samples/`，与 live-api-probe 的失败样本对照，防止后人误走网页 API。

---

*文档与 FeishuNext 实现同步维护；接口字段以 [飞书开放平台](https://open.feishu.cn/document/) 当前文档为准。*


相关：文档字段与权限总契约见 [FEISHU_DOCUMENT_CONTRACT.md](./FEISHU_DOCUMENT_CONTRACT.md)。
