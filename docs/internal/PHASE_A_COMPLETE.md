# 阶段 A 完成清单（NotionNext 壳 + 飞书数据主路径）

> 日期：2026-07-28  
> 仓库：https://github.com/askofcc/FeishuNext · 分支 **`main`**  
> 演示：https://feishunext.srint.cn/  
> 本地主工程：`/Users/qiushuanglong/Documents/notionnext-feishu`  
> 旧实验仓：`/Users/qiushuanglong/Documents/FeishuNext`（只读参考，见根目录 `MOVED.md`）

---

## 1. 本阶段交付了什么

| 能力 | 状态 | 落点 |
|---|---|---|
| 飞书 OpenAPI 取数 | ✅ | `lib/feishu/*` |
| 内容表 → 菜单/文章/页面/分类展开 | ✅ | `lib/site/adapters/feishu/*` |
| CONFIG 表 → `NOTION_CONFIG` | ✅ | `loadConfigMap` |
| 正文 normalize + FeishuRenderer | ✅ | `normalize.ts` / `FeishuRenderer` / `NotionPage` 分流 |
| 主题可消费 SiteData/post | ✅ | `THEME_DATA_CONTRACT.md` |
| 列表/详情/归档/搜索/分类/标签 | ✅ | Pages Router + example 等主题 |
| SEO sitemap / RSS | ✅ | `/sitemap.xml`、`/rss/feed.xml` |
| 媒体代理 | ✅ | `/api/feishu/media`、`/api/feishu/board` |
| 演示站部署 | ✅ | feishunext.srint.cn |
| 产品品牌 / 分支收敛到 main | ✅ | README · DECISION_LOG |

**阶段结论：**  
「飞书当 CMS → 结构化 → NotionNext 风格公开站」**主路径已完成**，可进入部署运维与增强（阶段 B），AI 就绪为阶段 C。

---

## 2. 历史讨论 → 文档落实对照

| 讨论共识 | 文档 |
|---|---|
| 为何做 / 痛点 / 相对官方优势 | [PROJECT_SOUL.md](./PROJECT_SOUL.md) |
| 决策时间线与运维注意 | [DECISION_LOG.md](./DECISION_LOG.md) |
| 结构、数据流、分支、路线图 | [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) |
| 三块数据总纲 | [PROJECT_BASELINE.md](./PROJECT_BASELINE.md) |
| 取数 → 结构 → 主题调用 | [../feishu/THEME_DATA_CONTRACT.md](../feishu/THEME_DATA_CONTRACT.md) |
| OpenAPI 稳定路径 | [../feishu/STABLE_FEISHU_DATA.md](../feishu/STABLE_FEISHU_DATA.md) |
| 文档/内容表/CONFIG 字段 | [../feishu/](../feishu/) |
| 块映射 | [../feishu/FEISHU_BLOCK_MAPPING.md](../feishu/FEISHU_BLOCK_MAPPING.md) |
| 不伪造 recordMap | DECISION_LOG §4、SOUL、THEME_DATA_CONTRACT |
| 上游 NotionNext 关系 | [UPSTREAM.md](./UPSTREAM.md)、README Credits |
| 仓库地图 | [REPO_MAP.md](./REPO_MAP.md) |
| Phase4 验收 | [PHASE4_VERIFY.md](./PHASE4_VERIFY.md) |

**沟通信息是否落实：** 战略、边界、数据三块、主题契约、运维注意已进 `docs/internal` + `docs/feishu`；根 README / FEISHU.md 可回看入口齐全。

---

## 3. 代码与质量

### 3.1 主路径代码

```text
lib/feishu/          鉴权、bitable、docx、wiki、media、drive、normalize、page-icon
lib/site/adapters/feishu/   SiteData 组装、详情 enrich、封面级联、站点根品牌
components/FeishuPage.js + FeishuRenderer + NotionPage 分流
pages/api/feishu/*   媒体/画板代理
```

### 3.2 已知限制（非阻断部署）

| 项 | 说明 |
|---|---|
| `tsc --noEmit` | 仓库 `exactOptionalPropertyTypes` + 较低 target 下，feishu 层有大量 **optional 赋 `undefined`** 噪声；**Next/SWC 构建仍是部署门禁** |
| 文档图标 | OpenAPI 无稳定 page icon；用内容表「图标」或标题前导 emoji |
| 密码文 | 无「读出 password 再站内校验」；无权限 → `accessError` |
| 标签 | 内容表未填则 tagOptions 为空 |
| 冷启动 `?theme=` | 偶发首包主题串扰；生产用 `NEXT_PUBLIC_THEME` / CONFIG |
| 旧仓 FeishuNext | App Router 半成品，**不要**再当主工程改 |

### 3.3 本轮整理时一并纳入的未提交增强

- 站点根品牌：`resolveSiteRootBrand`（标题/简介/封面/作者头像/SINCE）  
- `resolveUserProfile`（姓名+头像）  
- `resolvePageIcon` + `NotionIcon` 兼容 fa/emoji/图片  
- CUSTOM_MENU 默认与内容表菜单  
- `fix-config-enable.mjs` 运维脚本  

---

## 4. 本地 / 远端一致性

| 项 | 状态 |
|---|---|
| 产品分支 | **仅 `main`** |
| `origin` | `https://github.com/askofcc/FeishuNext.git` |
| `upstream` | NotionNext 只读跟踪 |
| 本地 `main` vs `origin/main` | 整理提交后应 fast-forward / 已推送一致 |
| `.env.local` | **不入库**（gitignore） |
| 旧目录 `Documents/FeishuNext` | 非 origin 主仓；历史文档/样本 |

**部署前本地检查：**

```bash
cd /Users/qiushuanglong/Documents/notionnext-feishu
git status -sb          # 应为干净或仅本地 env
git log -1 --oneline
npx yarn@1.22.22 build  # 或项目 package.json 的 build
# 环境变量见 .env.feishu.example → 托管平台配置同名变量
```

---

## 5. 部署检查清单（下一动作）

1. 托管平台（Vercel/等）连 **askofcc/FeishuNext** 的 `main`  
2. 环境变量：`CMS_PROVIDER=feishu` + App 凭证 + 内容表/CONFIG 表 token  
3. `NEXT_PUBLIC_LINK` = 生产域名；`NEXT_PUBLIC_THEME`  
4. 飞书应用权限与文档/表授权仍有效  
5. 打开生产站：首页列表、一篇正文、`/sitemap.xml`、`/rss/feed.xml`  
6. （可选）`ENABLE_CACHE` 生产可按平台打开；开发曾用 `false` 避脏缓存  

---

## 6. 下一阶段（B / C）建议顺序

**B 运维与体验增强（部署后）：**

- 字段/封面/图标/菜单边角  
- 演示站内容与 CONFIG 收敛  
- 按需 merge 上游 themes（见 UPSTREAM）  
- 用户向部署文档（飞书专用，弱化 Notion 教程）  

**C AI 就绪（后置）：**

- 同一 `Post`/`feishuContent` 上的 Markdown/JSON/llms 出口  
- 检索与引用格式；**不**另起数据结构  

---

## 7. 一句话

> **阶段 A 完成：** 讨论里的有效结论已进文档，飞书数据主路径与主题契约可交付部署；下一刀是生产部署与增强，不是再改架构。
