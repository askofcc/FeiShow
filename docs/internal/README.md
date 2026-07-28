# FeishuNext 内部文档

> 项目**讨论、决策、阶段、运维、仓库管理**。  
> 给自己 / 协作者回看用；不是飞书字段 API 手册。

## 先读

| 文档 | 内容 |
|---|---|
| [DECISION_LOG.md](./DECISION_LOG.md) | 从要不要做到定案、阶段完成、运维注意 |
| [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) | 结构、数据流、分支、路线图 |
| [PROJECT_SOUL.md](./PROJECT_SOUL.md) | 痛点 / 价值 / 竞争力边界 |
| [REPO_MAP.md](./REPO_MAP.md) | 目录与分支怎么看 |

## 规划与验收

| 文档 | 内容 |
|---|---|
| [PROJECT_BASELINE.md](./PROJECT_BASELINE.md) | 三块数据总纲 |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | 二开实施计划 |
| [TASKS.md](./TASKS.md) | 任务清单 |
| [PHASE4_VERIFY.md](./PHASE4_VERIFY.md) | 阶段验收记录 |
| [UPSTREAM.md](./UPSTREAM.md) | 如何跟 NotionNext 前端 |

## 技术契约（数据层）

字段、API、主题如何调数据 → **[../feishu/](../feishu/)**（单独文件夹，给实现/开主题用）。

## 产品入口

根目录 [README.md](../../README.md) · 演示 https://feishunext.srint.cn/

## 分支

产品只保留 **`main`**（`origin/main`）。  
`upstream/main` 为 NotionNext 只读跟踪，不是功能分支。
