# FeishuNext 决策与共识日志

> **用途：** 把「从要不要做到怎么做、核心是什么、现在到哪一阶段、运维要注意什么」写成可回看的记录。  
> 不是 API 手册；技术契约仍见其它 `docs/feishu/*`。  
> 整理自项目讨论与落地过程 · 2026-07  
> 当前阶段判断：**已完成「NotionNext 壳 + 飞书数据」主路径适配，进入运维与增强期。**

---

## 0. 读法

| 你想… | 看 |
|---|---|
| 5 分钟想起整个项目 | 下文 §1 + §7 |
| 战略/竞争力/边界 | §2～§3 |
| 技术路线为何如此 | §4 |
| 产品与数据怎么定的 | §5 |
| 品牌与仓库 | §6 |
| **现在运维要注意什么** | **§8** |
| 代码与契约细节 | [NEXT_FRAMEWORK.md](./NEXT_FRAMEWORK.md)、[../feishu/](../feishu/) |

---

## 1. 一句话现状（阶段结论）

```text
阶段 A（已完成主路径）：
  飞书 OpenAPI → 结构化数据 → NotionNext 风格站点可读写可部署

阶段 B（进行中 / 运维增强）：
  字段与体验打磨、部署与演示站、按需跟上游主题、文档可回看

阶段 C（后置）：
  AI 就绪（同一结构上的机读出口，不另起炉灶）
```

**竞争力不在「再做一个主题站」，而在：**

> 飞书官方为编辑/权限服务的 JSON，我们做成展示向、可主题消费、可长期维护的公开站数据层。

---

## 2. 最初讨论：做不做？需求在哪？

### 2.1 对标

- [NotionNext](https://github.com/notionnext-org/NotionNext)：Notion 当 CMS → 独立站（大而全产品）  
- nextjs-notion-starter-kit：更偏开发者 starter  

母需求成立：**协作文档里写内容，想要独立域名、SEO、像样阅读体验的网站。**

### 2.2 飞书侧信号

- 有「飞书 → 博客/静态站/导出」类工具，但多为导出或小工具  
- **缺少** NotionNext 量级的「飞书实时/准实时当 CMS 的站点系统」  
- 机会点：飞书重度用户与小团队知识外发；个人博客不是最硬场景  

### 2.3 场景收窄（共识）

从「泛个人站」收到更硬的表述：

> 团队已在飞书写产品说明/帮助中心/更新日志，**不想再维护第二套 CMS**，仍需要标准 Web 站点。

个人站可以后做；商务/团队/文档站优先。

### 2.4 早期价值存疑时的结论

若没有核心场景，不值得按 NotionNext 全量复杂度开干。  
有场景时，价值是 **SEO / 独立站 / 一源多用**，不是炫技。  
最终用「展示向结构化 + 站点壳」证明可落地，而不是空谈。

---

## 3. 核心与边界（战略层）

### 3.1 痛点

| | |
|---|---|
| 飞书文档 | 富文本、灵活块结构 |
| API JSON | 为**编辑、管理、权限**设计 |
| 直接使用 | 人读困难、前端难接、AI 更难稳用 |

### 3.2 价值

**把飞书 API 复杂 JSON → 易读、结构化、可渲染、可再分发的数据。**  
场景是**展示（读）**，不是再造编辑器。

### 3.3 相对官方的优势从哪来

| 官方强 | 我们补 |
|---|---|
| 在线编辑、协作、权限 | 独立站阅读体验 |
| 企业内部可见 | SEO、主题、域名、RSS |
| 原始 blocks | 稳定中间模型 + 主题契约 |

### 3.4 明确不做（多次重申）

- 伪造完整 Notion `recordMap` 硬喂 `react-notion-x`  
- 以网页 protobuf / 登录态爬虫为**主**数据源  
- 一期 25 主题像素级抄全  
- 把 Notion 数据库全字段宗教搬到飞书（密码属性、Config 行当 CMS 宇宙等）  
- 跟官方抢编辑器  

灵魂展开：[PROJECT_SOUL.md](./PROJECT_SOUL.md)

---

## 4. 技术路线：怎么走到「适配飞书」

### 4.1 数据层争议与定案

| 方案 | 结论 |
|---|---|
| 飞书 JSON 伪装 recordMap | **否**（兼容税太高） |
| 只改后端、前端零改 | **不成立**（渲染绑 Notion 结构） |
| 公开页免鉴权代理当基座 | **可研究，不作 MVP 主路径**（不稳定） |
| 官方 OpenAPI + 缓存/ISR | **是** |
| 中间模型 + FeishuRenderer | **是** |

### 4.2 前端争议与定案

| 做法 | 结论 |
|---|---|
| 在空仓手搓 UI 仿 NotionNext | 细节无穷，难收敛 |
| 只抄 example 组件 | 半成品多，仍易「差一口气」 |
| **NotionNext 整仓二开，换数据层与正文** | **定案** |

定案含义：

- 壳：`themes/*`、`pages/*`、SEO/RSS…  
- 心脏：`lib/feishu/*` + `adapters/feishu/*` + `FeishuRenderer`  
- 正文入口：共享 `NotionPage` 在飞书模式下转 `FeishuPage`（多主题受益）

### 4.3 内容模型演进（讨论中变过几次）

```text
Notion 全字段镜像表
  → 发现飞书无同构 properties，字段对不齐
父页面 list-root 子文档列表（更贴飞书树）
  → 作为能力保留
内容表四类：菜单 / 文章 / 页面 / 分类（父页展开）
  + CONFIG 表（配置名/值/启用）
  → 当前主产品模型
```

原则：**能从树上读到的不进表；表只做索引与站点配置。**

### 4.4 与 NotionNext「1:1」的真实含义

| 可接近 1:1 | 不能硬 1:1 |
|---|---|
| 站点壳、信息架构、主题切换感 | recordMap 渲染器 |
| 列表/归档/搜索/SEO | 文档级自定义属性全集 |
| 配置项驱动 UI | 密码字段读出再站内校验（无稳定同构） |

验收是「飞书数据下的 NotionNext 级站」，不是「每个 Notion 插件像素复制」。

---

## 5. 一项项商量过的产品规则（落地共识）

### 5.1 三块数据

1. **文档** — meta、blocks、封面、权限失败  
2. **内容表** — 菜单/子菜单/文章/页面/分类  
3. **CONFIG 表** — 仅启用行生效，覆盖站点配置  

### 5.2 路由与发布

- 默认 **不要**强依赖自定义 slug → 用 `node_token`  
- 默认 **不要**复杂发布状态机 → 表/树上可见即可展示（实现上仍可过滤）  
- 文章链接形态以适配层与 `THEME_DATA_CONTRACT` 为准（历史上讨论过 `/article` 与裸 path，以代码与契约为准）

### 5.3 主题开发

- 主题**禁止**直连飞书 API  
- 正文**唯一**走 `NotionPage` → Feishu 渲染  
- 配置走 `siteConfig` + `NOTION_CONFIG`  
- 详见 [THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md)

### 5.4 品牌与开源义务

| 做 | 不做 |
|---|---|
| 产品名 FeishuNext、演示 feishunext.srint.cn | 默认站点还指向 tangly 域名 |
| README / Credits 致谢 NotionNext | 假装完全自研前端 |
| 保留 MIT LICENSE 原版权 | 删掉 LICENSE 或冒充官方 fork |
| 贡献指向 askofcc/FeishuNext | CONTRIBUTING 还让人 PR 去 notionnext-org |

### 5.5 上游前端更新

- **要拿** themes/壳修复  
- **不拿** Notion 数据层 / recordMap 主链路  
- 频率：按月或按季，不日常全量 merge  
- 冲突保护：`lib/feishu`、`adapters/feishu`、`components/feishu`  
- 见 [UPSTREAM.md](./UPSTREAM.md)

---

## 6. 仓库与分支共识

### 6.1 两个目录

| 路径 | 角色 |
|---|---|
| `notionnext-feishu`（git → askofcc/FeishuNext） | **主开发树** |
| `Documents/FeishuNext` 早期仓 | 半成品，见 MOVED.md |

### 6.2 分支为何曾很乱

- `fetch upstream` 默认拉 NotionNext **全部分支**（上百条 deploy/codex/…）→ 看起来像本仓分支爆炸  
- 本地曾并存 `main`（上游锚点）、`main`（产品）、旧 export  

**约定：**

| 名字 | 含义 |
|---|---|
| **`main`** | 产品主线（日常只在这开发） |
| `upstream/main` | 只读跟踪 NotionNext（已限制只 fetch main） |
| `origin/*` | 私有 GitHub |

### 6.3 远程

- 产品仓：https://github.com/askofcc/FeishuNext（可私有）  
- 演示：https://feishunext.srint.cn/  

---

## 7. 阶段完成声明（你现在的位置）

**已完成的阶段目标：**

> 在 NotionNext 前端体系上，完成飞书侧主路径适配——配置与内容可来自飞书，站点可展示、可切换主题壳，数据不再依赖 Notion 主链路。

这不意味着「所有体验细节做完」，而意味着：

- 架构不再摇摆（二开壳 + 飞书心脏）  
- 主数据路径可运维、可文档化  
- 下一阶段是**增强与运维**，不是重新选技术路线  

---

## 8. 运维阶段注意事项（落实用）

### 8.1 日常开发

1. 分支只用 **`main`**。  
2. 改飞书逻辑：只动 `lib/feishu/**`、`lib/site/adapters/feishu/**`、`components/feishu/**`、`docs/feishu/**`。  
3. 改皮肤：优先 `themes/*`，保持 `THEME_DATA_CONTRACT` 字段。  
4. 不要为了「像 Notion」再引入 recordMap 主路径。  
5. 本地未提交的实验文件（如临时 script）不要和文档/品牌 commit 混在一起。

### 8.2 配置与密钥

1. 密钥只在 `.env.local` / 部署环境，**不进 git**。  
2. 内容表、CONFIG 表 ID 变更时，同步改 env 与契约文档中的示例说明。  
3. 应用权限：文档/表格/知识库读权限 + 资源授权给应用；权限失败应表现为 `accessError`，不应静默 500。  
4. 开发期若遇脏缓存：`ENABLE_CACHE=false` 或清 `.next/cache/notion`（按现有缓存实现）。

### 8.3 发布与演示站

1. 演示站域名：`https://feishunext.srint.cn/`（`NEXT_PUBLIC_LINK` 与之对齐）。  
2. 构建前确认 `CMS_PROVIDER=feishu` 与飞书凭证在托管平台已配置。  
3. 冒烟最低集：首页列表、一篇文章正文、`/rss/feed.xml` 或 sitemap、一个主题不 500。  
4. 页脚 Powered by 指向本仓；based on NotionNext 保留致谢即可。

### 8.4 跟上游 NotionNext

1. `git fetch upstream`（应只更新 `upstream/main`）。  
2. 先看 `themes/`、壳修复；跳过 `lib/db/notion` 大改。  
3. 合并后**必须用飞书 live 数据验收**，不能用 Notion demo 代替。  
4. commit 注明：`upstream: <sha> 合了什么 / 跳过什么`。

### 8.5 文档维护

1. **战略与共识** → 本文 `DECISION_LOG.md`（有新重大决定就追加一节，注明日期）。  
2. **技术总览** → `NEXT_FRAMEWORK.md` + `docs/feishu/`。  
3. **接口与字段** → 各 `FEISHU_*_CONTRACT.md` / `STABLE_FEISHU_DATA.md`。  
4. 代码与文档冲突时：**先改契约再改代码**（或同一 PR 内对齐），避免口头约定漂移。

### 8.6 下一阶段排期原则

| 优先级 | 类型 | 例子 |
|---|---|---|
| P0 | 结构正确性、权限、列表/正文回归 | 表字段解析、封面/图标稳定 |
| P1 | 运维与产品完整度 | 部署文档、演示站、选择性上游主题 |
| P2 | AI 就绪 | 导出、分块、引用格式——**单独立项** |

没有新的战略讨论前，**不要**重新争论「是否该整仓重写前端」或「是否该 recordMap」。

---

## 9. 附录：关键文档地图

| 文档 | 角色 |
|---|---|
| **本文 DECISION_LOG** | 讨论共识、阶段、运维注意 |
| [NEXT_FRAMEWORK.md](./NEXT_FRAMEWORK.md) | 做到哪 / 下一步 |
| [PROJECT_SOUL.md](./PROJECT_SOUL.md) | 痛点与价值 |
| [../feishu/THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md) | 主题 / 中间模型 |
| [THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md) | 主题如何调数据 |
| [UPSTREAM.md](./UPSTREAM.md) | 上游同步 |
| [REPO_MAP.md](./REPO_MAP.md) | 目录与分支 |
| 根 [README.md](../../README.md) | 克隆与启动 |
| [NOTICE](../../NOTICE) / [LICENSE](../../LICENSE) | 致谢与许可 |

---

## 10. 给未来的自己

若隔几个月回来只记得一句话：

> 我们做过战略选择：**不造编辑器、不造假 Notion 数据、二开站点壳、飞书官方 API 结构化展示。**  
> 主路径已经通；现在是运维与增强，不是推倒重来。  
> 细节以 `docs/feishu/` 为准，分支以 `main` 为准。


---

## 9. 2026-07-28 阶段 A 收尾整理

- 本地主工程与 `origin/main`（askofcc/FeishuNext）对齐检查；产品分支仅 **main**。  
- 未提交增强（站点根品牌、作者头像、pageIcon、菜单默认等）纳入代码并文档化。  
- 明确：`tsc` 在 exactOptionalPropertyTypes 下噪音多，**部署以 Next build 为准**。  
- 阶段过程稿已归档到 `old/docs/internal-history/`。  
- 下一动作：生产部署验证 → 阶段 B 体验/运维增强；AI 就绪仍后置。
