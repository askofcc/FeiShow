# 飞书 Docx 块类型映射

> FeiShow **不**走 Notion `recordMap` + `react-notion-x`。
> 路径：`官方 Docx blocks` → `normalize` → `FeishuBlock` → `FeishuRenderer`。
> 目标是**阅读页观感**接近 NotionNext，而不是内部数据结构相同。

对照来源：

1. 飞书开放平台 Docx `BlockType` 枚举（`open.feishu.cn` 文档块数据结构）
2. 本仓库实测样本：`docs/samples/side-by-side-comparison.json`（`image = 27` 等）

## 第一版支持矩阵

| 官方 block_type | 官方名（约） | FeishuBlockType | 渲染表现 | 版本 |
|---:|---|---|---|---|
| 1 | Page | `page` | 根容器，只渲染 children | ✅ v1 |
| 2 | Text | `paragraph` | 正文段落，行高 ~1.75 | ✅ v1 |
| 3 | Heading1 | `heading1` | 文内一级标题（页顶标题另由 Post 渲染） | ✅ v1 |
| 4 | Heading2 | `heading2` | 二级标题 + 锚点 + TOC | ✅ v1 |
| 5 | Heading3 | `heading3` | 三级标题 + 锚点 + TOC | ✅ v1 |
| 6 | Heading4 | `heading4` | 四级标题 | ✅ v1 |
| 7 | Heading5 | `heading5` | 五级标题 | ✅ v1 |
| 8 | Heading6 | `heading6` | 六级标题 | ✅ v1 |
| 9 | Heading7 | `heading7` | 降级为 h6 视觉 | ✅ v1（映射为 heading6） |
| 10 | Heading8 | `heading8` | 降级为 h6 视觉 | ✅ v1（映射为 heading6） |
| 11 | Heading9 | `heading9` | 降级为 h6 视觉 | ✅ v1（映射为 heading6） |
| 12 | Bullet | `bullet` | 无序列表项，支持嵌套 | ✅ v1 |
| 13 | Ordered | `ordered` | 有序列表项，同级连续编号 | ✅ v1 |
| 14 | Code | `code` | 深色代码块 + 语言标签 | ✅ v1 |
| 15 | Quote | `quote` | 左侧色条引用 | ✅ v1 |
| 16 | Equation | `equation` | 行内/块级公式：等宽兜底展示 | ✅ v1 简版 |
| 17 | Todo | `todo` | 复选框 + 完成态删除线 | ✅ v1 |
| 18 | Bitable | `unknown` | 占位提示「嵌入多维表格」 | ⏳ 延后 |
| 19 | Callout | `callout` | 高亮提示框 + emoji | ✅ v1 |
| 20 | ChatCard | `unknown` | 占位 | ⏳ 延后 |
| 21 | Diagram | `unknown` | 占位（流程图等） | ⏳ 延后 |
| 22 | Divider | `divider` | 水平分割线 | ✅ v1 |
| 23 | File | `file` | 文件链接/附件名 | ✅ v1 简版 |
| 24 | Grid | `grid` | 分栏容器：横向排列 children | ✅ v1 简版 |
| 25 | GridColumn | `grid_column` | 分栏列：纵向 children | ✅ v1 简版 |
| 26 | Iframe | `embed` | 外链/嵌入 URL 链接卡片 | ✅ v1 简版 |
| 27 | Image | `image` | 图片（经 `/api/media/[token]`） | ✅ v1 |
| 28 | ISV | `unknown` | 占位 | ⏳ 延后 |
| 29 | Mindnote | `unknown` | 占位 | ⏳ 延后 |
| 30 | Sheet | `unknown` | 占位（电子表格） | ⏳ 延后 |
| 31 | Table | `table` | 表格（cells 矩阵 → table_cell） | ✅ v1 |
| 32 | TableCell | `table_cell` | 单元格（被 table 消费，不单独出块） | ✅ v1 |
| 33 | View | `unknown` | 占位 | ⏳ 延后 |
| 34 | QuoteContainer | `quote_container` | 引用容器：左边框 + children | ✅ v1 |
| 35 | Task | `unknown` | 占位 | ⏳ 延后 |
| 36–39 | OKR 系列 | `unknown` | 占位 | ⏳ 延后 |
| 40 | AddOns | `unknown` | 占位 | ⏳ 延后 |
| 41 | JiraIssue | `unknown` | 占位 | ⏳ 延后 |
| 42 | WikiCatalog | `unknown` | 占位 | ⏳ 延后 |
| 43 | Board | `unknown` | 占位 | ⏳ 延后 |
| 44–47 | Agenda 系列 | `unknown` | 占位 | ⏳ 延后 |
| 48 | LinkPreview | `bookmark` | 书签/链接预览卡片 | ✅ v1 简版 |
| 53 | ReferenceBase | `feishu_embed` (bitable) | 文档内嵌多维表：标题 + 前几行预览 | ✅ |
| 999 | Undefined / 占位 | `feishu_embed` (chart) | 仪表盘图、任务清单等：可见占位卡，不再静默丢弃 | ✅ |

> **注意**：早期草稿里曾把 `23→image`、`24→table`、`26→callout` 等写错。
> 以本表与 `normalize.ts` 的 `BLOCK_TYPE_MAP` 为准（`27=image`、`31=table`、`19=callout`、`22=divider`）。

## 富文本 TextRun

| 飞书 `text_element_style` | TextStyle | 渲染 |
|---|---|---|
| bold | bold | `<strong>` |
| italic | italic | `<em>` |
| strikethrough | strikethrough | 删除线 |
| underline | underline | 下划线 |
| inline_code | inlineCode | 行内 code 底色 |
| link.url | link | 外链（URL decode） |
| text_color / background_color | color / backgroundColor | 可选着色（v1 可忽略枚举色号） |
| mention_doc | link + 标题文本 | 文档提及链接 |
| equation | inlineCode 兜底 | 公式源码 |

## 数据流

```text
GET /docx/v1/documents/:id/blocks
  -> FeishuRawBlock[]
  -> normalizeBlock / normalizeDocument
  -> FeishuPageContent { blocks, blockMap, rootId }
  -> extractHeadings (heading*)
  -> <FeishuRenderer /> + <TableOfContents />
```

父子关系：

- `parent_id` + `children[]` 组成树
- `page` 为根，Renderer 从 root 递归
- `table.cells` 是扁平 cell id 列表，按 `row_size * column_size` 切成矩阵
- `table_cell` 的 children 才是真正单元格内容块

## 与 NotionNext 观感对齐点（v1）

| 维度 | NotionNext 参考 | FeiShow 实现 |
|---|---|---|
| 正文宽度 | ~720px | 文章主栏 `max-w-[720px]` |
| 字号行高 | 16px / ~1.7 | `.feishu-doc` 16px / 1.75 |
| 标题层级 | 大间距、字重阶梯 | h1–h6 独立 class |
| 代码块 | 深色、圆角 | `pre` 深色 + 语言角标 |
| 引用 | 左边框 | `quote` / `quote_container` |
| Callout | 浅底提示 | 琥珀色面板 + emoji |
| 列表 | 紧凑行距、可嵌套 | bullet/ordered/todo |
| TOC | 侧栏锚点 | 已有 headings → sticky TOC |
| 卡片壳 | 多数主题接近白底文档 | 去掉厚重卡片，接近文档页 |

## 明确不做（v1）

- 不生成 Notion `ExtendedRecordMap`
- 不引入 `notion-client` / `react-notion-x`
- 不渲染 Bitable / Sheet / Board / OKR 等重度嵌入组件（仅占位）
- 不依赖飞书网页端 protobuf / 会话接口

## 后续优先级建议

1. 图片 caption、对齐、多图网格
2. 代码高亮（Prism/Shiki，按需）
3. Callout 背景色号映射
4. 表格表头行样式 / 列宽
5. LinkPreview 抓取标题与 favicon（需服务端）
6. Bitable / Sheet 只读摘要卡
