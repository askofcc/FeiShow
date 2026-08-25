# 配置从哪来

> 定案：能放飞书 **CONFIG-TABLE** 的，就不要放 Docker / Vercel / `.env`。
> 环境变量只留「启动前就要知道」和「密钥」。

读取顺序（运行时）：

```text
飞书 CONFIG-TABLE（启用=true 的行）
  → NOTION_CONFIG
  → blog.config.js / themes/*/config.js 代码默认
  → 少数 env 兜底（密钥、根页、本机 LINK）
```

入口：`siteConfig(key)`（`lib/config.js`）  
飞书组装：`loadConfigMap()` → `NOTION_CONFIG`（`lib/site/adapters/feishu/`）

URL `?theme=gitbook` 只用于临时预览，不写进配置。

---

## 1. 必须留在环境变量（Docker / 以后的 Vercel 都一样）

| 变量 | 作用 | 为什么不能只靠配置中心 |
|---|---|---|
| `FEISHU_APP_ID` | 应用 ID | 读表之前就要鉴权 |
| `FEISHU_APP_SECRET` | 应用密钥 | 禁止进可复制的表 |
| `FEISHU_SITE_ROOT` | 知识库根页 URL | 用来发现内容表和 CONFIG 表 |
| `CMS_PROVIDER` | `feishu`（默认） | 可省略 |
| `FEISHU_DOMAIN` | OpenAPI 域名 | 可选，默认 `https://open.feishu.cn` |
| `FEISHU_CONTENT_*` / `FEISHU_CONFIG_*` | 强制指定表 | 可选；自动发现失败再填 |
| `NEXT_PUBLIC_LINK` | 本机站点 URL | **仅本地/Docker**。生产用配置中心 `LINK`，或托管域名 |
| `REDIS_URL` | 跨实例缓存 | 可选 |
| `ENABLE_CACHE` | 关缓存排障 | 可选；默认开。不要在生产长期关 |
| `REVALIDATION_TOKEN` | 手动刷新 ISR | 密钥 |
| 评论/统计/Clerk 的 App Key | 第三方密钥 | 生产更稳妥放 env |

**Vercel 以后也只填 3 个：** `FEISHU_APP_ID`、`FEISHU_APP_SECRET`、`FEISHU_SITE_ROOT`。  
不要把 `TITLE` / `THEME` / `AUTHOR` / `NEXT_PUBLIC_THEME` 填进托管面板。

---

## 2. 应在配置中心的（站点行为）

| 配置名 | 作用 |
|---|---|
| `TITLE` `DESCRIPTION` `AUTHOR` `BIO` `KEYWORDS` `LINK` | 站点身份。`LINK` 不要填 localhost |
| `THEME` | 主题文件夹名。启用后才生效；不启用则代码默认 `example` |
| `THEME_SWITCH` | 是否显示主题切换按钮 |
| `LANG` `APPEARANCE` | 语言 / 亮暗 |
| `NEXT_REVALIDATE_SECOND` | ISR + 数据刷新窗口（秒），默认 300 |
| `CUSTOM_MENU` | 是否用内容表菜单。未启用 = 默认开 |
| `HOME_BANNER_IMAGE` | 首页横幅。未启用则用根页封面 |
| 其它开关 | 见 `FEISHU_BITABLE_CONFIG_CONTRACT.md` |

---

## 3. 代码默认（配置中心没写时）

`blog.config.js`、`conf/*`、`themes/<name>/config.js` 只是缺省值。要改外观去配置中心加行，不要加 env。

本地 `.env.local` / `.env.docker.local` 已不再设置 `NEXT_PUBLIC_THEME` / `THEME_SWITCH`。
