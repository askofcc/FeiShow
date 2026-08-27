# 飞书数据层

取数、清洗、主题和 Agent **都只消费处理后的结构**，不要直接打飞书 OpenAPI。

| 文档 | 内容 |
|---|---|
| [**AGENT_API.md**](./AGENT_API.md) | 拿走结构化数据：llms / 列表 JSON / 单篇 JSON+Markdown |
| [THEME_DATA_CONTRACT.md](./THEME_DATA_CONTRACT.md) | 主题：SiteData / post 怎么用 |
| [STABLE_FEISHU_DATA.md](./STABLE_FEISHU_DATA.md) | 官方 OpenAPI 主路径 |
| [FEISHU_DOCUMENT_CONTRACT.md](./FEISHU_DOCUMENT_CONTRACT.md) | 单篇文档字段、权限、blocks |
| [FEISHU_CONTENT_TABLE_CONTRACT.md](./FEISHU_CONTENT_TABLE_CONTRACT.md) | 内容表 |
| [FEISHU_BITABLE_CONFIG_CONTRACT.md](./FEISHU_BITABLE_CONFIG_CONTRACT.md) | CONFIG 表 |
| [CONFIG_SOURCES.md](./CONFIG_SOURCES.md) | 配置中心 vs env（Docker / Vercel） |
| [FEISHU_BLOCK_MAPPING.md](./FEISHU_BLOCK_MAPPING.md) | 块类型映射 |
| [WIKI_LIST_API.md](./WIKI_LIST_API.md) | 知识库子节点列表 |
| [DOC_OFFICIAL_FIELDS.md](./DOC_OFFICIAL_FIELDS.md) | 官方文档字段备忘 |
| [META_AND_SUMMARY.md](./META_AND_SUMMARY.md) | meta / 摘要 |
| [samples/](./samples/) | 样本 |

