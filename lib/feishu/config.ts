/**
 * Compatibility shape with FeishuNext site.config for lib/feishu/*
 */
function env(name: string, fallback = ''): string {
  const v = process.env[name]
  return (v == null || v === '' ? fallback : String(v)).replace(/^['"]|['"]$/g, '')
}

const appId = env('FEISHU_APP_ID')
const contentApp = env('FEISHU_CONTENT_APP_TOKEN', env('FEISHU_BITABLE_APP_TOKEN', 'TafHbLNMTazT6NsnFgEcTry6n8c'))
const contentTable = env('FEISHU_CONTENT_TABLE_ID', env('FEISHU_BITABLE_TABLE_ID', 'tbl6eQEHZ6ShGBk5'))

const siteConfig = {
  demo:
    process.env.FEISHU_DEMO === 'true' ||
    (process.env.CMS_PROVIDER === 'feishu' ? !appId : !appId),
  revalidateSeconds: Number(process.env.NEXT_PUBLIC_REVALIDATE_SECOND || 60),
  feishu: {
    appId,
    appSecret: env('FEISHU_APP_SECRET'),
    domain: env('FEISHU_DOMAIN', 'https://open.feishu.cn'),
    bitableAppToken: contentApp,
    bitableTableId: contentTable,
    bitableViewId: env('FEISHU_BITABLE_VIEW_ID') || env('FEISHU_CONTENT_VIEW_ID'),
    contentAppToken: contentApp,
    contentTableId: contentTable,
    contentViewId: env('FEISHU_CONTENT_VIEW_ID') || env('FEISHU_BITABLE_VIEW_ID'),
    configAppToken: env('FEISHU_CONFIG_APP_TOKEN', 'JGShbeVp9aGGV3s2J4qcMmGAn0b'),
    configTableId: env('FEISHU_CONFIG_TABLE_ID', 'tbl4qPlVgMLg5eaH'),
    listRoot: env('FEISHU_LIST_ROOT'),
    siteRoot: env('FEISHU_SITE_ROOT') || env('FEISHU_LIST_ROOT'),
    rootDocumentId: env('FEISHU_ROOT_DOCUMENT_ID'),
  },
  fields: {
    title: env('FEISHU_FIELD_TITLE', '标题'),
    slug: env('FEISHU_FIELD_SLUG', 'Slug'),
    status: env('FEISHU_FIELD_STATUS', '状态'),
    type: env('FEISHU_FIELD_TYPE', '类型'),
    category: env('FEISHU_FIELD_CATEGORY', '分类'),
    tags: env('FEISHU_FIELD_TAGS', '标签'),
    summary: env('FEISHU_FIELD_SUMMARY', '摘要'),
    cover: env('FEISHU_FIELD_COVER', '封面'),
    date: env('FEISHU_FIELD_DATE', '发布时间'),
    document: env('FEISHU_FIELD_DOCUMENT', '文档'),
    order: env('FEISHU_FIELD_ORDER', '排序'),
    pinned: env('FEISHU_FIELD_PINNED', '置顶'),
    icon: env('FEISHU_FIELD_ICON', '图标'),
  },
  publishedStatus: env('FEISHU_PUBLISHED_STATUS', '已发布'),
  postTypes: (env('FEISHU_POST_TYPES', '文章,Post,文档,Doc,Page') || '').split(','),
  menuTypes: (env('FEISHU_MENU_TYPES', '菜单,Menu,导航') || '').split(','),
  mediaProxyPrefix: env('FEISHU_MEDIA_PROXY_PREFIX', '/api/feishu/media'),
}

export type FeishuSiteConfig = typeof siteConfig
export default siteConfig
export { siteConfig as feishuConfig }
