# 飞书知识库：如何拿到「文档列表」

目标：从**当前知识库**拿到文档标题、链接、token 等，供多维表格索引 / FeishuNext 站点使用。

结论先说：

1. **有稳定官方 API** 能列知识库节点（标题 / token / 类型 / 父子）。
2. **全部需要鉴权**（`tenant_access_token` 或 `user_access_token`）。
3. **没有**「复制多维表格模板后、HTTP 自动化零配置就能用」的公开免鉴权列表接口。
4. 列表是**按父节点分页一层一层拿**，不是一次返回整棵树。

---

## 1. 推荐主路径（官方 OpenAPI）

### 1.1 单节点元信息（从 wiki 链接起步）

任意 `https://xxx.feishu.cn/wiki/{wiki_token}`：

```http
GET /open-apis/wiki/v2/spaces/get_node?token={wiki_token}
Authorization: Bearer {tenant_access_token}
```

文档：https://open.feishu.cn/document/server-docs/docs/wiki-v2/space-node/get_node

关键返回：

| 字段 | 含义 |
|---|---|
| `title` | 标题 |
| `node_token` | 知识库节点 token（拼 wiki URL） |
| `obj_token` | 真实云文档 token（docx 用这个拉正文） |
| `obj_type` | `docx` / `bitable` / `sheet` / … |
| `space_id` | 知识空间 ID（列子节点必须用） |
| `parent_node_token` | 父节点 |
| `has_child` | 是否有子节点 |

权限：`wiki:node:read` 或 `wiki:wiki:readonly`，且应用对该节点可读。

### 1.2 子节点列表（真正的「文档列表」）

```http
GET /open-apis/wiki/v2/spaces/{space_id}/nodes?parent_node_token={parent}&page_size=50
Authorization: Bearer {tenant_access_token}
```

- 不传 `parent_node_token`：拉该空间**根下一级**节点  
- 传父节点 token：拉该父下的**直接子节点**  
- `page_size` 最大 50；`has_more` + `page_token` 继续翻页  

文档：https://open.feishu.cn/document/server-docs/docs/wiki-v2/space-node/list

每条 item 典型字段：

```json
{
  "space_id": "...",
  "node_token": "wik...",
  "obj_token": "doxcn... 或 bascn...",
  "obj_type": "docx",
  "title": "文档标题",
  "parent_node_token": "...",
  "has_child": true,
  "obj_create_time": "1642402428",
  "obj_edit_time": "1642402428",
  "url": "https://xxx.feishu.cn/wiki/..."
}
```

拼链接（若响应无 `url`）：

```text
https://{tenant}.feishu.cn/wiki/{node_token}
```

权限：`wiki:node:retrieve` 或 `wiki:wiki:readonly`，且对**父节点**有阅读权限。

### 1.3 知识空间列表

```http
GET /open-apis/wiki/v2/spaces?page_size=20
```

只返回**应用已被添加为成员/管理员**的空间。  
tenant token 下若应用没加入任何知识库，会 `items: []`。

文档：https://open.feishu.cn/document/server-docs/docs/wiki-v2/space/list

### 1.4 搜索（一般不用于「全量列表同步」）

```http
POST /open-apis/wiki/v2/nodes/search
```

- 凭证要求：**仅 `user_access_token`**（用户身份）  
- 按关键词搜，不是全量树遍历  
- 不适合作为 Bitable 自动化 + 应用身份的主路径  

---

## 2. 推荐调用顺序（FeishuNext / 同步服务）

```text
1) 用户配置：WIKI 根链接 或 space_id + 根 node_token
2) get_node(token) → space_id + 根节点信息
3) BFS / 递归：
     nodes(space_id, parent=当前节点)
     对 has_child=true 的节点继续下钻
4) 过滤 obj_type（常见只要 docx）
5) 写入多维表格：
     标题=title
     文档=obj_token 或 wiki URL
     可选：node_token / 父节点 / 更新时间
```

注意：

- 接口是**单层列表**，不是整树一包。  
- 权限过滤可能导致某一页 `items` 为空但 `has_more=true`，仍要继续分页。  
- 根节点列表需要**知识空间级读权限**；只对某子树授权时，从该子节点 `parent_node_token` 下钻更稳。

---

## 3. 不要当主路径的网页接口

| 接口 | 说明 |
|---|---|
| `GET /space/api/wiki/v2/tree/get_node/` | 浏览器会话 API，无 cookie → `Login Required` |
| 其它 wiki 页内 XHR / protobuf | 无开放契约，改版即炸 |

样本见 `docs/samples/feishu-live-api-probe/`。

---

## 4. 和「多维表格自动化 + 模板」的关系

### 4.1 你设想的链路

```text
Wiki 新建文档
  → 多维表格自动化 HTTP 请求
  → 拉知识库列表 / 节点信息
  → 写回表格字段
```

技术上可行：自动化里 HTTP 调上面的 OpenAPI。  
但 **HTTP 必须带 Bearer token**，没有免鉴权版。

### 4.2 模板复制为什么会卡

| 点 | 现实 |
|---|---|
| 复制多维表格模板 | 自动化流程可以复制 |
| 复制里的 `APP_SECRET` / token | **不能**安全地随模板共享给别人租户 |
| 别人打开模板直接用 | 必须自己建应用、开权限、把机器人加入知识库、再填密钥 |

所以：

> 「做成可复制模板 + 自动化 HTTP 拉 wiki 列表」  
> 可以当**安装向导**（用户自己填凭证），  
> **不能**当 NotionNext 那种「公开链接免配置」体验。

### 4.3 更适合模板/产品的三种做法

| 方案 | 做法 | 鉴权放哪 | 模板友好度 |
|---|---|---|---|
| A. 站点侧同步（推荐） | FeishuNext 定时/Webhook：wiki nodes → 写 bitable 或直接当索引 | `.env` 里 APP_ID/SECRET | 高：表格只是数据，密钥在站点部署处 |
| B. 表格自动化 | 自动化 HTTP 调 wiki OpenAPI 写本表 | 自动化配置里的密钥变量 | 中：每个复制者要自己填密钥 |
| C. 半自动 | 人不填表，只在飞书写 wiki；站点直接读 wiki 树当列表 | 站点 `.env` | 高；但缺 status/slug 等业务字段，需另约定 |

FeishuNext 当前主模型仍是：**Bitable = 发布索引，Wiki/Docx = 正文**。  
Wiki 列表 API 适合：

- 自动补全「文档」列 / 标题  
- 文档站侧栏树  
- 可选的 Wiki→Bitable 同步任务  

不适合指望「纯表格内免密钥自动化」做成通用模板。

---

## 5. 权限 checklist

应用开放平台开启（任一即可，按文档最小权限）：

- `wiki:wiki:readonly` 或更细：`wiki:node:read` / `wiki:node:retrieve` / `wiki:space:retrieve`

知识库侧：

1. 将应用机器人加为知识库**成员或管理员**  
2. 或对目标节点授权应用可读  

否则常见：

- `get_node` 成功（单节点已授过权）  
- 但 `spaces/{id}/nodes` 根列表 `131006 permission denied`  
- 或 `spaces` 列表 `items: []`

---

## 6. 最小 curl 手测

```bash
# 1) token
TOKEN=$(curl -s -X POST "https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal" \
  -H "Content-Type: application/json" \
  -d '{"app_id":"'"$FEISHU_APP_ID"'","app_secret":"'"$FEISHU_APP_SECRET"'"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['tenant_access_token'])")

# 2) 从任意 wiki 链接 token 拿 space_id
curl -s "https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node?token=WIKI_TOKEN" \
  -H "Authorization: Bearer $TOKEN"

# 3) 列子节点（SPACE_ID 来自上一步；PARENT 可空=根下一级）
curl -s "https://open.feishu.cn/open-apis/wiki/v2/spaces/SPACE_ID/nodes?page_size=50&parent_node_token=PARENT" \
  -H "Authorization: Bearer $TOKEN"
```

本仓库曾用应用实测：

- `get_node`：`code=0`，返回 title / space_id / obj_token  
- `nodes?parent_node_token=某已授权节点`：`code=0`，返回子节点 `title/node_token/obj_token/url`  
- `nodes` 不带 parent（整库根）：若应用不是空间成员 → `131006`  
- `spaces` 列表：应用未加入任何库 → `items: []`

---

## 7. 和 FeishuNext 现有代码

| 能力 | 现状 |
|---|---|
| `get_node` | `src/lib/feishu/wiki.ts` 已实现 |
| 子节点 `nodes` 列表 | 嵌入预览用过类似路径（`embed-meta.ts`）；**全库 BFS 同步尚未产品化** |
| 站点索引 | 仍以 bitable `records/search` 为主（见 `STABLE_FEISHU_DATA.md`） |

下一步若做 Wiki→Bitable：在服务端实现 BFS list + upsert 记录即可，不必塞进「可复制表格自动化密钥」。
