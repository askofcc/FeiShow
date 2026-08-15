# 缓存策略（per-key + ISR fallback）

> 更新：2026-07-30  
> 不是「生成页面后等 60 秒整站清缓存再全量重拉」。  
> 本质是：**按 key 缓存「请求之后的数据」**；TTL 内同 key 直接命中。

---

## 1. 你感觉的问题 vs 实际

| 误解 | 实际 |
|---|---|
| 60 秒后整站清缓存、所有请求重打 | **按 key** 过期；未过期的 key 继续命中 |
| 缓存的是「整页 HTML 一把梭」 | 主路径缓存的是 **SiteData / 正文块等数据结果** |
| 每次都重新读配置 | 配置也在 SiteData 管线里，一次组装后进同一套缓存 |

60 秒（或 CONFIG 里的 `NEXT_REVALIDATE_SECOND`）主要影响的是 **Next ISR 页面级 revalidate**（`getStaticProps` 的 `revalidate`），不是「把所有缓存键一起炸掉」。

---

## 2. 两层缓存（必须分清）

```text
┌─────────────────────────────────────────────┐
│ A. 数据缓存（核心，你要的「缓存请求后的数据」）   │
│    getOrSetDataWithCache(key, fetchFn)       │
│    实现：lib/cache/cache_manager.js           │
│    存储：Memory → File（构建/本地）→ Redis（可选）│
│    行为：同 key 未过期 → 直接返回，不打飞书      │
└─────────────────────────────────────────────┘
                      ↑ 喂给
┌─────────────────────────────────────────────┐
│ B. 页面 ISR（Next 页面级）                     │
│    pages/* 里 revalidate: N 秒                │
│    行为：N 秒后允许该路由在后台再生一版 HTML     │
│    再生时仍会先走 A：数据层能命中则不再打飞书     │
└─────────────────────────────────────────────┘
```

### 2.1 数据层（A）——真正该关注的

入口：

```js
// lib/cache/cache_manager.js
getOrSetDataWithCache(key, getDataFunction, ...args)
getOrSetDataWithCustomCache(key, customCacheTimeSeconds, getDataFunction, ...args)
getDataFromCache(key)
setDataToCache(key, data, customCacheTimeSeconds)
delCacheData(key)
```

流程：

1. `getDataFromCache(key)` → 命中则 **直接返回**（同请求在 TTL 内复用）  
2. 未命中 → 同 key 并发合并（`inflightMap`，避免打穿）  
3. 执行 `getDataFunction`（真正的飞书 OpenAPI / 组装）  
4. `setDataToCache` 写入  
5. 返回数据  

**这就是「相同请求在窗口内用缓存」**，不是整站定时清空。

开关：

- `ENABLE_CACHE`（默认开；`false` 时读缓存关闭，开发排脏数据用过）  
- 生产可配 `REDIS_URL` 做跨实例共享  

TTL：

- `setCache(key, data, customCacheTime)` 的秒数  
- 未传时由各 store 默认策略决定（file 可带 expireTime）  
- 飞书侧站点级 revalidate 秒数：`NEXT_REVALIDATE_SECOND`（CONFIG 优先，默认常 300，不是硬编码 60）

### 2.2 页面 ISR（B）——容易被误读成「60 秒清全站」

多数 `pages/*.js`：

```js
return { props, revalidate: process.env.EXPORT ? undefined : siteConfig('NEXT_REVALIDATE_SECOND', ...) }
```

含义：

- 用户访问已生成的页面 → 先吃静态/ISR 结果  
- 超过 revalidate 秒数后 → **该路由**可在后台再生成  
- 再生成时调用 `fetchGlobalAllData` 等 → **仍先走 A 的 per-key 数据缓存**

所以即使用户感觉「过一会儿整站刷新」，实际是：

> 页面级允许再生 + 数据级按 key 命中/未命中，  
> **不是**定时 `del` 掉所有 key。

---

## 3. 飞书主路径里缓存了什么 key

典型（概念名，具体 key 以代码为准）：

| 数据 | 谁拉 | 是否应缓存 |
|---|---|---|
| 全站 SiteData（含 CONFIG 映射、内容表、菜单、列表） | `fetchGlobalAllData` → `fetchSiteFromFeishu` | ✅ 主缓存对象 |
| 单篇正文 feishuContent | `enrichFeishuPost` / blocks | ✅ 可按 documentId+版本 |
| 媒体二进制 | `/api/feishu/media` | ✅ HTTP Cache-Control |
| 瞬时 token | `tenant_access_token` | ✅ 内存短缓存（过期前刷新） |

配置中心行 **不是** 每次页面渲染都单独打表：  
读 CONFIG → 并进 `NOTION_CONFIG` → 随 SiteData 一起进 A 层缓存。

---

## 4. 配置读取为何显得乱（以及正确模型）

### 4.1 目标模型（产品定案）

```text
除 Vercel 必须项外，其余配置 → 飞书 CONFIG-TABLE（配置中心）
读取顺序：CONFIG 启用行 > （少数）环境变量兜底 > blog.config / 主题默认
```

代码入口：`siteConfig(key, default, props.NOTION_CONFIG)`（`lib/config.js`）  
飞书组装：`loadConfigMap()` → `NOTION_CONFIG`（`feishu.adapter.ts`）

### 4.2 必须留在 Vercel / 环境变量的（不能只靠配置中心）

| 变量 | 原因 |
|---|---|
| `CMS_PROVIDER` | 决定走飞书还是 Notion，启动期就要知道 |
| `FEISHU_APP_ID` / `FEISHU_APP_SECRET` | 密钥，禁止进可复制的表 |
| `FEISHU_CONFIG_APP_TOKEN` / `FEISHU_CONFIG_TABLE_ID` | **引导读配置中心本身**（鸡生蛋） |
| `FEISHU_CONTENT_*` | 内容表定位；也可后续收敛，但常与密钥同级放 env |
| `REDIS_URL`（可选） | 基础设施 |
| 平台 `VERCEL_URL` 等 | 托管注入 |

### 4.3 应在配置中心的（站点行为）

示例（有则用，无则在表里新建「配置名/配置值/启用/备注」行）：

| 配置名 | 作用 |
|---|---|
| `TITLE` / `DESCRIPTION` / `AUTHOR` / `KEYWORDS` / `LINK` | 站点身份 |
| `THEME` / `LANG` / `APPEARANCE` | 外观 |
| `NEXT_REVALIDATE_SECOND` | **数据/页面刷新窗口（秒）** —— 你关心的 TTL |
| `CUSTOM_MENU` | 是否用内容表菜单 |
| `HOME_BANNER_IMAGE` | 首页横幅 |
| `POSTS_PER_PAGE` / `POST_LIST_STYLE` 等 | 列表行为 |
| `ENABLE_CACHE` | 是否读数据缓存（排障可关） |

> 配置中心没有字段时：**新建一行**，启用勾上；不要再往 Vercel 堆业务配置。

### 4.3.1 建议新建（若表中还没有）

| 配置名 | 建议默认 | 备注 |
|---|---|---|
| `NEXT_REVALIDATE_SECOND` | `300` | 页面 ISR + 与站点刷新节奏对齐；可按站改 60/120/600 |
| `ENABLE_CACHE` | `true` | 仅排障时关 |
| `CUSTOM_MENU` | `true` | 内容表菜单 |
| `POSTS_PER_PAGE` | `12` | 列表分页 |
| `THEME` | `example` | 或只用 env `NEXT_PUBLIC_THEME` 二选一，避免双源 |

### 4.4 为何看起来乱

历史叠加了三层：

1. NotionNext 原 `blog.config.js` + `conf/*`  
2. Vercel / `.env`  
3. 飞书 CONFIG-TABLE  

FeishuNext 定案是 **3 为主、1 为默认、2 只留密钥与引导**。  
主题仍通过 `siteConfig` 读，**不必**知道值来自表还是 env。

---

## 5. 更有效的策略（与现状对齐 + 可改进点）

### 5.1 已经正确的部分

- per-key 数据缓存 + 并发合并  
- 配置随 SiteData 一次组装  
- 密钥不进表  

### 5.2 建议坚持的产品语义

| 规则 | 说明 |
|---|---|
| 缓存对象 = 飞书请求结果 / 组装后的 SiteData | 不是「整站定时清空」 |
| 同 key + 未过期 → 不打飞书 | 你要的「60 秒内相同请求用缓存」 |
| TTL 可配 | 用配置中心 `NEXT_REVALIDATE_SECOND`（或单独 `SITE_DATA_CACHE_TTL`） |
| 主动失效 | 内容更新后调 `/api/revalidate`（带 token），而不是傻等 TTL |

### 5.3 可选增强（未必须立刻做）

1. **显式 `SITE_DATA_CACHE_TTL`**：与页面 ISR 秒数拆开（数据 5 分钟、页面 60 秒等）  
2. **按 documentId 的正文缓存 key** 带 `revision` / `latest_modify_time`，改文即换 key  
3. **配置中心变更** → webhook/手动 revalidate，避免等 TTL  
4. 文档与代码统一：**禁止**再写「60 秒清全站」的表述  

---

## 6. 排障

| 现象 | 检查 |
|---|---|
| 改了飞书内容站上一直旧 | TTL 未到；或未 revalidate；或 CDN |
| 改了 CONFIG 不生效 | 行「启用」未勾；或 SiteData 缓存未过期 |
| 开发总像没缓存 | `.env` 里 `ENABLE_CACHE=false` |
| 多实例命中率差 | 配 `REDIS_URL`，否则每实例 memory 各算各的 |

日志前缀：`[Cache][MEMORY|FILE|REDIS]` 的 `HIT` / `MISS` / `SET`。

---

## 7. 相关代码

| 文件 | 职责 |
|---|---|
| `lib/cache/cache_manager.js` | per-key get/set/del、inflight |
| `lib/cache/memory_cache.js` / `local_file_cache.js` / `redis_cache.js` | 存储实现 |
| `lib/db/SiteDataApi.js` | `fetchGlobalAllData` 包一层 cache |
| `lib/site/adapters/feishu/*` | 飞书取数 + CONFIG → NOTION_CONFIG |
| `lib/config.js` | `siteConfig()` 统一读配置 |
| `pages/api/revalidate`（若启用） | 主动失效 |

---

## 8. 一句话

> **缓存的是「按 key 的请求结果（含配置组装后的 SiteData）」；TTL 内同 key 复用。**  
> 60s/300s 是过期窗口与 ISR 节奏，**不是**整站定时清空。  
> 业务配置进配置中心；Vercel 只留密钥与「如何找到配置中心」。
