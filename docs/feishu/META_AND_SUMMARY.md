# 文档 Meta 与摘要补全

## getDocumentMeta（完整）

`GET /docx/v1/documents/:id` 现完整保留：

- `title` / `revision_id`
- `cover.token` + offset
- `display_setting`（show_authors / show_create_time / …）

详情 enrich 写入：

- `pageCoverThumbnail` = `/api/feishu/media/{token}`
- `showAuthors` / `showCreateTime` / `feishuDisplaySetting`
- `summary` 优先表字段，否则正文截断

## 分类子文档摘要

树节点无 summary 字段。`fillMissingSummaries`：

1. 对 `post/page/notice` 且 summary 空
2. `listDocumentBlocksFirstPage`（约 40 块）
3. plainText 截断 120 字
4. 并发 4

列表构建时对文章/页面/公告执行；封面用 `fillMissingCovers`（meta only）。

## 类型

| 类型 | 列表 | 详情 |
|---|---|---|
| 文章 Post | 摘要+封面可补全 | 全 meta + blocks |
| 页面 Page | 同上，进 allNavPages | 同 enrich |
| 公告 Notice | siteData.notice | 同 enrich |
| 分类子文 | 展开后补 summary | 同文章 |

图标：仍无稳定 OpenAPI；仅内容表「图标」列。
