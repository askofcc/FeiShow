# 最少步骤部署 FeiShow

首次部署最快 1 分钟；内容维护者之后只在飞书里改内容和设置。托管默认 **Vercel**。

```text
1. 克隆飞书页面模板（获取主链接 FEISHU_SITE_ROOT）
2. 设置分享权限（开启公开分享，或添加应用授权）
3. Vercel 一键部署，只填 3 个变量
4. 打开 /api/feishu/health 验证上线
```

完成后打开：`https://你的域名/api/feishu/health`  
应用鉴权、根页可读和内容表通过即可打开首页；CONFIG 表未配置不阻塞上线。

---

## 只要这 3 个环境变量

| 变量 | 填什么 | 默认示例 / 开箱即用公开凭证 |
|---|---|---|
| `FEISHU_APP_ID` | 开放平台 App ID | `cli_aa0f2dc1f8f81beb`（公开凭据，或填专属 App ID） |
| `FEISHU_APP_SECRET` | 开放平台 App Secret | `raTlSQRuA0Sr8oTRt5VJxe7X1vDkVZSg`（公开凭据，或填专属 Secret） |
| `FEISHU_SITE_ROOT` | 知识库主链接 | 克隆后的模板页面链接，形如 `https://xxx.feishu.cn/wiki/xxxxxxxx` |

`CMS_PROVIDER` 默认就是 `feishu`，不用填。  
内容表会从主页**自动发现**；CONFIG 表是可选的，通过内容表中一条「类型 = 配置」的记录自动定位。

---

## 第 1 步：克隆官方页面模板

1. 打开官方提供的 [飞书知识库页面模板](https://test-d2al261ggga5.feishu.cn/wiki/AHHowAmX9itAKWkHvWOcqQOPneg)。
2. 点击右上角「...」→ 选择「复制页面」到你自己的飞书知识库中。
3. 复制克隆后的**新页面完整 URL**（即为 `FEISHU_SITE_ROOT`）。

模板页面结构如下：
```text
主页（FEISHU_SITE_ROOT 指这里）
├─ 多维表格「内容」     ← 列：标题、类型、文档（必有）
├─ 示例文章 / 关于页    ← 普通文档
└─ 分类父页（可选）     ← 子文档会自动进列表

可选：单独的多维表格「CONFIG」
  └─ 列：配置名、配置值、启用
     ↑ 内容表中加一行：标题=配置中心，类型=配置，文档=该表链接
```

---

## 第 2 步：设置文档权限（二选一）

### 选项 A：极速体验（开启公开分享，免配应用）
1. 在克隆后的飞书页面右上角点击 **「分享」**；
2. 将链接分享设置为 **「互联网上获得链接的人可阅读」**（确保勾选“应用到所有子页面”）。

### 选项 B：专属应用私密授权（推荐生产使用）
1. 创建自建应用并发布版本（开通 `docx:document:readonly`, `wiki:wiki:readonly`, `bitable:app:readonly`, `drive:drive:readonly` 权限）；
2. 页面右上角点击 **「分享」** → **「添加文档应用 / 协作者」** → 搜索添加你的应用，授予 **「可阅读」** 权限。

---

## 第 3 步：一键 Vercel 部署

仓库若是私有，先 Fork 到自己的 GitHub。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=%E5%8F%AA%E8%A6%81%E4%B8%89%E4%B8%AA%E5%8F%98%E9%87%8F%EF%BC%9A%E5%BA%94%E7%94%A8%20ID%E3%80%81Secret%E3%80%81%E4%B8%BB%E9%93%BE%E6%8E%A5&project-name=feishow&repository-name=FeiShow)

部署向导里只填上面 3 项。  
`NEXT_PUBLIC_LINK` 可先空着，站点会自动使用 Vercel 分配的域名。

---

## 第 4 步：自检验证

部署完成后打开：

```text
https://你的域名/api/feishu/health
```

| 检查项 | 失败时做什么 |
|---|---|
| 应用凭证 | 核对 ID/Secret，确认应用已发布 |
| 应用鉴权 | Secret 错，或权限未发布 |
| 根页可读 | 检查是否已开启互联网可读，或应用是否添加为可阅读协作者 |
| 内容表 | 主页下缺少包含「标题/类型/文档」列的多维表格 |
| CONFIG 表 | 可选；没有也能先上线。建表后须在内容表加「类型 = 配置」的链接记录 |

---

## 不要做的

- 不要在根页建站模式里填一串 `tbl` / `bas`；内容表和配置中心由主页自动定位
- 不要按 NotionNext 的 `NOTION_PAGE_ID` 教程走  
- 不要把 App Secret 写进飞书表格或公开仓库  
- 不要把 TITLE / THEME / 作者 / SEO 塞进 Vercel，那些走飞书 CONFIG 表  
