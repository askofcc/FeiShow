# Phase 4 细验报告

日期：2026-07-24  
环境：`CMS_PROVIDER=feishu`，live 内容表 + CONFIG 表，`next dev :3460`

## 修复（本轮）

1. **`FeishuRenderer` 缺少 default export** → 文章页 React `Element type is invalid` 500  
2. **文章 slug 稳定为 node_token**（避免中文标题 / 菜单重名撞车）  
3. **`post.toc` 由 feishuHeadings 映射**（主题侧栏目录可消费）  
4. **findPost 优先 Post/Page + documentId**  
5. 开发期 `ENABLE_CACHE=false`（避免文件缓存脏数据）  
6. 验收脚本：`scripts/phase4-verify.mjs`

## 结果矩阵

| 路径 | 状态 | 备注 |
|---|---|---|
| `/` | 200 | 有「模板说明 / 示例文章 / 快速开始」 |
| `/?theme=example` | 200 | `id=theme-example` |
| `/?theme=simple` | 200 | 热路径 `id=theme-simple` |
| `/?theme=gitbook` | 200 | 热路径 `id=theme-gitbook` |
| `/archive` `/search` `/category` `/tag` | 200 | 列表壳正常 |
| `/sitemap.xml` | 200 | XML |
| `/rss/feed.xml` | 200 | RSS；`/feed` → 308 到此 |
| `/article/{node_token}` | 200 | `feishuContent` + blocks |
| `/{node_token}` | 200 | 同上 |

示例文章（`WVcXw…`）：`hasFeishu=true`，blocks=9，toc=3。  
模板说明（`Q7lfw…`）：blocks=7。

`postCount=7`（内容表文章 + 分类展开子文）。

## 已知限制（不阻塞主路径）

| 项 | 说明 |
|---|---|
| 冷启动 `?theme=` 首包 | 并发下偶发仍渲染上一主题 DOM；热路径正确。生产按 `NEXT_PUBLIC_THEME` / CONFIG `THEME` |
| `/rss` 裸路径 | 404；正式订阅用 `/rss/feed.xml` |
| 标签 tagOptions | 当前样本文章未填标签 → 空列表正常 |
| 分类名「分类」 | 来自飞书表行标题/字段值，需在表里改成业务名 |
| 首页 HTML 抽链 | 部分主题用客户端/组件链，正则未必抽到；`latestPosts` 数据正确 |

## 验收结论

**Phase 4 主路径通过：** 列表、文章正文、主题切换（example/simple/gitbook）、归档/搜索/分类/标签页、sitemap、RSS 均可用。
