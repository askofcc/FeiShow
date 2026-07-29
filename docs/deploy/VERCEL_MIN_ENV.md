# Vercel 最小环境变量

## 必配

| 变量 | 作用 |
|---|---|
| `FEISHU_APP_ID` | 飞书应用 |
| `FEISHU_APP_SECRET` | 飞书应用密钥 |
| `FEISHU_SITE_ROOT` | 主配置/站点根 wiki 或文档链接（产品根） |

## 不要配（除非换表/排障）

- 内容表 / 配置中心表 token：优先从 `FEISHU_SITE_ROOT` 下 bitable 自动发现；也可临时用 env 覆盖
- `FEISHU_DOMAIN`：默认 `https://open.feishu.cn`
- `CMS_PROVIDER`：默认 `feishu`
- `NEXT_PUBLIC_LINK`：无自定义域名时用 `VERCEL_URL`
- `NEXT_PUBLIC_REVALIDATE_SECOND`：改到 **配置中心表** 键 `NEXT_REVALIDATE_SECOND`（默认 300 秒）
- `ENABLE_CACHE=false`：**禁止**在 Vercel 上设置

## 配置中心（推荐）

在 CONFIG-TABLE 启用行写入，例如：

- `NEXT_REVALIDATE_SECOND` = `300` 或 `600`
- `TITLE` / `DESCRIPTION` / `AUTHOR` / `LINK` / `THEME` …

优先级：CONFIG-TABLE > env > blog 默认。
