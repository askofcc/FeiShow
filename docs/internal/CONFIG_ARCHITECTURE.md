# FeiShow 配置架构与配置项全景指南

> **目标：** 彻底理清为什么配置存在多处、哪些配置必须在环境变量/Docker配、哪些配置必须集中在飞书「配置中心」配、以及配置生效与优先级机制。

---

## 1. 为什么配置会存在多处？（分工与职责）

整个项目分为三个清晰的配置层次，每一层各司其职，避免混乱：

```text
┌──────────────────────────────────────────────────────────────────┐
│ 1. 基础设施与凭证层（.env.local / Docker 环境变量 / Vercel Env）    │
│    必须在此配置：飞书密钥、主入口连接、容器/Node底层参数            │
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼ 先连上飞书 OpenAPI
┌──────────────────────────────────────────────────────────────────┐
│ 2. 飞书多维表格「配置中心」（CONFIG-TABLE） 【日常业务集中配置区】    │
│    绝大多数站点配置集中在此：标题、描述、主题、外观、菜单、插件、SEO…│
└────────────────────────────────┬─────────────────────────────────┘
                                 ▼ 优先级高于默认值
┌──────────────────────────────────────────────────────────────────┐
│ 3. 代码内置默认兜底（blog.config.js 及 conf/*.config.js）         │
│    开发与回退默认值，当配置中心未填写或未启用时兜底                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. 第一层：必须在环境变量 / Docker / Vercel 配置的项

> **为什么不能在飞书配置中心配置？**  
> 因为服务器启动时必须**先拿到这些凭证和主入口**，才能通过飞书 OpenAPI 连接并读取配置中心多维表格。在没连上飞书之前，服务器根本无法知道配置中心的内容。

### 必填基础凭证
| 环境变量名 | 说明 | 示例 / 说明 |
|---|---|---|
| `FEISHU_APP_ID` | 飞书企业自建应用 ID | `cli_xxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用 Secret | 敏感密钥，绝不可放入公开表格 |
| `FEISHU_SITE_ROOT` | 站点内容与配置的根 Wiki/文档链接 | `https://xxx.feishu.cn/wiki/TOKEN`（系统会自动从此根节点发现内容表和配置表） |

### 可选基础设施参数
| 环境变量名 | 作用 | 推荐配置位置 |
|---|---|---|
| `CMS_PROVIDER` | 数据源模式，默认 `feishu` | `.env.local` / Docker |
| `FEISHU_DOMAIN` | 飞书开放平台域名 | 默认 `https://open.feishu.cn` |
| `FEISHU_CONTENT_APP_TOKEN` / `TABLE_ID` | 手动指定内容表（默认由 `FEISHU_SITE_ROOT` 自动发现） | 环境变量 |
| `FEISHU_CONFIG_APP_TOKEN` / `TABLE_ID` | 手动指定配置表（默认由 `FEISHU_SITE_ROOT` 自动发现） | 环境变量 |
| `ENABLE_CACHE` | 构建/内存缓存开关 | 本地调试设 `false`，生产容器保持 `true` |
| `REDIS_URL` | 分布式缓存 Redis 地址 | 仅在有 Redis 需求时于环境配置 |
| `REVALIDATION_TOKEN` | 按需刷新缓存 Webhook 密钥 | 仅用于 CI/自动化回调鉴权 |
| `PORT` / `NODE_ENV` | 容器监听端口与运行环境 | Dockerfile / Compose |

---

## 3. 第二层：集中在飞书「配置中心」（CONFIG-TABLE）的项

> **原则：凡是业务、展示、主题、交互、插件类配置，全部集中在飞书 CONFIG-TABLE 中管理！**

配置中心多维表格列说明：
- **配置名**：配置键名（大小写不敏感，支持 `TITLE`、`title`、`THEME`、`theme` 等）
- **配置值**：具体配置内容（文字、链接、JSON、或布尔 `true`/`false`）
- **启用**：复选框，**打勾才生效**；不打勾则不采用该行并回落默认

### 3.1 站点身份与品牌
- `TITLE`：站点标题
- `DESCRIPTION`：站点副标题 / 描述
- `AUTHOR`：站长作者名称
- `BIO`：作者一句话介绍
- `LINK`：站点公网访问主页地址（如 `https://feishow.srint.cn`）
- `KEYWORDS`：SEO 关键词
- `AVATAR` / `ICON`：作者头像 / 站点 Logo
- `BLOG_FAVICON`：浏览器标签页小图标地址
- `SINCE`：建站年份（用于页脚版权）
- `LANG`：语言代码（如 `zh-CN`, `en-US`）
- `BEI_AN`, `BEI_AN_LINK`, `BEI_AN_GONGAN`：ICP 与公安备案信息

### 3.2 主题与外观
- `THEME`：当前使用的主题名（如 `example`, `simple`, `hexo`, `gitbook`, `heo`, `matery`, `fukasawa`, `claude` 等）
- `APPEARANCE`：明暗主题模式（`light` 浅色 / `dark` 深色 / `auto` 随系统或时间自动）
- `APPEARANCE_DARK_TIME`：深色模式自动切换时间区间（如 `[18, 6]`）
- `THEME_SWITCH`：是否显示悬浮主题切换器
- `HOME_BANNER_IMAGE`：首页顶部大横幅封面图

### 3.3 菜单与导航
- `CUSTOM_MENU`：是否启用内容表中的自定义菜单（默认打勾生效；若想隐藏内容表菜单设为 false）
- `CUSTOM_EXTERNAL_JS`：自定义加载的外部 JavaScript 链接列表
- `CUSTOM_EXTERNAL_CSS`：自定义加载的外部 CSS 链接列表

### 3.4 交互与文章列表
- `CAN_COPY`：是否允许访客复制页面文本（未启用或 `false` 时禁用右键复制）
- `ENABLE_RSS`：是否开启 RSS 订阅生成（`/rss/feed.xml`）
- `POSTS_PER_PAGE`：每页展示文章数（默认 12）
- `POST_LIST_STYLE`：列表展示样式（`page` 分页 / `scroll` 滚动瀑布流）
- `POST_LIST_PREVIEW`：列表是否展开渲染正文预览
- `POST_SHARE_BAR_ENABLE`：文章详情页底部是否显示分享栏
- `TAG_SORT_BY_COUNT`：标签是否按文章数量倒序排列
- `IS_TAG_COLOR_DISTINGUISHED`：标签是否使用彩色高亮区分
- `TOP_TAG`：置顶文章使用的标签名
- `CODE_MAC_BAR`：代码块左上角是否显示 Mac 红黄绿圆点
- `CODE_COLLAPSE`：长代码块是否允许折叠
- `PRISM_THEME_SWITCH`：代码高亮是否随明暗模式自动切换配色

### 3.5 挂件与实用工具
- `WIDGET_PET`：是否显示 Live2D 看板娘宠物挂件
- `WIDGET_PET_LINK`：看板娘模型配置文件地址
- `WIDGET_PET_SWITCH_THEME`：点击看板娘是否切换主题
- `MUSIC_PLAYER`：是否开启悬浮音乐播放器
- `MUSIC_PLAYER_AUTO_PLAY`：音乐播放器是否自动播放
- `MUSIC_PLAYER_AUDIO_LIST`：播放器静态歌曲列表（JSON 数组格式）
- `MUSIC_PLAYER_METING`：是否启用 MetingJS 网易云/QQ 歌单支持
- `MUSIC_PLAYER_METING_ID`：歌单 ID
- `MUSIC_PLAYER_METING_SERVER`：音乐源服务商（`netease` / `tencent` / `kugou`）

### 3.6 评论系统（支持多系统并存与切换）
- `COMMENT_TWIKOO_ENV_ID`：Twikoo 环境 ID
- `COMMENT_WALINE_SERVER_URL`：Waline 服务端地址
- `COMMENT_WALINE_RECENT`：是否显示 Waline 最新评论挂件
- `COMMENT_VALINE_APP_ID` / `COMMENT_VALINE_APP_KEY`：Valine 凭证
- `COMMENT_GISCUS_REPO` / `COMMENT_GISCUS_REPO_ID`：Giscus 仓库配置
- `COMMENT_ARTALK_SERVER`：Artalk 评论服务地址
- `COMMENT_CUSDIS_APP_ID`：Cusdis 评论 ID
- `COMMENT_GITALK_CLIENT_ID` / `CLIENT_SECRET`：Gitalk 登录凭证

### 3.7 站点统计、分析与 AI
- `ANALYTICS_BUSUANZI_ENABLE`：不蒜子访问量/PV/UV 统计
- `ANALYTICS_GOOGLE_ID`：Google Analytics 测量 ID（`G-XXXXXXXXXX`）
- `ANALYTICS_BAIDU_ID`：百度统计代码 ID
- `ANALYTICS_51LA_ID` / `ANALYTICS_51LA_CK`：51啦统计
- `CLARITY_ID`：微软 Clarity 用户行为录制 ID
- `UMAMI_HOST` / `UMAMI_ID`：自建 Umami 统计地址与 ID
- `SEO_GOOGLE_SITE_VERIFICATION`：Google 站长验证码
- `SEO_BAIDU_SITE_VERIFICATION`：百度站长验证码
- `AI_SUMMARY_API` / `AI_SUMMARY_KEY`：自建 AI 文章摘要接口
- `COZE_BOT_ID`：字节 Coze AI 助手 Bot ID
- `DIFY_CHATBOT_ENABLED` / `DIFY_CHATBOT_BASE_URL` / `DIFY_CHATBOT_TOKEN`：Dify 智能体配置

### 3.8 主题专属定制项
如 `HEO_*`, `HEXO_*`, `EXAMPLE_*`, `STARTER_*` 等各主题特有配置项，直接在配置中心增加对应行并启用即可。

---

## 4. 之前部分配置项不生效的原因与修复记录

经过全面排查，之前部分配置未生效主要由以下 4 处底层兼容问题导致，现已全部修复：

1. **键名大小写与 `NEXT_PUBLIC_` 前缀兼容修复 (`lib/config.js`)**：
   - *原问题*：配置中心填写了 `title` 或 `theme`（小写），而组件调用 `siteConfig('TITLE')`，因大小写敏感无法命中。
   - *修复*：`siteConfig` 查询增强为多级候选匹配（支持当前 key、全大写、全小写、去除 `NEXT_PUBLIC_`、增加 `NEXT_PUBLIC_` 自动匹配）。

2. **布尔值与模糊输入解析修复 (`convertVal` / `feishu.content.ts`)**：
   - *原问题*：用户在多维表格输入 `'True'`, `'TRUE'`, `'yes'`, `'是'`，原代码仅识别严格小写 `'true'`，其余被作为普通字符串处理，导致 `=== true` 或逻辑判断失效。
   - *修复*：解析层支持大小写不敏感及中英文常用布尔写法（`true`/`false`/`yes`/`no`/`是`/`否`），规范化返回 JavaScript 布尔值。

3. **初始 SSR 页面与防闪烁脚本动态化 (`pages/_document.js`)**：
   - *原问题*：`_document.js` 之前直接引入 `blog.config.js` 静态值，导致在页面首屏渲染及深色模式防闪烁执行时，未读取配置中心设置的 `LANG`、`APPEARANCE`、`FONT_AWESOME`。
   - *修复*：`_document.js` 现已改写为动态读取 `pageProps.NOTION_CONFIG`，确保首屏 HTML 和 `<script>` 注入直接采用配置中心的设置。

4. **邮箱与联系方式平滑处理 (`lib/plugins/mailEncrypt.js`)**：
   - *原问题*：配置中心填写明文邮箱（如 `admin@qq.com`）时，系统尝试 `atob` 解码并向控制台抛出异常。
   - *修复*：增加了明文检测，避免对明文邮箱重复解码并消除了控制台报错。

---

## 5. 总结：配置的最佳实践

1. **部署时**：只需在 Docker、`.env.local` 或 Vercel 后台配置 `FEISHU_APP_ID`、`FEISHU_APP_SECRET` 和 `FEISHU_SITE_ROOT`。
2. **日常运营时**：所有的标题、简介、主题、导航、插件、统计、SEO、音乐、评论等，**全部在飞书知识库下的 CONFIG-TABLE 中勾选和修改**，无需重启服务器或重新构建镜像。
