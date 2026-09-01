# FeiShow

把飞书文档与知识库，发布为高颜值独立网站。

[在线演示](https://feishow.srint.cn/) · [GitHub 仓库](https://github.com/askofcc/FeiShow)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=App%20ID%2C%20Secret%2C%20wiki%20root%20URL&project-name=feishow&repository-name=FeiShow)

---

## 💡 为什么选择 FeiShow？

市面上类似将飞书文档/知识库转为独立站的商业插件，通常采用订阅制，官方收费高达 **¥6,600 / 年**，且存在模板单一、数据受限、不支持自托管与缺乏 AI 结构化能力等痛点。

**FeiShow 是一款 100% 开源免费的飞书无头 CMS 与静态站点生成系统：**
- 💰 **零软件成本**：立省每年 6,600 元商业软件采购费，代码完全开源，支持 Vercel / Cloudflare / Docker 自由自托管。
- 📝 **写作体验不变**：直接在飞书写文档、搭知识库、建多维表格，改完内容后站点自动无缝同步。
- 🎨 **25+ 精美主题即刻开箱即用**：博客风、文档站（GitBook）、产品落地页、卡片流、杂志风等，多维表格一行配置即可热切换。
- 📊 **多维表格深度融合**：文章、分类、标签、自定义 Slug、置顶、多级导航菜单全部通过多维表格直观管理。
- 📚 **知识库批量分发**：支持知识库内多文档批量创建副本与统一权限管理，整套站点内容轻松维护。
- 🤖 **AI 原生就绪 (AI-Ready)**：自带 `/llms.txt`、干净 Markdown 提纯引擎与标准 Agent API，一键为大模型与 RAG 知识库提供纯净数据源。

---

## 📊 核心能力横向对比

| 核心维度 | 商业建站插件（如飞站等） | 传统 CMS（WordPress / Hexo） | **FeiShow（开源自托管）** |
| :--- | :--- | :--- | :--- |
| **软件授权成本** | **¥6,600 / 年** 商业订阅 | 免费 / 部分主题与插件收费 | **100% 永久开源免费** |
| **内容编写端** | 飞书文档 / 知识库 | 网页后台富文本 / 本地 Markdown | **原生飞书文档与知识库** |
| **主题丰富度** | 1~2 套固定样式，难以深度定制 | 需手动安装配置，生态割裂 | **25+ 套现代化主题，表格一键热切换** |
| **数据与部署掌控** | 闭源托管，数据受制于第三方平台 | 需自行维护服务器与数据库 | **完全自托管，走官方 OpenAPI 只读鉴权，数据 100% 私有** |
| **多维表格 CMS 能力** | 仅基础文档列表展示 | 需额外二次开发数据表 | **多维表格深度驱动（导航、分类、标签、置顶、CONFIG 动态配置）** |
| **批量内容分发** | 手动逐篇新建 | 依赖导入导出备份包 | **知识库内原生支持多文档批量复制与统一权限继承** |
| **AI / Agent 数据出口** | 无结构化出口 | 无 | **内置 `/llms.txt` + 标准 Agent API + 纯净 Markdown 提纯** |
| **部署速度** | 平台绑定 | 10~30 分钟服务器环境配置 | **Vercel 一键 1 分钟上线 / Docker 容器化** |

---

## 🎨 25+ 精美主题即刻开箱即用

飞书多维表格中一键热切换，无需重新构建部署：

| Heo（极客博客风） | GitBook（技术文档风） | Hexo（经典博客） |
| :---: | :---: | :---: |
| <img src="./public/images/themes-preview/heo.png" width="260" alt="Heo theme" /> | <img src="./public/images/themes-preview/gitbook.png" width="260" alt="GitBook theme" /> | <img src="./public/images/themes-preview/hexo.png" width="260" alt="Hexo theme" /> |
| **Simple（极简笔记）** | **Fuwari（动效卡片）** | **Landing（产品落地页）** |
| <img src="./public/images/themes-preview/simple.png" width="260" alt="Simple theme" /> | <img src="./public/images/themes-preview/fuwari.png" width="260" alt="Fuwari theme" /> | <img src="./public/images/themes-preview/landing.png" width="260" alt="Landing theme" /> |
| **Medium（专栏杂志）** | **Matery（卡片流）** | **Commerce（微商店/展示）** |
| <img src="./public/images/themes-preview/medium.png" width="260" alt="Medium theme" /> | <img src="./public/images/themes-preview/matery.png" width="260" alt="Matery theme" /> | <img src="./public/images/themes-preview/commerce.png" width="260" alt="Commerce theme" /> |

---

## 用户操作指南：选择适合你的使用模式

FeiShow 根据用户场景分为三种使用模式：从 **0 代码小白 1 分钟极速上线**，到 **生产级稳定控制**，再到 **进阶极客与开发者模式**。

### 🌱 模式一：普通用户极简模式（克隆模板 + 公开分享，1 分钟极速上线）

适合不想折腾开放平台开发者后台、仅想在 1 分钟内最快体验建站的个人（这也是最少步骤部署路径）：

1. **克隆官方页面模板**：
   - 打开 [飞书官方页面模板](https://test-d2al261ggga5.feishu.cn/wiki/AHHowAmX9itAKWkHvWOcqQOPneg)（包含多维表格「内容」、示例文章与配置中心）。
   - 点击右上角「...」选择「复制页面」或复制到自己的知识库中，复制新生成的首页主链接（`FEISHU_SITE_ROOT`）。   - 然后在自己的主链接中设置相关内容。
2. **开启公开可读权限**：
   - 在克隆后的知识库页面右上角点击 **「分享」**；
   - 将链接分享设置为 **「互联网上获得链接的人可阅读」**（确保勾选“应用到所有子页面”）。
3. **一键 Vercel 部署**：
   - 点击下方一键部署按钮，填入 **3 个变量**：
     - `FEISHU_APP_ID`：`cli_aa0f2dc1f8f81beb`（开箱即用公开凭据）
     - `FEISHU_APP_SECRET`：`raTlSQRuA0Sr8oTRt5VJxe7X1vDkVZSg`（开箱即用公开凭据）
     - `FEISHU_SITE_ROOT`：你刚才复制的飞书页面主链接

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=App%20ID%2C%20Secret%2C%20wiki%20root%20URL&project-name=feishow&repository-name=FeiShow)

4. **自检验证**：
   - 部署完成后打开 `https://你的域名/api/feishu/health`，确认连接正常即可浏览网站。

---

### 🚀 模式二：稳定精细控制模式（推荐生产使用：专属自建应用 + 私密只读授权）

适合正式个人站点、团队官网、产品文档站，或**不希望将源文档公开暴露到公网**的私密场景：

1. **创建专属自建应用（智能体）**：
   - **快捷通道**：点击 [一键创建应用智能体快捷入口](https://open.feishu.cn/page/launcher?from=backend_oneclick) 快速开通；
   - **常规通道**：前往 [飞书开放平台 (open.feishu.cn)](https://open.feishu.cn/app) → 点击「创建企业自建应用」。
2. **开通只读权限清单**（在开放平台「开发配置」→「权限管理」中添加，并**创建版本并发布**）：
   - `docx:document:readonly`（云文档 / 新版文档读取：拉取正文 blocks 与文档属性）
   - `wiki:wiki:readonly`（知识库读取：解析知识库节点树与子文档层级）
   - `bitable:app:readonly`（多维表格读取：查询内容表菜单/文章索引与 CONFIG 表）
   - `drive:drive:readonly`（云空间读取：下载正文图片、文档封面及附件素材）
3. **获取应用凭证**：
   - 在「凭证与基础信息」中复制专属 `App ID` (`FEISHU_APP_ID`) 与 `App Secret` (`FEISHU_APP_SECRET`)。
4. **知识库私密授权**：
   - 打开 `FEISHU_SITE_ROOT` 主页右上角「分享」→「添加文档应用 / 协作者」→ 搜索刚创建的应用名称 → 授予 **「可阅读」** 权限（子页面与表格自动继承）。

> ✅ **为什么推荐模式二（对比模式一的公开分享）？**
> - **数据安全私密**：无需将文档设置为“互联网公开”，源文档与表格对外部完全不可见，只有获得授权的应用凭证才能通过 OpenAPI 读取。
> - **100% 官方 API 稳定通道**：走官方鉴权接口，响应速度快且稳定，不受网页防爬策略干扰。

---

### 🛠️ 模式三：进阶极客与开发者模式（知识库批量复制、多主题、无头 CMS 与 Docker）

#### 1. 知识库空间高级技巧与批量文档分发
对于多文档管理与站点内容矩阵，**飞书知识库空间（Wiki Space）是批量创建与管理文档的理想载体**：
- **批量复制创建文档**：知识库内部原生支持对目录节点进行批量复制与批量创建文档副本，快速分发整套模板内容。
- **默认权限统一继承**：在知识库空间层级设置默认权限后，新创建的子文档与表格会自动继承父级权限，无需逐篇重复配置授权。

#### 2. 自由热切换 25+ 主题
- 直接在飞书 CONFIG 表改 `THEME`，或在 URL 上加 `?theme=gitbook`、`?theme=simple` 实时预览。
- 基于清晰的 [主题数据开发契约 (THEME_DATA_CONTRACT)](./docs/feishu/THEME_DATA_CONTRACT.md) 快速开发新主题，只消费结构化数据与 `<NotionPage />` 统一组件。

#### 3. 作为无头 CMS（Headless CMS）
- 不使用自带前端，仅将 FeiShow 部署为数据服务，前端用自己的框架调用 Agent API。

#### 4. Docker 私有化部署
```bash
# 准备环境文件并填写飞书三项变量
cp .env.feishu.example .env.docker.local
docker compose up -d --build
```

开发热更新：
```bash
docker compose -f docker-compose.dev.yml up
```

清理旧构建缓存：
```bash
docker builder prune -f
docker image prune -f
```

---

## 核心架构：一站只认一个飞书主链接

`FEISHU_SITE_ROOT` 是 FeiShow 的主链接，也是站点的唯一入口。它指向知识库中的主配置文档（例如 `https://xxx.feishu.cn/wiki/xxxxxx`）。系统会自动递归发现其挂靠的内容多维表格、子文档与配置中心。

```text
FEISHU_SITE_ROOT（建站时只填一次主链接）
  ├─ 首页文档 / 空间主页  → 提供站点默认标题、简介、图标与 Banner
  ├─ 内容表（多维表格）   → 驱动导航菜单、文章列表、单页、分类与标签
  ├─ 飞书文档与子知识库   → 实际文章正文内容
  └─ 可选：配置中心 (CONFIG) → 自由定制主题、SEO、语言、站点元数据
```

**日常零后台负担**：不需要手抄 `table_id` 或文档 token，也不需要在部署平台反复改配置。日常内容增删与站点微调均在飞书内完成。

| 角色 | 第一次需要做什么 | 日常主要在哪里操作 |
|---|---|---|
| **普通访客 / 读者** | 直接访问独立域名浏览 | 独立站网页端 |
| **内容创作者 / 运营** | 不需要开发者权限与 API Secret | 飞书文档、内容表、CONFIG 表 |
| **站点部署者 / 开发者**| 填入主链接与一次性凭证部署 | 托管平台（换主链接或排障时才需要） |

---

## 日常管理：全部在飞书里完成

部署完成后，日常运维与内容更新不需要回到 Vercel：

| 想做的事 | 去哪里改 | 是否需要重新部署 |
|---|---|---|
| 新增 / 修改文章、页面、菜单、分类 | 飞书多维表格「内容」与对应文档 | 否，自动同步 |
| 改站点标题、描述、主题、语言、横幅、SEO | 飞书多维表格「CONFIG」 | 否，等缓存刷新即可 |
| 换整套内容源或换知识空间 | 托管平台改 `FEISHU_SITE_ROOT` | 是，重新部署 |
| 修复读不到内容、权限报错 | 飞书开放平台权限与根页分享设置 | 通常不需要改代码 |

### 快速定制站点外观（CONFIG 表常用配置）

在 CONFIG 表中新增以下行并勾选「启用」即可生效：

| 配置名 | 配置值示例 | 效果 |
|---|---|---|
| `TITLE` | `我的技术空间` | 浏览器标签页标题、站点名称 |
| `DESCRIPTION` | `专注分享工程实践与深度思考` | 首页副标题与 SEO 描述 |
| `LINK` | `https://your-domain.com` | Sitemap、RSS 与社交分享的站点基准 URL |
| `THEME` | `example` (或 `simple`, `gitbook`, `heo`) | 站点主题风格（25+ 主题热切） |
| `NEXT_REVALIDATE_SECOND` | `5`（调试期） / `300`（正式运行） | 缓存刷新间隔（单位：秒） |

> 💡 **新手调试必看（内容更新延迟疑问）：**
> - **为什么飞书改完后刷新网页没有立即变？**  
>   为保障站点极速访问并避免频繁消耗飞书 API 配额，系统默认开启了 **5 分钟（300 秒）缓存**。
> - **建站初期频繁改动怎么办？**  
>   在 CONFIG 表添加 `NEXT_REVALIDATE_SECOND` 填入 `5` 并勾选启用，网站就会在 **5 秒内极速同步** 飞书的所有改动；调试满意后改回 `300` 即可。
> - **立刻强制生效**：在 Vercel 部署控制台点击一次 **「Redeploy」**，即可立即全站强制刷新。

完整配置项清单详见：[CONFIG 表说明](./docs/feishu/FEISHU_BITABLE_CONFIG_CONTRACT.md)。

---

## 项目核心价值：飞书数据结构化与 AI 就绪度（AI-Ready）

### 1. 为什么飞书官方 API 不能直接拿来做公开展示？

官方飞书云文档 API 返回的是深度嵌套的**编辑态 JSON**（包含大量协同标记、权限位、原始 blockType、样式 runs 与复杂关系），这是为内部在线协作编辑设计的，直接拿来做 Web 渲染或传给 AI 时存在严重痛点：
- 数据冗余度极高，单篇文档 JSON 体积大、嵌套深；
- 没有线性的标题层级、目录锚点与图文排版语义；
- 机器和外部大模型根本无法稳定阅读与解析。

### 2. FeiShow 的核心提纯工作

FeiShow 专注于**展示场景的数据清洗与结构化重组**：
```text
飞书原始编辑态 JSON (blocks / drive / bitable)
        ↓ 
[FeiShow 结构化引擎] 字段清洗、图片代理、目录提取、Markdown 提纯
        ↓
标准展示层 (Post / BasePage)  +  标准 Agent API (/api/agent/*)  +  AI 爬虫规范 (/llms.txt)
```

### 3. 开箱即用的 AI / Agent 数据出口

FeiShow 不仅仅是一个博客站点，也是一个**面向 AI Agent、RAG 知识库与外部应用的无头数据源**。你可以直接取用处理好的纯净数据：

| 需求场景 | 调用方式 / 访问路径 | 返回格式 |
|---|---|---|
| **全站文章索引** | `GET /api/agent/posts` | 结构化 JSON 列表（含标题、slug、摘要、分类、标签、更新时间） |
| **单篇结构化数据** | `GET /api/agent/posts/<slug>` | 单篇完整对象（含目录 TOC、元属性、正文块树） |
| **单篇干净 Markdown** | `GET /api/agent/posts/<slug>?format=md` | 纯净 Markdown，可直接用于 RAG 切片或 Prompt 上下文注入 |
| **大模型站点地图** | `GET /llms.txt` | 符合 LLMs 标准的全站纯文本内容索引（供 ChatGPT / Claude / 爬虫阅读） |

```bash
# 获取全站文章索引
curl -sS https://你的域名/api/agent/posts

# 获取单篇干净 Markdown
curl -sS "https://你的域名/api/agent/posts/<slug>?format=md"
```

完整接口规范与字段定义详见：[Agent API 规范说明](./docs/feishu/AGENT_API.md)。

---

## 常见排障与健康检查

部署遇到问题时，优先访问健康自检端点：`https://你的域名/api/feishu/health`

| 检查项报错 | 最常见原因 | 解决方法 |
|---|---|---|
| **应用鉴权失败** | App ID/Secret 不匹配，或权限未发布 | 前往开放平台核对凭据，并确认权限已「创建版本并发布」 |
| **根页无法读取** | 未开启公开分享（模式一）或未添加应用协作者（模式二） | 检查分享设置或添加应用为「可阅读」 |
| **内容表未找到** | 根页下缺少包含「标题/类型/文档」列的多维表格 | 检查多维表格列名，并确认应用有权读取该表格 |
| **CONFIG 表未找到** | 未建配置表（不影响正常建站） | 如需个性化配置再建表，并在内容表新增「类型=配置」记录引用它 |

---

## 进阶文档导航

| 需求 | 参考文档 |
|---|---|
| 最少步骤部署指南 | [最少步骤部署指南](./docs/deploy/feishu-minimal.md) |
| 深入理解全站配置优先级 | [配置来源与环境变量划分](./docs/feishu/CONFIG_SOURCES.md) |
| 多维表格字段详细契约 | [内容表契约说明](./docs/feishu/FEISHU_CONTENT_TABLE_CONTRACT.md) |
| 配置中心高级开关指南 | [CONFIG 表完整字段文档](./docs/feishu/FEISHU_BITABLE_CONFIG_CONTRACT.md) |
| 开发与定制新前端主题 | [主题数据开发契约 (THEME_DATA_CONTRACT)](./docs/feishu/THEME_DATA_CONTRACT.md) |
| 单篇文档契约与权限 | [文档调用与权限契约](./docs/feishu/FEISHU_DOCUMENT_CONTRACT.md) |

---

## 致谢与开源协议

- 前端界面与多主题系统大量衍生自优秀的开源项目 [NotionNext](https://github.com/notionnext-org/NotionNext)（MIT 许可）。
- 感谢原作者 [tangly1024](https://github.com/tangly1024) 及社区贡献者。
- 本项目遵循 [MIT 许可证](./LICENSE)，第三方依赖与引用说明见 [NOTICE](./NOTICE)。
- 本项目非 NotionNext 官方分支，问题与 PR 请提交至 [askofcc/FeiShow](https://github.com/askofcc/FeiShow)。
