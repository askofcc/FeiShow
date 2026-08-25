# 最少步骤部署 FeiShow

部署者首次只做 5 步；内容维护者之后只在飞书里改内容和设置。托管默认 **Vercel**。不要再抄 table id，不要读 Notion 部署教程。

```text
1. 克隆飞书页面模板（获取根页链接 FEISHU_SITE_ROOT）
2. 准备飞书应用凭证（使用公开测试凭据，或一键创建专属应用）
3. Vercel 一键部署，只填 3 个变量
4. 将应用添加为克隆根页的「可阅读」协作者
5. 打开 /api/feishu/health 验证上线
```

完成后打开：`https://你的域名/api/feishu/health`  
应用鉴权、根页可读和内容表通过即可打开首页；CONFIG 表未配置不阻塞上线。

---

## 只要这 3 个环境变量

| 变量 | 填什么 | 默认示例 / 开箱即用公开凭证 |
|---|---|---|
| `FEISHU_APP_ID` | 开放平台 App ID | `cli_aa0f2dc1f8f81beb`（公开凭据，或填专属 App ID） |
| `FEISHU_APP_SECRET` | 开放平台 App Secret | `raTlSQRuA0Sr8oTRt5VJxe7X1vDkVZSg`（公开凭据，或填专属 Secret） |
| `FEISHU_SITE_ROOT` | 知识库根页链接 | 克隆后的模板根页链接，形如 `https://xxx.feishu.cn/wiki/xxxxxxxx` |

`CMS_PROVIDER` 默认就是 `feishu`，不用填。  
内容表会从根页**自动发现**；CONFIG 表是可选的，通过内容表中一条「类型 = 配置」的记录自动定位。

---

## 第 1 步：克隆官方根页模板

1. 打开官方提供的 [飞书知识库页面模板](https://test-d2al261ggga5.feishu.cn/wiki/AHHowAmX9itAKWkHvWOcqQOPneg)。
2. 点击右上角「...」→ 选择「复制页面」或「克隆知识空间」到你自己的飞书知识库中。
3. 复制克隆后的**新知识库页面完整 URL**（即为 `FEISHU_SITE_ROOT`）。

模板页面结构如下：
```text
根页（FEISHU_SITE_ROOT 指这里）
├─ 多维表格「内容」     ← 列：标题、类型、文档（必有）
├─ 示例文章 / 关于页    ← 普通文档
└─ 分类父页（可选）     ← 子文档会自动进列表

可选：单独的多维表格「CONFIG」
  └─ 列：配置名、配置值、启用
     ↑ 内容表中加一行：标题=配置中心，类型=配置，文档=该表链接
```

内容表「类型」用：`菜单` / `子菜单` / `文章` / `页面` / `分类` / `配置`（可选）。
文章、页面、分类行的「文档」列贴 wiki/docx 链接。

---

## 第 2 步：准备飞书应用凭证（二选一）

### 选项 A：极速体验（开箱即用公开凭据）
若想直接体验建站、免去开发者后台配置，可直接使用公开提供的应用凭据：
- `FEISHU_APP_ID`: `cli_aa0f2dc1f8f81beb`
- `FEISHU_APP_SECRET`: `raTlSQRuA0Sr8oTRt5VJxe7X1vDkVZSg`

### 选项 B：专属应用（推荐生产环境使用）
1. **快捷创建**：点击 [一键创建应用智能体快捷入口](https://open.feishu.cn/page/launcher?from=backend_oneclick) 快速开通；
2. **或手动创建**：前往 [飞书开放平台 (open.feishu.cn)](https://open.feishu.cn/app) → 点击「创建企业自建应用」；
3. **开通权限并发布**（在「开发配置」→「权限管理」开通只读权限并**发布版本**）：  
   - 云文档 / 新版文档读 (`docx:document:readonly`)  
   - 知识库读 (`wiki:wiki:readonly`)  
   - 多维表格读 (`bitable:app:readonly`)  
   - 云空间读 (`drive:drive:readonly`)  
4. 在「凭证与基础信息」复制专属 **App ID** 与 **App Secret**。

---

## 第 3 步：一键 Vercel 部署

仓库若是私有，先 Fork 到自己的 GitHub。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=%E5%8F%AA%E8%A6%81%E4%B8%89%E4%B8%AA%E5%8F%98%E9%87%8F%EF%BC%9A%E5%BA%94%E7%94%A8%20ID%E3%80%81Secret%E3%80%81%E6%A0%B9%E9%A1%B5%E9%93%BE%E6%8E%A5&project-name=feishow&repository-name=FeiShow)

部署向导里只填上面 3 项。  
`NEXT_PUBLIC_LINK` 可先空着，站点会自动使用 Vercel 分配的域名。

---

## 第 4 步：授权（必做）

打开你克隆后的 `FEISHU_SITE_ROOT` 根页：

1. 右上角点击 **分享**  
2. 点击 **添加文档应用**（或添加协作者）  
3. 搜索添加你使用的应用（若使用公开凭据，搜索对应应用名称），权限设置为 **可阅读**  
4. 根页下的多维表格、子文档一并可读。

然后在 Vercel 点击 Redeploy 一次，或等待自动刷新。

---

## 第 5 步：自检

部署完成后打开：

```text
https://你的域名/api/feishu/health
```

| 检查项 | 失败时做什么 |
|---|---|
| 应用凭证 | 核对 ID/Secret，确认应用已发布 |
| 应用鉴权 | Secret 错，或权限未发布 |
| 根页可读 | 应用还未添加为知识库可阅读协作者（最常见） |
| 内容表 | 根页下缺少包含「标题/类型/文档」列的多维表格 |
| CONFIG 表 | 可选；没有也能先上线。建表后须在内容表加「类型 = 配置」的链接记录 |

---

## 不要做的

- 不要在根页建站模式里填一串 `tbl` / `bas`；内容表和配置中心由根页自动定位
- 不要按 NotionNext 的 `NOTION_PAGE_ID` 教程走  
- 不要把 App Secret 写进飞书表格或公开仓库  
- 不要把 TITLE / THEME / 作者 / SEO 塞进 Vercel，那些走飞书 CONFIG 表  

直接填写 `FEISHU_CONTENT_*` / `FEISHU_CONFIG_*` 只用于没有根页的历史直连模式，不是本项目的标准部署路径。进阶变量见仓库根目录 `.env.feishu.example`。
