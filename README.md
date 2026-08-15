# FeishuNext

把**飞书**多维表格 + 云文档，发布成可访问、可 SEO 的独立站点。

演示站：[https://feishunext.srint.cn/](https://feishunext.srint.cn/)  
仓库：[https://github.com/askofcc/FeishuNext](https://github.com/askofcc/FeishuNext)（当前可为私有）

---

## 这是什么

| | |
|---|---|
| **内容后台** | 飞书（知识库 / 云文档 / 多维表格） |
| **站点前端** | 基于 [NotionNext](https://github.com/notionnext-org/NotionNext)（MIT）的主题与站点壳二开 |
| **数据层** | 自研：飞书 OpenAPI → 结构化中间模型 → 渲染 |

一句话：官方飞书强在**编辑与权限**；FeishuNext 补齐**对外展示**（以及后续的 AI 就绪数据出口）。

**回看讨论与运维共识：** [docs/internal/DECISION_LOG.md](./docs/internal/DECISION_LOG.md)  
**通读结构总览：** [docs/internal/PROJECT_GUIDE.md](./docs/internal/PROJECT_GUIDE.md)  
**阶段 A 完成 / 部署前总检：** [docs/internal/PHASE_A_COMPLETE.md](./docs/internal/PHASE_A_COMPLETE.md)  

项目灵魂：[docs/internal/PROJECT_SOUL.md](./docs/internal/PROJECT_SOUL.md) · 主题数据契约：[docs/feishu/THEME_DATA_CONTRACT.md](./docs/feishu/THEME_DATA_CONTRACT.md)  
**拿走结构化数据（JSON / Markdown）：** [docs/feishu/AGENT_API.md](./docs/feishu/AGENT_API.md) · 仓库地图：[docs/internal/REPO_MAP.md](./docs/internal/REPO_MAP.md)

---

## 与 NotionNext 的关系

- **前端壳 / 主题 / SEO / 布局**：大量基于 NotionNext 开源项目（MIT）。
- **本仓库不是** NotionNext 官方 fork 维护分支；Issue / PR 请开到 **askofcc/FeishuNext**。
- **数据源已替换为飞书**；不要按 Notion 官方教程填 `NOTION_PAGE_ID` 当主路径。
- 上游同步策略：[docs/internal/UPSTREAM.md](./docs/internal/UPSTREAM.md)
- 原版 NotionNext README 备份：[old/docs/upstream/README.NotionNext.md](./old/docs/upstream/README.NotionNext.md)

### Credits

感谢 [tangly1024](https://github.com/tangly1024) / [notionnext-org](https://github.com/notionnext-org) 开源 [NotionNext](https://github.com/notionnext-org/NotionNext)。  
本仓库保留其 MIT `LICENSE` 与版权声明；产品品牌与默认为 **FeishuNext**。

---

## 部署（最少步骤）

用户只配 **3 个变量**。详细图文：[最少步骤部署](./docs/deploy/feishu-minimal.md)

1. 准备一个飞书知识库**根页**（下挂内容表 + 可选 CONFIG 表）  
2. 创建企业自建应用，开通文档/知识库/多维表格**读权限并发布**  
3. 一键部署到 Vercel，只填：

| 变量 | 含义 |
|---|---|
| `FEISHU_APP_ID` | 开放平台 App ID |
| `FEISHU_APP_SECRET` | App Secret |
| `FEISHU_SITE_ROOT` | 根页链接 `https://xxx.feishu.cn/wiki/…` |

4. 把该应用加成根页的**可阅读**协作者  

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeishuNext&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=Only%20three%20vars%3A%20App%20ID%2C%20Secret%2C%20wiki%20root%20URL&project-name=feishunext&repository-name=FeishuNext)

仓库若为私有：先 Fork 到自己的 GitHub，再用 fork 地址导入 Vercel。  
部署后打开 `/api/feishu/health` 看中文自检。全绿再打开首页。

`CMS_PROVIDER` 默认为 `feishu`。内容表 / CONFIG 表会从根页自动发现，不必手抄 table id。

### 本地开发

```bash
git clone https://github.com/askofcc/FeishuNext.git
cd FeishuNext
npx yarn@1.22.22 install
cp .env.feishu.example .env.local
# 同样只填 FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_SITE_ROOT
npx yarn@1.22.22 dev
```

进阶变量（覆盖自动发现等）见 [.env.feishu.example](./.env.feishu.example)。

---

## 架构（给开发者）

```text
飞书 OpenAPI
  → lib/feishu/*（auth / bitable / wiki / docx / media / normalize）
  → lib/site/adapters/feishu/*（SiteData + 详情 enrich）
  → pages/* + themes/*（NotionNext 壳）
  → 正文：NotionPage → FeishuPage → FeishuRenderer
```

| 路径 | 职责 |
|---|---|
| `lib/feishu/` | 飞书取数与结构化 |
| `lib/site/adapters/feishu/` | 组装主题可用的 SiteData |
| `components/feishu/` | 正文渲染 |
| `themes/` | 主题（可跟随上游更新） |
| `docs/feishu/` | **产品与数据契约（优先读这里）** |
| `old/docs/` | 上游 NotionNext 文档（已移出主线） |

---

## 仓库怎么读（避免「乱」）

1. 先读本 README + `docs/internal/PROJECT_SOUL.md`  
2. 接飞书：`docs/feishu/STABLE_FEISHU_DATA.md`、内容表/CONFIG 契约  
3. 做主题：`docs/feishu/THEME_DATA_CONTRACT.md`  
4. 跟上游前端：`docs/internal/UPSTREAM.md`  
5. 上游文档与治理包装在 `old/`，不要当 FeishuNext 产品文档读

更细的目录说明：[docs/internal/REPO_MAP.md](./docs/internal/REPO_MAP.md)  
上游遗留已集中到 [old/README.md](./old/README.md)。

---

## 上游同步（摘要）

```bash
git fetch upstream
# 优先看 themes / 壳修复；不要无脑全量当 Notion 数据层更新
git log feishu/main..upstream/main -- themes components
```

冲突时保护：`lib/feishu/**`、`lib/site/adapters/feishu/**`、`components/feishu/**`、飞书分流逻辑。

---

## License

[MIT](./LICENSE) — 含原 NotionNext 版权声明（Copyright tangly1024）。  
另见 [NOTICE](./NOTICE)。
