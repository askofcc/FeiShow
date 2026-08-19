# FeiShow

在飞书写内容，发布成独立网站。

[演示](https://feishow.srint.cn/) · [部署说明](./docs/deploy/feishu-minimal.md) · [GitHub](https://github.com/askofcc/FeiShow)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/askofcc/FeiShow&env=FEISHU_APP_ID,FEISHU_APP_SECRET,FEISHU_SITE_ROOT&envDescription=App%20ID%2C%20Secret%2C%20wiki%20root%20URL&project-name=feishow&repository-name=FeiShow)

---

## 它能做什么

继续用飞书写文档、管表格。站点自动同步成可访问、可搜索的网页：博客、帮助中心、产品文档、更新日志都可以。

不需要把内容迁到 Notion，也不需要自己维护一套 CMS。

| 你在飞书里做的 | 站点上会有的 |
|---|---|
| 写文档、建目录 | 文章页、列表、导航 |
| 多维表格管栏目 | 菜单、分类、独立页面 |
| 改一篇就保存 | 刷新后更新（可配缓存） |

适合已经在飞书写、又需要一个对外网站的人。

---

## 怎么部署

只要 **3 个环境变量**，大约四步。完整图文：[最少步骤部署](./docs/deploy/feishu-minimal.md)

1. 准备一个飞书知识库根页（下面挂内容表；配置表可选）  
2. 创建企业自建应用，开通文档 / 知识库 / 多维表格的**读权限并发布**  
3. 点上面的 Vercel 按钮，填写：

| 变量 | 填什么 |
|---|---|
| `FEISHU_APP_ID` | 开放平台 App ID |
| `FEISHU_APP_SECRET` | App Secret |
| `FEISHU_SITE_ROOT` | 根页链接，形如 `https://xxx.feishu.cn/wiki/…` |

4. 把这个应用加成根页的**可阅读**协作者  

部署完成后先打开：`https://你的域名/api/feishu/health`  
检查项都通过，再打开首页。

仓库如果是私有的：先 Fork 到自己的 GitHub，再用 fork 地址导入 Vercel。

### 在自己电脑上跑

```bash
git clone https://github.com/askofcc/FeiShow.git
cd FeiShow
npx yarn@1.22.22 install
cp .env.feishu.example .env.local
# 同样只填 FEISHU_APP_ID / FEISHU_APP_SECRET / FEISHU_SITE_ROOT
npx yarn@1.22.22 dev
```

内容表和配置表会从根页自动找到，一般不用手抄 table id。更多变量见 [.env.feishu.example](./.env.feishu.example)。

---

## 站点之外：把飞书内容拿去用

飞书开放接口返回的是编辑器结构，直接当网页或喂给模型都不方便。这个项目会先转成稳定的列表、正文和 Markdown，再拿去展示。

同一套结果也可以单独取走：

| 你要 | 打开 |
|---|---|
| 站点有哪些文章 | `/llms.txt` 或 `GET /api/agent/posts` |
| 一篇的结构化数据 | `GET /api/agent/posts/<slug>` |
| 一篇 Markdown | `GET /api/agent/posts/<slug>?format=md` |

```bash
curl -sS https://你的域名/api/agent/posts
curl -sS https://你的域名/api/agent/posts/<slug>?format=md
```

`<slug>` 用列表接口里返回的值（一般是飞书节点 token）。

接口说明：[docs/feishu/AGENT_API.md](./docs/feishu/AGENT_API.md)  
字段和表格怎么配：[docs/feishu/](./docs/feishu/)

---

## 自己改站、或只当数据服务

默认部署是「飞书 + 本仓库 = 完整网站」。也可以：

- **只当数据服务**：部署后只调 `/api/agent/*` 和 `/llms.txt`，页面自己做  
- **换主题 / 改版式**：改 `themes/`，不要在主题里直接请求飞书接口  

给助手的说明可以这样写：

```text
在这个仓库里改主题或加页面。
不要请求飞书 OpenAPI。
列表用 posts / latestPosts，详情用 post，菜单用 customMenu。
正文用 <NotionPage post={post} />。
要 Markdown 或 JSON 时请求 /api/agent/posts 和 /api/agent/posts/:slug。
先读 docs/feishu/THEME_DATA_CONTRACT.md 和 docs/feishu/AGENT_API.md。
```

主题和数据字段说明：[THEME_DATA_CONTRACT.md](./docs/feishu/THEME_DATA_CONTRACT.md)

---

## 说明

界面和主题大量基于 [NotionNext](https://github.com/notionnext-org/NotionNext)（MIT）。内容来自飞书，不是 Notion。  
问题和 PR 请开到本仓库，不要开到 NotionNext 官方项目。

感谢 [tangly1024](https://github.com/tangly1024) / [notionnext-org](https://github.com/notionnext-org)。版权见 [LICENSE](./LICENSE)、[NOTICE](./NOTICE)。
