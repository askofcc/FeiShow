# 最少步骤部署 FeiShow

用户只做 4 步。托管默认 **Vercel**。不要再抄 table id，不要读 Notion 部署教程。

```text
1. 准备一份飞书根页（复制模板，或自己建）
2. 创建一个飞书企业自建应用，发布读权限
3. Vercel 一键部署，只填 3 个变量
4. 把应用加成这个根页的「可阅读」协作者
```

完成后打开：`https://你的域名/api/feishu/health`  
全绿即可打开首页。

---

## 只要这 3 个环境变量

| 变量 | 填什么 |
|---|---|
| `FEISHU_APP_ID` | 开放平台 App ID |
| `FEISHU_APP_SECRET` | 开放平台 App Secret |
| `FEISHU_SITE_ROOT` | 知识库根页链接，形如 `https://xxx.feishu.cn/wiki/xxxxxxxx` |

`CMS_PROVIDER` 默认就是 `feishu`，不用填。  
内容表、CONFIG 表会从根页子节点**自动发现**。

---

## 第 1 步：根页长什么样

根页是一个知识库文档（wiki），下面挂：

```text
根页（FEISHU_SITE_ROOT 指这里）
├─ 多维表格「内容」     ← 列：标题、类型、文档（必有）
├─ 多维表格「CONFIG」   ← 列：配置名、配置值、启用（可选）
├─ 示例文章 / 关于页    ← 普通文档
└─ 分类父页（可选）     ← 子文档会自动进列表
```

内容表「类型」用：`菜单` / `子菜单` / `文章` / `页面` / `分类`。  
文章、页面、分类行的「文档」列贴 wiki/docx 链接。

没有现成模板时：新建知识库页面当根页，再建上面两张表，发 1 篇示例文章即可。

---

## 第 2 步：飞书应用（最劝退，照做即可）

1. 打开 [飞书开放平台](https://open.feishu.cn/app) → 创建企业自建应用  
2. 权限管理，开通并**发布**一版（可读即可）：  
   - 云文档 / 新版文档读  
   - 知识库读  
   - 多维表格读  
   - 云空间读（封面/图片）  
3. 凭证与基础信息里复制 **App ID**、**App Secret**

---

## 第 3 步：一键 Vercel

仓库若是私有，先 Fork 到自己的 GitHub。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=%E5%8F%AA%E8%A6%81%E4%B8%89%E4%B8%AA%E5%8F%98%E9%87%8F%EF%BC%9A%E5%BA%94%E7%94%A8%20ID%E3%80%81Secret%E3%80%81%E6%A0%B9%E9%A1%B5%E9%93%BE%E6%8E%A5&project-name=feishow&repository-name=FeiShow)

部署向导里只填上面 3 项。  
`NEXT_PUBLIC_LINK` 可先空着，站点会用 Vercel 域名。

---

## 第 4 步：授权（必做）

打开 `FEISHU_SITE_ROOT` 那一页：

1. 右上角 **分享**  
2. **添加文档应用**（或协作者）  
3. 选中你刚建的应用，权限 **可阅读**  
4. 根页下的多维表格、子文档一并可读（必要时对表格再加一次应用）

然后 Redeploy 一次，或等 ISR 刷新。

---

## 自检

部署完成后打开：

```text
https://你的域名/api/feishu/health
```

| 检查项 | 失败时做什么 |
|---|---|
| 应用凭证 | 核对 ID/Secret，确认应用已发布 |
| 应用鉴权 | Secret 错，或权限未发布 |
| 根页可读 | 应用还不是知识库成员（最常见） |
| 内容表 | 根页下缺「标题/类型/文档」那张表 |
| CONFIG 表 | 可选；没有也能先上线 |

---

## 不要做的

- 不要再填一串 `tbl` / `bas`（除非自动发现失败再覆盖）  
- 不要按 NotionNext 的 `NOTION_PAGE_ID` 教程走  
- 不要把 App Secret 写进飞书表格或公开仓库  
- 不要把 TITLE / THEME / 作者 / SEO 塞进 Vercel，那些走飞书 CONFIG 表  

进阶变量见仓库根目录 `.env.feishu.example`。
