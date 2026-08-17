# 本地工作区约定（与远端对齐）

> 更新：2026-07-28  
> 目的：本地目录、Git 分支、远端仓库 **一张图说清**，避免再开平行半成品。

---

## 1. 唯一产品路径

| | |
|---|---|
| **本地文件夹** | `/Users/qiushuanglong/Documents/FeishuNext` |
| **GitHub** | https://github.com/askofcc/FeishuNext （可私有） |
| **产品分支** | **仅 `main`**（`origin/main`） |
| **演示** | https://feishunext.srint.cn/ |
| **上游只读** | `upstream` → https://github.com/notionnext-org/NotionNext （跟踪主题/壳，不在此开功能分支） |

```bash
cd /Users/qiushuanglong/Documents/FeishuNext
git status -sb          # 应在 main，跟踪 origin/main
git branch -r           # 产品侧只应看到 origin/main（外加 upstream/* 只读）
```

---

## 2. 不要再当主工程的本地目录

| 路径 | 处理 |
|---|---|
| `Documents/_archive/FeishuNext-legacy-app-router-2026-07` | 早期 App Router 实验 + 旧文档样本，**归档** |
| 曾用名 `Documents/notionnext-feishu` | **已改名为** `Documents/FeishuNext`（与仓库名一致） |
| `Documents/feishu-ops` | 独立小工具（填表/建表 CLI·MCP），**不是站点产品仓** |

归档说明：`Documents/_archive/README.md`。

---

## 3. 分支策略（远端）

| 允许 | 说明 |
|---|---|
| `main` | 唯一长期产品分支；部署跟 main |
| 短期 `fix/*` / `feat/*` | 可选；合并进 main 后 **立刻删远程分支** |
| `upstream/main` | 不是我们的功能分支，只是 remote-tracking |

**禁止：** 长期并存 `feishu/main`、`develop`、`chore/*` 等与 main 平行的「第二主线」。

删远程杂支示例：

```bash
git push origin --delete <branch>
git fetch --prune origin
```

---

## 4. 日常最小命令

```bash
cd /Users/qiushuanglong/Documents/FeishuNext
git checkout main
git pull origin main
# 开发…
git add -A && git status
git commit -m "…"
git push origin main
```

---

## 5. 和 Codex / 多工作区

- 打开产品：工作区根目录选 **`Documents/FeishuNext`**  
- 不要同时把 legacy 归档目录当可写主仓  
- `feishu-ops` 仅在「操作飞书表/文档」任务时使用  


## 6. 仓库内不再放 `old/`

2026-08-17 起，Git 产品树**不再包含**上游 NotionNext 文档站 / 配图 / 治理包装（原 `old/`，约 173MB）。  
上游 README 备份仅在 `docs/upstream/`；本地历史目录仍可在 `Documents/_archive/`。
