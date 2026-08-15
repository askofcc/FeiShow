# Vercel 最小环境变量 & 配置中心

## 原则

> **只有「平台密钥 / 产品根」进 Vercel。**  
> **站点长什么样、缓存多久、主题/作者/SEO，全部进飞书配置中心。**

## Vercel 必配（仅此）

| 变量 | 作用 |
|---|---|
| `FEISHU_APP_ID` | 飞书应用 ID |
| `FEISHU_APP_SECRET` | 飞书应用密钥 |
| `FEISHU_SITE_ROOT` | 主配置/站点根 wiki 或文档 URL |

可选覆盖（一般不配）：

- `FEISHU_CONTENT_APP_TOKEN` / `FEISHU_CONTENT_TABLE_ID`
- `FEISHU_CONFIG_APP_TOKEN` / `FEISHU_CONFIG_TABLE_ID`

不配时从 `FEISHU_SITE_ROOT` 下自动发现 bitable。

## 禁止当站点配置塞进 Vercel

下列一律走 **配置中心表（CONFIG-TABLE）**，启用后生效：

| 配置名 | 说明 |
|---|---|
| `TITLE` / `DESCRIPTION` / `KEYWORDS` | 站点品牌 |
| `AUTHOR` / `BIO` / `SINCE` / `LINK` | 作者与链接（`LINK` 不配则用 Vercel 部署域） |
| `THEME` / `LANG` / `APPEARANCE` | 主题与语言 |
| `THEME_SWITCH` / `CAN_COPY` / `CUSTOM_MENU` | 开关 |
| `NEXT_REVALIDATE_SECOND` | ISR/缓存秒数，建议 `300` 或 `600` |
| `HOME_BANNER_IMAGE` | 站级横幅（不配则用主配置页封面） |
| `INLINE_CONFIG` | JSON 批量合并 |

优先级：

```text
配置中心启用行 > 主配置文档推导 > 代码默认
（Vercel 只提供 App 凭证 + SITE_ROOT）
```

## 缓存与请求（后端）

1. **默认开启缓存**（`ENABLE_CACHE` 仅在显式 `false` 时关闭；线上不要关）
2. 构建期 `BUILD_LIGHT`：不逐篇拉摘要/封面，避免飞书限流
3. 进程内去重：`wiki get_node` / `docx meta` / `docx blocks` / 文章正文 / 全站 `fetchSiteFromFeishu`
4. Drive meta 批量一次；wiki 解析有限并发
5. 限流码 `99991400` 使用更长退避

运行时刷新：改配置中心或内容表后，等 `NEXT_REVALIDATE_SECOND`，或调 `/api/revalidate`（若配置了 token）。
