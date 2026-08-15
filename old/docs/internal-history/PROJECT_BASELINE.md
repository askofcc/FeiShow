# FeishuNext 项目基线总文档

> **动机与边界（项目灵魂）：** 见 [PROJECT_SOUL.md](./PROJECT_SOUL.md)——痛点是飞书 JSON 为编辑/权限而生、展示难用；价值是结构化清洗；AI 就绪后置。  
> 用途：把「为什么做 → 三块数据 → API → 前端能否 1:1」说死，作为后续开发的唯一总纲。  
> 日期：2026-07-23  
> 状态：内容配置以用户设计为准；代码读取器尚未完全按本表简化模型重写。

---

## 1. 为什么做（必要性）

### 1.0 灵魂摘要

| 层 | 内容 |
|---|---|
| 痛点 | 飞书文档 API JSON **不可直接当展示正文**（为编辑/管理/权限设计） |
| 价值 | **清洗 → 结构化中间模型 → 站点渲染**（只读展示场景） |
| 相对官方 | 官方强在「写与管」；我们强在「对外展示与再分发」 |
| 阶段 | **① 数据结构化（当前）** → ② AI 就绪度（后置，见灵魂文档） |

详述：[PROJECT_SOUL.md](./PROJECT_SOUL.md)

### 1.1 问题

团队/个人内容已经写在**飞书**（知识库 + 云文档），但飞书默认公开阅读体验：

- 偏「协作工具」，不是独立内容站  
- SEO / 自定义域名 / 主题 / 归档搜索 弱或缺失  
- 难做成对外帮助中心 / 博客 / changelog / 轻量官网  

Notion 侧已有成熟方案 **NotionNext**：Notion 当 CMS，Next.js 做公开站。

### 1.2 目标

做 **FeishuNext**：飞书当内容后台，独立站当对外 Web 资产。

产品形态对齐 NotionNext（列表、文章、菜单、配置、SEO），**数据与内容模型按飞书重做**。

### 1.3 可行性结论（调研后）

| 判断 | 结论 |
|---|---|
| 飞书能否当 CMS | **能**，官方 OpenAPI 稳定 |
| 能否「前端零改接 Notion 渲染器」 | **不能**（无 recordMap） |
| 正确路径 | 飞书数据 → 中间模型 → 自研/移植站点壳 + FeishuRenderer |
| 难度 | 中等；卡点在内容模型与渲染，不在 Next 框架 |

详见历史结论：`docs/STABLE_FEISHU_DATA.md`、`docs/FEISHU_NATIVE_MODEL.md`。

---

## 2. 数据核心只有三块

```text
① 飞书文档（展示正文）
② 内容配置多维表格（站里有什么、菜单/文章/页面/分类怎么组织）
③ 站点前端配置（TITLE/主题开关等，CONFIG-TABLE 或 env）
```

| # | 名称 | 飞书载体 | 读还是展示 | 契约文档 |
|---|---|---|---|---|
| ① | 文档正文 | Docx + 可选 Wiki 节点 | **展示** | [FEISHU_DOCUMENT_CONTRACT.md](../feishu/FEISHU_DOCUMENT_CONTRACT.md) |
| ② | 内容索引/导航 | 多维表格「Notion 博客」 | **配置站结构**（少量字段驱动展示） | **本文 §3** |
| ③ | 站点配置 | CONFIG-TABLE 多维表 / env | **只读配置** | [FEISHU_BITABLE_CONFIG_CONTRACT.md](../feishu/FEISHU_BITABLE_CONFIG_CONTRACT.md) |

**原则：**

- ① 不承担 status/slug/tags 等「站点业务字段」（文档上没有 Notion 那种 properties）。  
- ② 只描述「站里挂什么、怎么导航」，**不**写长文。  
- ③ 只描述「站怎么长什么样」，**不**当文章库。

---

## 3. 内容配置表（核心 #2）——用户简化模型

### 3.1 表位置

- Wiki：https://test-d2al261ggga5.feishu.cn/wiki/D6khw3w32iSKkfkiLFUcOoDenMd  
- `app_token`：`TafHbLNMTazT6NsnFgEcTry6n8c`  
- 数据表：`tbl6eQEHZ6ShGBk5`（名：Notion 博客）  

相对 Notion Database「一行=一页+一堆属性」：**更简单**——类型收成少数几种，分类列表只挂父文档，子文自动展开。

### 3.2 类型（`类型` 单选）——以用户意图为准

当前表选项含：`文章 | 页面 | 公告 | 菜单 | 子菜单 | 配置 | 分类`。

**产品主路径只认真对待四类：**

| 类型 | 含义 | 表格里主要填什么 | 站点行为 |
|---|---|---|---|
| **菜单** | 顶栏/导航项 | 标题、跳转（Slug/链接）、图标、排序（可用发布时间或后续「排序」列）、子菜单 | 生成导航，**不渲染长文** |
| **子菜单** | 挂在上一菜单下 | 标题、跳转 | 二级导航 |
| **文章** | 博客/列表内容 | 标题、摘要（可选）、**文档**链接、分类/标签（可选） | 进文章列表；正文读 ① |
| **页面** | 独立页模板（非列表流） | 标题、**文档**、Slug/路径 | 独立路由模板（about/links 等） |
| **分类** | 分类入口 = 父级文档 | 标题、**文档=父 wiki** | **不**在表里建子行；自动 `wiki nodes` 拉子文档当文章列表 |

其余（公告/配置/旧状态字段）可兼容，但不作为简化模型的核心。

### 3.3 字段：该留 vs 可弃

用户明确：**很多 Notion 多余字段不需要。**

#### 建议保留（简化模型）

| 字段 | 谁用 | 说明 |
|---|---|---|
| **标题** | 全部 | 导航名 / 列表标题；文档标题可回退 |
| **类型** | 全部 | 菜单 / 子菜单 / 文章 / 页面 / 分类 |
| **文档** | 文章、页面、分类 | Wiki/Docx 链接或 mention；分类填**父级** |
| **Slug** | 菜单、页面（可选） | 跳转路径或外链；**文章可不填**，用 `node_token` |
| **图标** | 菜单 | 图标名或 class 提示 |
| **摘要** | 文章/页面（可选） | 列表摘要；空则截正文 |
| **发布时间** | 文章/排序（可选） | 排序或展示日期；也可用文档 edit_time |

#### 可弱化 / 忽略（相对 Notion）

| 字段 | 原因 |
|---|---|
| 状态（已发布/草稿） | 用户已倾向「树上/表里出现即可」；若保留仅作过滤 |
| 标签 / 分类（文章属性） | 分类用「类型=分类+父文档」更贴飞书；标签可选 |
| 密码 | 不走表字段；文档权限见 ① |
| 配置类型行 | 站点配置改走 ③ CONFIG-TABLE |
| 残留空列 Single option / Date / Attachment | 表模板残留，实现时忽略 |

### 3.4 四类行为细则

#### A. 菜单

```text
标题 = 显示名
Slug 或 链接 = 跳转目标（/、/search、/posts/xxx、外链）
图标 = 可选
子菜单 = 类型「子菜单」行，约定挂靠（顺序上紧跟上一个菜单，或后续加「父菜单」列）
```

站点：组装 `nav[]`，不请求 docx blocks。

#### B. 文章

```text
标题 + 文档（必填）
可选：摘要、发布时间、标签
```

站点：

1. 解析文档 → `document_id`  
2. 列表展示标题/摘要/日期  
3. 详情拉 blocks 渲染  

**不要求**自定义 slug；路由可用 `/posts/{node_token}`。

#### C. 页面

```text
与文章类似，但 type=页面
```

站点：走**页面模板**（无「最新文章流」或不同布局），不是 Blog 列表项。  
例如：关于、友链落地页。

#### D. 分类（关键简化点）

```text
类型 = 分类
文档 = 父级 wiki（其下挂子文档）
标题 = 分类名
```

站点：

```text
get_node(父) → list children(docx)
  → 每个子文档 = 该分类下的一篇文章
```

**表中不必**为每篇子文建行。这是相对 Notion「每行一篇」的飞书优势。

表中现有示例：`Posts 分类列表容器` → 文档指向父 wiki，Slug=`posts-list`。

### 3.5 与 Notion Database 对照

| NotionNext | 本表简化模型 |
|---|---|
| 每行 = Page + properties + body | 行 = 导航或索引；body 在飞书文档 |
| type: Post/Page/Menu/Config… | 菜单/子菜单/文章/页面/**分类** |
| 文章属性很多 | 属性尽量少 |
| Config 也在内容库 | 配置拆到 ③ |
| 无「父页自动展开」一等公民 | **分类=父文档自动子列表** |

---

## 4. 文档正文（核心 #1）摘要

完整字段见 [FEISHU_DOCUMENT_CONTRACT.md](../feishu/FEISHU_DOCUMENT_CONTRACT.md)。

实现时必须记住：

| 点 | 内容 |
|---|---|
| 双 ID | `node_token` ≠ `document_id` |
| 元信息 | title、cover、display_setting、revision |
| 正文 | blocks 分页 |
| 媒体 | medias download + 代理缓存 |
| 图标 | **无稳定 OpenAPI** |
| 密码 | **无明文配置字段**；无权限 → accessError |
| 复制限制 | `permission_public.security_entity` 可读，站点仅能做体验层 |

---

## 5. 站点前端配置（核心 #3）摘要

完整见 [FEISHU_BITABLE_CONFIG_CONTRACT.md](../feishu/FEISHU_BITABLE_CONFIG_CONTRACT.md)。

- 表：CONFIG-TABLE（`配置名/配置值/启用/备注`）  
- 逻辑同 NotionNext：仅启用行生效，可 JSON，可 `INLINE_CONFIG`  
- 优先级：CONFIG-TABLE > env > `site.config.ts`  
- **不负责**文章列表内容  

---

## 6. API 调用总图

```text
启动 / ISR
  │
  ├─ ③ 读 CONFIG-TABLE（可选）→ 合并站点配置
  │
  ├─ ② 读内容表 tbl6eQEHZ6ShGBk5
  │     ├─ 菜单/子菜单 → nav
  │     ├─ 页面 → 独立页路由
  │     ├─ 文章 → 列表项（+ 解析文档 id）
  │     └─ 分类 → wiki 子节点展开 → 多篇文章
  │
  └─ ① 对需要展示的 document_id
        meta + blocks + media
        （权限失败 → PostLock）
```

关键 OpenAPI：

| 步骤 | 接口 |
|---|---|
| 鉴权 | `POST .../auth/v3/tenant_access_token/internal` |
| 内容表 | `POST .../bitable/.../records/search` |
| Wiki 节点 | `GET .../wiki/v2/spaces/get_node` |
| 子文档列表 | `GET .../wiki/v2/spaces/{space_id}/nodes` |
| 文档 meta | `GET .../docx/v1/documents/{id}` |
| 正文 | `GET .../docx/v1/documents/{id}/blocks` |
| 素材 | `GET .../drive/v1/medias/{token}/download` |
| 权限设置 | `GET .../drive/v1/permissions/{token}/public?type=docx\|wiki` |

稳定路径说明：`docs/STABLE_FEISHU_DATA.md`。

---

## 7. 前端：能否「差不多 1:1」复刻 NotionNext？

### 7.1 可以 1:1 的（有本基线后）

| 能力 | 条件 |
|---|---|
| 站点壳（Header/菜单/列表/侧栏/归档/搜索/暗色/SEO） | 用 example 主题整包 + 适配器 |
| 文章阅读页版式 | FeishuRenderer + 同布局 |
| 菜单驱动导航 | 内容表「菜单/子菜单」 |
| 独立页面 | 内容表「页面」+ 页面模板 |
| 分类列表页 | 内容表「分类」+ 父文档子节点 |
| 站点级配置 | ③ CONFIG-TABLE |

这些**不依赖** Notion recordMap，只依赖清晰的 `SiteData` / `Post` / `nav`。

### 7.2 不能 1:1、只能兼容的

| NotionNext | 飞书现实 | 策略 |
|---|---|---|
| 行=页，属性极多 | 文档无 properties | ② 极简字段 + ① 正文 |
| pageIcon | 无稳定 API | 可选/空 |
| 密码属性 | 权限失败 | PostLock |
| react-notion-x 全块 | 另一套 blocks | FeishuRenderer 覆盖常用块 |
| 25 套主题热切换 | 维护成本 | 先锁 example |
| 评论/Live2D 等 | 插件 | 后置 |

### 7.3 对「你给全文档后，我能否自己跑完前端」的直接回答

**可以按 1:1 目标收敛前端壳与信息架构**，前提是：

1. 实现时**严格只认本文三块数据**，不再混用旧「纯 list-root 无表」与「全量 Notion 字段」两套心智。  
2. 前端以 **example 主题整包**为准，细节用对照页 + 自动验收，不靠口头抠 UI。  
3. 分类用父文档展开；文章/页面读 ①；配置读 ③。  

**不能保证**像素级等于 preview.tangly1024.com 的每一主题每一插件；  
**可以保证**同一信息架构下「看起来就是 NotionNext 站、数据来自飞书」。

---

## 8. 推荐实现优先级（有文档后的执行序）

1. **读 ② 内容表** → 分出 nav / pages / posts / categories  
2. **分类展开** → wiki children 合并进 posts  
3. **文章/页面详情** → ① meta+blocks+cover  
4. **读 ③** → 覆盖 TITLE/AUTHOR/开关  
5. **example 主题**只吃适配后的 props  
6. 自动验收路由 + 截图对照  

---

## 9. 相关文档索引

| 文档 | 内容 |
|---|---|
| 本文 | 总纲 + 内容表模型 |
| `FEISHU_DOCUMENT_CONTRACT.md` | ① 文档字段/权限/blocks |
| `FEISHU_BITABLE_CONFIG_CONTRACT.md` | ③ 站点配置表 |
| `STABLE_FEISHU_DATA.md` | API 稳定路径 |
| `WIKI_LIST_API.md` | 知识库列表 |
| `THEME_EXAMPLE_PORT.md` | 前端 example 整包策略 |
| `samples/feishu-config-table-setup.json` | 配置表示例 |
| `samples/feishu-notion-template-setup.json` | 早期模板搭建记录 |

---

## 10. 一句话

> **飞书文档负责「一篇长什么样」；内容多维表负责「站里有什么、菜单/分类怎么挂」；CONFIG 表负责「站叫什么、开哪些开关」。**  
> 三者清晰后，NotionNext 级前端可以按 example 主题整包收敛；不能抄的是 Notion 的数据宗教，不是 Next 的页面壳。
