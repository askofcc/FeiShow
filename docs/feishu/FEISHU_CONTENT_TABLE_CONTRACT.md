# 内容配置多维表格契约（核心 #2）

表：https://test-d2al261ggga5.feishu.cn/wiki/D6khw3w32iSKkfkiLFUcOoDenMd  

`app_token=TafHbLNMTazT6NsnFgEcTry6n8c`  
`table_id=tbl6eQEHZ6ShGBk5`

## 设计意图（相对 Notion 的简化）

- 不把「每篇文章的全部属性」堆在表里。  
- **分类**只挂一个父文档，子文自动从飞书树读。  
- **菜单**只管名字、链接、层级。  
- **文章 / 页面**才关联文档正文。

## 类型行为

| 类型 | 必填 | 站点 |
|---|---|---|
| 菜单 | 标题；Slug/链接 | 导航 |
| 子菜单 | 标题；Slug/链接 | 挂在上一菜单下 |
| 文章 | 标题；文档 | 列表 + 详情（读 docx） |
| 页面 | 标题；文档 | 独立页模板 |
| 分类 | 标题；文档=父 wiki | 自动展开子文档为文章 |

## 字段

**用：** 标题、类型、文档、Slug、图标、摘要、发布时间（排序/展示）  

**可忽略：** 状态/标签/密码/多余空列（除非以后明确启用）

## 文档列形态

支持文本 URL 或 mention：

```json
{
  "type": "mention",
  "mentionType": "Wiki",
  "token": "WVcXwGWVdiygsHkGS6LcbWbln4e",
  "link": "https://.../wiki/..."
}
```

解析时取 `token` 或 URL 中的 wiki/docx id，再 `get_node` → `obj_token`。

## 与 CONFIG-TABLE 区别

| | 内容表（本文） | CONFIG-TABLE |
|---|---|---|
| 管什么 | 菜单/文章/页面/分类 | TITLE、开关、FEISHU_LIST_ROOT… |
| 是否展示为文章 | 文章/页面会 | 否 |

总纲见 [PROJECT_BASELINE.md](../internal/PROJECT_BASELINE.md)。
