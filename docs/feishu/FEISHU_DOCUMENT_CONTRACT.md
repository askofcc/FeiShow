# 飞书「文档」调用契约（项目基线）

> **本文只定：展示侧如何读一篇飞书文章。**  
> 多维表格作为配置源的契约另文讨论，不在本文范围。  
> 来源：开放平台 OpenAPI + 本仓库 live 实测（2026-07）。

---

## 0. 一句话

一篇「可展示文章」= **知识库节点（可选）+ Docx 文档元信息 + Docx 块树 + 素材下载 + 权限判断**。

站点**不**依赖浏览器内部 protobuf / `clientvars`。

---

## 1. 两层身份：Wiki 节点 vs Docx 文档

飞书里用户常看到的链接是：

```text
https://{tenant}.feishu.cn/wiki/{node_token}
```

或：

```text
https://{tenant}.feishu.cn/docx/{document_id}
```

| 标识 | 是什么 | 用途 |
|---|---|---|
| `node_token` | 知识库树上的节点 ID | 列表、父子关系、侧栏树、URL `/wiki/...` |
| `document_id` / `obj_token` | 真正的云文档 ID（docx） | 拉标题/封面/blocks/素材 |
| `space_id` | 知识空间 ID | 列子节点 `.../spaces/{space_id}/nodes` |

**硬规则：**

- `/wiki/{token}` 里的 **token 不是** `document_id`。  
- 正文 API 必须用 **docx 的 `document_id`**（即 wiki 节点的 `obj_token`，且 `obj_type=docx`）。  
- 解析：`GET /open-apis/wiki/v2/spaces/get_node?token={wiki_or_obj_token}`

### 1.1 实测：示例文章

Wiki 节点：

```json
{
  "node_token": "WVcXwGWVdiygsHkGS6LcbWbln4e",
  "obj_token": "CywzdQgZSot9Q5xE9ERcW2TsnxO",
  "obj_type": "docx",
  "title": "示例文章",
  "parent_node_token": "AHHowAmX9itAKWkHvWOcqQOPneg",
  "space_id": "7399958738826117148",
  "has_child": false,
  "obj_create_time": "1784723627",
  "obj_edit_time": "1784723628",
  "creator": "ou_...",
  "owner": "ou_..."
}
```

Docx 元信息（同一篇）：

```json
{
  "document_id": "CywzdQgZSot9Q5xE9ERcW2TsnxO",
  "revision_id": 2,
  "title": "示例文章",
  "display_setting": {
    "show_authors": true,
    "show_create_time": false,
    "show_pv": false,
    "show_uv": false,
    "show_like_count": false,
    "show_comment_count": false,
    "show_related_matters": false
  }
  // 本篇无 cover
}
```

有封面的实测（全格式样例）：

```json
{
  "document_id": "U828dyBdsoeEd0xLqRdc4ctxnjf",
  "title": "飞书全部内容格式展示",
  "cover": {
    "token": "JtFob1X6EooHCkx2Q4PcOCZXnTd",
    "offset_ratio_x": 0,
    "offset_ratio_y": 0
  }
}
```

---

## 2. 一篇文章「字段地图」（产品视角）

下面按**站点要不要用**分类。

### 2.1 标识与位置（必用）

| 字段 | API 来源 | 说明 | 站点用法 |
|---|---|---|---|
| `node_token` | wiki `get_node` / `nodes` | 知识库节点 | 路由 id、树 |
| `document_id`/`obj_token` | 同上 + docx | 正文主体 | 拉 blocks |
| `obj_type` | wiki | `docx/sheet/bitable/...` | 过滤：只渲染 docx 为文章 |
| `parent_node_token` | wiki | 父节点 | 目录树 |
| `has_child` | wiki | 是否有子节点 | 目录 vs 叶子 |
| `space_id` | wiki | 知识空间 | 列子节点 |
| `url` | wiki nodes 有时返回 | 规范链接 | 外链/调试 |

### 2.2 标题与时间（必用 / 常用）

| 字段 | API 来源 | 说明 | 站点用法 |
|---|---|---|---|
| `title` | wiki + docx meta | 两处都可能有；以 docx 为准更稳 | 列表/标题栏 |
| `revision_id` | docx meta | 版本号 | 缓存失效 key |
| `obj_create_time` | wiki（unix 秒） | 创建 | 列表日期 |
| `obj_edit_time` | wiki（unix 秒） | 最近编辑 | 「最后更新」 |
| `node_create_time` | wiki | 节点创建 | 备选 |

**注意：** wiki `nodes` 列表有时 `title` 为空，需 `get_node` 或 `docx meta` 补标题。

### 2.3 封面（有则用）

| 字段 | API 来源 | 说明 | 站点用法 |
|---|---|---|---|
| `cover.token` | docx meta | 封面图素材 token | TitleBar / 列表封面 |
| `cover.offset_ratio_x/y` | docx meta | 裁剪偏移 | 背景定位（可选） |

下载封面：与正文图片相同，走素材下载（§4）。

**OpenAPI 文档 meta 不直接给「页面图标 emoji/图标文件」字段。**  
图标若存在于 UI，多数属于客户端态；**不要依赖「文档图标」OpenAPI 字段**。

**展示侧 pageIcon 兼容策略（adapter 已实现，见 `lib/feishu/page-icon.ts`）：**

1. 内容表「图标」列（emoji / 图片 URL / `fas fa-xxx`）  
2. 标题前导 emoji  
3. 空（主题 `NotionIcon` 不渲染）  

封面仍用 `cover.token` → `pageCoverThumbnail`。  
NotionNext 的 `pageIcon` 在飞书侧应视为**可选增强**，无则空。

### 2.4 展示开关 display_setting（可选）

来自 `GET /docx/v1/documents/:id` 的 `display_setting`：

| 字段 | 含义 | 站点建议 |
|---|---|---|
| `show_authors` | 是否展示作者 | 可映射到文章 meta 是否显示作者 |
| `show_create_time` | 是否展示创建时间 | 可选 |
| `show_pv` / `show_uv` | 访问次数/人数 | 飞书站内统计；独立站一般**不读** |
| `show_like_count` | 点赞 | 一般不读 |
| `show_comment_count` | 评论数 | 一般不读 |
| `show_related_matters` | 关联事项 | 未稳定支持，忽略 |

### 2.5 正文内容（必用）

`GET /docx/v1/documents/:document_id/blocks`

| 字段 | 说明 |
|---|---|
| `block_id` | 块 ID |
| `parent_id` | 父块 |
| `children[]` | 子块 ID 列表 |
| `block_type` | 数字枚举（见 §3） |
| 类型专有结构 | `text` / `heading1` / `image` / `table` … |

根块：`block_type=1`（page），其 `page.elements` 常含页面标题文本。

### 2.6 作者/所有者（弱使用）

| 字段 | API | 说明 |
|---|---|---|
| `creator` / `owner` / `node_creator` | wiki node | open_id 字符串，需通讯录再换名字 |
| 文档作者展示 | display_setting.show_authors | 仅开关，不直接给作者名列表 |

**站点默认：** 用 `site.config.author`；不强制解析飞书 ou_ id。

---

## 3. 正文 Block 类型（调用侧要认识的）

官方 `block_type`（节选，完整见开放平台）：

| 值 | 含义 | FeiShow 处理 |
|---|---|---|
| 1 | page | 根 |
| 2 | text | 段落 |
| 3–11 | heading1–9 | 标题（7–9 可折叠到 h6） |
| 12 | bullet | 无序 |
| 13 | ordered | 有序 |
| 14 | code | 代码 |
| 15 | quote | 引用 |
| 17 | todo | 待办 |
| 18 | bitable | 嵌入多维表 → 卡片/预览 |
| 19 | callout | 高亮 |
| 21 | diagram/UML | 图/占位 |
| 22 | divider | 分割线 |
| 23 | file | 附件 |
| 24/25 | grid / grid_column | 分栏 |
| 26 | iframe | 内嵌网页 |
| 27 | image | 图片（`image.token`） |
| 30 | sheet | 电子表格 |
| 31/32 | table / cell | 表格 |
| 34 | quote_container | 引用容器 |
| 40 | 文档小组件 | 占位 |
| 42/51 | wiki 子目录 | 目录块 |
| 43 | board 画板 | 可 `download_as_image` |
| 48 | link_preview | 书签 |
| 999 | 未支持 | 占位 |

> **占位块过滤**：`normalizeDocument` 在数据层丢弃"无文本（trim 后为空）且无
> 子块"的 `unknown` 块（含官方 `999` 占位），所有下游消费方（渲染、Markdown、
> RSS、摘要）拿到的都是干净数据，不再出现"飞书特殊嵌入组件"兜底卡片。见
> `lib/feishu/normalize.ts` 的 `isContentlessPlaceholder`。

富文本在 `elements[].text_run`：

```json
{
  "text_run": {
    "content": "文字",
    "text_element_style": {
      "bold": false,
      "italic": false,
      "strikethrough": false,
      "underline": false,
      "inline_code": false,
      "link": { "url": "https%3A%2F%2F..." }
    }
  }
}
```

也可有 `mention_doc` / `equation` 等元素。

实现映射：`src/lib/feishu/normalize.ts`、`docs/FEISHU_BLOCK_MAPPING.md`。

---

## 4. 图片 / 封面 / 附件（素材）

| 资源 | token 从哪来 | 下载 |
|---|---|---|
| 正文图片 | blocks 里 `image.token` | `GET /drive/v1/medias/{file_token}/download` |
| 封面 | meta `cover.token` | 同上 |
| 附件文件 | `file.token` | 同上 |
| 画板 | board token | 专用导出图接口（本仓库 board 路由） |

**约束：**

- 必须有文档读权限，否则 403。  
- 频控严（约 5 QPS 级），站点必须代理 + 缓存（`/api/media/[token]`）。  
- 返回二进制流，不是 JSON URL。

---

## 5. 权限 / 分享 / 密码 / 复制（产品必懂）

### 5.1 两套「权限」概念

| 概念 | 是什么 | OpenAPI |
|---|---|---|
| **协作者权限** | 谁可读/编/管这篇文档 | 给应用/用户授权；API 403/1770032/131006 |
| **公开权限设置** | 链接分享、外部分享、谁可复制等 | `GET /drive/v1/permissions/:token/public?type=docx\|wiki` |

### 5.2 permission_public 字段（展示相关）

实测（docx token + `type=docx`，或 wiki token + `type=wiki`）：

```json
{
  "external_access": true,
  "security_entity": "anyone_can_view",
  "comment_entity": "anyone_can_view",
  "share_entity": "anyone",
  "link_share_entity": "anyone_editable",
  "invite_external": true,
  "lock_switch": false
}
```

| 字段 | 含义 | 站点含义 |
|---|---|---|
| `link_share_entity` | 链接分享：`closed` / `tenant_readable` / `tenant_editable` / `anyone_readable` / `anyone_editable` | 是否「互联网可阅读」的配置态 |
| `security_entity` | 谁可复制/建副本/打印/下载：`anyone_can_view` / `anyone_can_edit` / `only_full_access` | **复制/下载限制**（见下） |
| `comment_entity` | 谁可评论 | 独立站通常不管飞书评论 |
| `share_entity` | 谁可管协作者 | 管理态，站点不管 |
| `external_access` | 是否允许分享到组织外 | 背景信息 |
| `lock_switch` | 是否锁节点、不继承父权限 | 子树权限是否独立 |

**`type` 必须和 token 类型一致：**

- docx id → `type=docx`  
- wiki node_token → `type=wiki`  
混用会 `1063001 Invalid parameter`（已实测）。

### 5.3 「密码」在 OpenAPI 里意味着什么

- 用户在飞书 UI 可对文档设访问密码 / 加密分享。  
- **开放平台没有稳定的「password 字段读出来再在站点校验」的主路径。**  
- 应用侧表现通常是：**无权限 → 拉 meta/blocks 失败（403 / permission denied）**。  
- FeiShow 策略：  
  - 不实现 Notion 式「输入 123456 解锁」伪密码字段；  
  - **把飞书权限失败映射为页面级 `accessError` / PostLock**；  
  - 要阅读：把应用加成文档协作者，或文档对应用可见。

### 5.4 「复制」

- 由 `security_entity` 控制「谁可以复制内容/创建副本」。  
- 独立站是**自己渲染 HTML**，不经过飞书复制按钮。  
- 站点若要尊重「禁止复制」：可读 `permission_public.security_entity`，在前端禁用选中/复制（体验增强，非安全边界）。  
- **不要**指望靠飞书设置阻止用户对公开网页的复制。

### 5.5 应用调用前提（每次必满足）

1. 应用开通 scope：`docx:document:readonly`（或更广）、需要 wiki 时 `wiki:wiki:readonly`、素材 `docs:document.media:download` 等。  
2. **资源级授权**：文档/知识库把应用加为可读（「添加文档应用」或知识库成员）。  
3. `tenant_access_token` 调用；token 失效重试（本仓库 client 已做）。

---

## 6. 标准调用顺序（实现 checklist）

```text
输入：wiki URL 或 node_token 或 docx id
  │
  ├─1─ 若是 wiki URL/token
  │      GET /wiki/v2/spaces/get_node?token=
  │      → space_id, node_token, obj_token, obj_type, title, times, has_child, parent
  │
  ├─2─ 若 obj_type != docx
  │      → 非文章（目录/多维表/表格…），走树节点或嵌入卡片，不拉 blocks
  │
  ├─3─ document_id = obj_token
  │      GET /docx/v1/documents/{document_id}
  │      → title, revision_id, cover?, display_setting?
  │
  ├─4─ （可选）权限
  │      GET /drive/v1/permissions/{document_id}/public?type=docx
  │      或 wiki token + type=wiki
  │      → link_share / security_entity …
  │
  ├─5─ GET /docx/v1/documents/{document_id}/blocks?page_size=500
  │      分页直到 !has_more
  │      → items[] block 树
  │
  └─6─ 渲染时遇 image/cover/file
         GET /drive/v1/medias/{token}/download
         （经站点 /api/media 代理 + 缓存）
```

列表（父页下文章）：

```text
get_node(list_root) → space_id
nodes(space_id, parent=list_root) 分页
  过滤 obj_type=docx（或 has_child 作目录）
  每篇再走上面 3–6（正文可懒加载）
```

---

## 7. 与 Notion「一篇 Page」字段对照（避免误期待）

| Notion Page 常见 | 飞书对应 | 说明 |
|---|---|---|
| page id | `document_id` / `node_token` | 两套 id |
| title | title | 有 |
| icon | **无稳定 OpenAPI** | 勿强依赖 |
| cover | `cover.token` | 有则用 |
| properties（status/slug/tags…） | **文档上没有** | 要属性走多维表格（另文） |
| password 属性 | **无同构字段** | 权限失败处理 |
| blocks | docx blocks | 结构不同 |
| parent database | wiki parent / bitable 行 | 模型不同 |

---

## 8. 本仓库代码落点

| 能力 | 文件 |
|---|---|
| token / 重试 | `src/lib/feishu/auth.ts`, `client.ts` |
| wiki 节点 | `src/lib/feishu/wiki.ts` |
| 树 / 列表 | `src/lib/feishu/tree.ts` |
| docx meta + blocks | `src/lib/feishu/docx.ts` |
| 块规范化 | `src/lib/feishu/normalize.ts` |
| 素材代理 | `src/app/api/media/[token]/route.ts` |
| 稳定路径总览 | `docs/STABLE_FEISHU_DATA.md` |
| block 映射 | `docs/FEISHU_BLOCK_MAPPING.md` |

---

## 9. 站点「一篇文章」推荐中间模型（实现用）

后续代码应对齐此形状（概念层，非强制类名）：

```ts
type FeishuArticle = {
  // 身份
  nodeToken?: string;       // wiki
  documentId: string;       // docx
  spaceId?: string;
  parentNodeToken?: string;
  hasChild?: boolean;
  objType: "docx" | string;

  // 展示
  title: string;
  createdAt?: string;       // ISO
  updatedAt?: string;       // ISO
  cover?: { token: string; offsetX?: number; offsetY?: number };
  displaySetting?: {
    showAuthors?: boolean;
    showCreateTime?: boolean;
    // ...
  };

  // 权限（可选拉取）
  permission?: {
    linkShare?: string;     // anyone_readable | tenant_readable | closed | ...
    securityEntity?: string;
    lockSwitch?: boolean;
    raw?: unknown;
  };
  accessError?: string;     // 拉数失败时给人看

  // 正文
  revisionId?: number;
  blocks: FeishuRawBlock[]; // 或规范化后的 FeishuPageContent
};
```

---

## 10. 明确不做 / 后置

| 项 | 原因 |
|---|---|
| 浏览器 protobuf 正文 | 不稳定 |
| 文档上的 Notion 式自定义属性 | 飞书文档无此模型 → 多维表格另文 |
| OpenAPI 读取「访问密码明文」 | 无此主路径 |
| 强制文档图标 | 无稳定字段 |
| 飞书 PV/点赞当站点统计 | 权限与产品边界 |

---

## 11. 验收（文档调用是否「说清楚」）

实现或联调时，对任意一篇样例应能回答：

1. 它的 `node_token` 和 `document_id` 各是什么？  
2. 标题从 wiki 还是 docx meta 取？  
3. 有没有 `cover.token`？怎么下载？  
4. blocks 是否分页拉全？  
5. 无权限时错误码/文案如何映射到 `accessError`？  
6. 若查了 `permission_public`，`link_share_entity` / `security_entity` 是什么？

---

## 12. 下一步（你指定的顺序）

1. ✅ **本文：文档调用契约**  
2. ⏭ **下一篇：多维表格作配置源**（对照 NotionNext 配置中心逻辑，只谈读配置，不谈展示）

多维表格文档未写之前，**不要**把站点配置绑死在某张表字段上。


相关：多维表格配置中心见 [docs/FEISHU_BITABLE_CONFIG_CONTRACT.md](docs/FEISHU_BITABLE_CONFIG_CONTRACT.md)。
