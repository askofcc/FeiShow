# 上游说明（NotionNext）

## 身份

| | |
|---|---|
| 上游 | [notionnext-org/NotionNext](https://github.com/notionnext-org/NotionNext) |
| 本仓库 | [askofcc/FeishuNext](https://github.com/askofcc/FeishuNext) |
| 许可证 | MIT（保留根目录 `LICENSE` 中 tangly1024 版权） |
| 产品名 | **FeishuNext**（不是官方 NotionNext） |
| 演示 | https://feishunext.srint.cn/ |

## Git remotes（建议）

```text
origin    → git@github.com:askofcc/FeishuNext.git
upstream  → https://github.com/notionnext-org/NotionNext.git
```

工作分支示例：`feishu/main`（飞书产品线）。

## 同步策略

**要拿：** `themes/*`、壳层 bugfix、与 CMS 无关的通用组件/SEO 修复。  
**不拿 / 慎拿：** `lib/db/notion/*`、recordMap 主链路、官方品牌 README、治理文档。  
**永远保护：** `lib/feishu/**`、`lib/site/adapters/feishu/**`、`components/feishu/**`、`NotionPage` 飞书分流、`docs/feishu/**`。

### 推荐流程

```bash
git fetch upstream
git log feishu/main..upstream/main --oneline -- themes components pages
# 小改 cherry-pick；主题目录可：
#   git checkout upstream/main -- themes/example
# 然后飞书 live 冒烟：首页 + 文章 + example/simple
```

验收必须用 `CMS_PROVIDER=feishu` 与真实飞书表，不要用 Notion demo 当通过标准。

每次同步建议在 commit message 注明：`upstream: <date/sha> 合入… / 跳过…`。

## 减少分支列表噪音

默认 `git fetch upstream` 会把 NotionNext **所有**远程分支拉成 `remotes/upstream/*`（上百条 codex/deploy/release），看起来像「本仓库分支爆炸」。

建议只跟踪上游 main：

```bash
git config remote.upstream.fetch '+refs/heads/main:refs/remotes/upstream/main'
git fetch upstream --prune
```

本产品日常只使用本地 **`feishu/main`**。
