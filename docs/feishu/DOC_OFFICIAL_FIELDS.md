# 优先使用飞书文档官方字段

原则：**能从文档/Drive 官方接口拿的，不用站点 CONFIG、不用内容表日期列。**

## 来源

| 信息 | 官方接口 | 映射 |
|---|---|---|
| 创建时间 | `drive/v1/metas/batch_query` → `create_time` | `publishDate` / `publishDay` |
| 最后修改 | 同上 → `latest_modify_time` | `lastEditedDate` / `lastEditedDay` |
| 所有者 ID | 同上 → `owner_id` | `ext.authorId` |
| 最近编辑者 ID | 同上 → `latest_modify_user` | `ext.lastEditorId` |
| 作者显示名 | `contact/v3/users/:id`（需权限）或 `view_records` 名 | `author` |
| 封面 | `docx/v1/documents/:id` → `cover` | `pageCoverThumbnail` |
| 展示开关 | 同上 → `display_setting` | `showAuthors` 等 |
| 点赞/PV/UV | `drive/v1/files/:token/statistics` | `likeCount`/`pv`/`uv` |
| 评论数 | `drive/v1/files/:token/comments` | `commentCount` |

## 不优先用

- 内容表「发布时间」列（仅当官方时间缺失时兜底）
- CONFIG `AUTHOR` 作为文章作者（站点级作者仍可用于页脚等）

## 权限说明

- 通讯录读用户可能 41012 → `author` 为空，但时间/统计仍可用
- 开通 contact 相关权限后作者名可自动补齐
