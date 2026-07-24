import type { BasePage, MenuItem, NavPage, SiteData } from '@/lib/site/site.types'
import {
  expandCategoryPosts,
  fillMissingCovers,
  fillMissingSummaries,
  loadConfigMap,
  loadContentRows,
  loadFeishuArticleBody,
  resolveDocumentIds,
  type ContentRow
} from './feishu.content'

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)))
}

function toPublishedPage(row: ContentRow, type: BasePage['type']): BasePage {
  const publishDate = row.date ? Date.parse(row.date) : Date.now()
  return {
    id: row.recordId,
    title: row.title,
    slug: row.slug,
    type,
    status: 'Published',
    summary: row.summary || null,
    category: row.category || null,
    tags: row.tags || [],
    tagItems: (row.tags || []).map(name => ({ name })),
    publishDate: Number.isFinite(publishDate) ? publishDate : Date.now(),
    lastEditedDate: Number.isFinite(publishDate) ? publishDate : Date.now(),
    pageCoverThumbnail: row.coverUrl || null,
    pageIcon: row.icon || null,
    href: row.href || null,
    ext: {
      documentId: row.documentId || null,
      nodeToken: row.nodeToken || null,
      docToken: row.docToken || null,
      feishuType: row.type,
      source: 'feishu',
      ownerId: row.ownerId || null,
      coverToken: row.coverToken || null,
      displaySetting: row.displaySetting || null,
      revisionId: row.revisionId || null,
      showAuthors: row.displaySetting?.show_authors ?? null,
      showCreateTime: row.displaySetting?.show_create_time ?? null
    }
  }
}

function buildMenus(rows: ContentRow[]): MenuItem[] {
  const menus: MenuItem[] = []
  let current: MenuItem | null = null
  for (const row of rows) {
    if (row.type === 'menu') {
      current = {
        name: row.title,
        icon: row.icon || null,
        href: row.href || '/',
        show: true,
        subMenus: []
      }
      menus.push(current)
    } else if (row.type === 'submenu') {
      const item: MenuItem = {
        name: row.title,
        icon: row.icon || null,
        href: row.href || '/',
        show: true
      }
      if (current) {
        current.subMenus = current.subMenus || []
        current.subMenus.push(item)
      } else {
        menus.push(item)
      }
    }
  }
  return menus
}

/**
 * Build NotionNext-compatible SiteData from Feishu content table + CONFIG table.
 */
export async function fetchSiteFromFeishu(): Promise<SiteData> {
  const configMap = await loadConfigMap()
  let rows = await loadContentRows()
  rows = await resolveDocumentIds(rows)

  const menus = rows.filter(r => r.type === 'menu' || r.type === 'submenu')
  const pageRows = rows.filter(r => r.type === 'page')
  const noticeRows = rows.filter(r => r.type === 'notice')
  const categoryRows = rows.filter(r => r.type === 'category')
  const postRows = rows.filter(r => r.type === 'post')

  const expanded = await expandCategoryPosts(categoryRows)
  const postMap = new Map<string, ContentRow>()
  for (const p of [...postRows, ...expanded]) {
    if (!postMap.has(p.slug)) postMap.set(p.slug, p)
  }
  // Fill missing summaries (esp. category children) + covers for list cards
  let allPostRows = [...postMap.values()]
  let pageRowsFilled = pageRows
  let noticeRowsFilled = noticeRows
  try {
    allPostRows = await fillMissingSummaries(allPostRows, { concurrency: 4, maxLen: 120 })
    pageRowsFilled = await fillMissingSummaries(pageRowsFilled, { concurrency: 3, maxLen: 120 })
    noticeRowsFilled = await fillMissingSummaries(noticeRowsFilled, { concurrency: 2, maxLen: 120 })
    // covers for list thumbnails (meta only, limited concurrency)
    allPostRows = await fillMissingCovers(allPostRows, { concurrency: 4 })
    pageRowsFilled = await fillMissingCovers(pageRowsFilled, { concurrency: 3 })
    noticeRowsFilled = await fillMissingCovers(noticeRowsFilled, { concurrency: 2 })
  } catch (e) {
    console.warn('[feishu] fill summary/cover skipped', e)
  }

  const allPages: BasePage[] = [
    ...allPostRows.map(r => toPublishedPage(r, 'Post')),
    ...pageRowsFilled.map(r => toPublishedPage(r, 'Page')),
    ...noticeRowsFilled.map(r => toPublishedPage(r, 'Notice')),
    ...menus.filter(r => r.type === 'menu').map(r => toPublishedPage(r, 'Menu')),
    ...menus.filter(r => r.type === 'submenu').map(r => toPublishedPage(r, 'SubMenu'))
  ]

  const posts = allPages.filter(p => p.type === 'Post' && p.status === 'Published')
  const customMenu = buildMenus(menus)

  const categoryCount = new Map<string, number>()
  const tagCount = new Map<string, number>()
  for (const p of posts) {
    if (p.category) categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1)
    for (const t of p.tags || []) tagCount.set(t, (tagCount.get(t) || 0) + 1)
  }

  const title =
    configMap.TITLE ||
    configMap.NEXT_PUBLIC_TITLE ||
    process.env.NEXT_PUBLIC_TITLE ||
    'FeishuNext'
  const description =
    configMap.DESCRIPTION ||
    configMap.NEXT_PUBLIC_DESCRIPTION ||
    process.env.NEXT_PUBLIC_DESCRIPTION ||
    '飞书驱动的公开站点'
  const link = configMap.LINK || process.env.NEXT_PUBLIC_LINK || 'http://localhost:3460'

  const notice = noticeRowsFilled[0] ? toPublishedPage(noticeRowsFilled[0], 'Notice') : null

  const siteData: SiteData = {
    NOTION_CONFIG: {
      ...configMap,
      TITLE: title,
      DESCRIPTION: description,
      LINK: link,
      AUTHOR: configMap.AUTHOR || process.env.NEXT_PUBLIC_AUTHOR || 'FeishuNext',
      THEME: configMap.THEME || process.env.NEXT_PUBLIC_THEME || 'example',
      CMS_PROVIDER: 'feishu'
    },
    siteInfo: {
      title,
      description,
      pageCover: configMap.HOME_BANNER_IMAGE || '',
      icon: configMap.ICON || '',
      link
    },
    notice,
    allPages,
    allNavPages: allPages
      .filter(p => p.type === 'Post' || p.type === 'Page')
      .map(p => ({ ...p })) as NavPage[],
    allLinkPages: [],
    latestPosts: posts
      .slice()
      .sort((a, b) => (b.publishDate || 0) - (a.publishDate || 0))
      .slice(0, 50),
    categoryOptions: [...categoryCount.entries()].map(([name, count]) => ({
      id: name,
      name,
      value: name,
      count
    })),
    tagOptions: [...tagCount.entries()].map(([name, count]) => ({
      id: name,
      name,
      value: name,
      count
    })),
    customNav: customMenu,
    customMenu,
    postCount: posts.length
  }

  return stripUndefined(siteData)
}

export async function enrichFeishuPost(page: BasePage): Promise<BasePage & Record<string, any>> {
  const documentId = (page.ext as any)?.documentId || (page as any).documentId
  if (!documentId) {
    return stripUndefined({
      ...page,
      accessError: '未配置文档链接',
      blockMap: null,
      feishuContent: null,
      pageCoverThumbnail: page.pageCoverThumbnail || null,
      password: null
    })
  }
  const body = await loadFeishuArticleBody({
    documentId,
    title: page.title
  })
  const display = body.displaySetting || (page.ext as any)?.displaySetting || null
  const summary =
    page.summary ||
    (body.plainText || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
    null
  return stripUndefined({
    ...page,
    title: body.metaTitle || page.title,
    summary,
    pageCoverThumbnail: body.cover || page.pageCoverThumbnail || null,
    lastEditedDate: body.lastEdited ? Date.parse(body.lastEdited) : page.lastEditedDate,
    accessError: body.accessError || null,
    blockMap: null,
    feishuContent: body.content || null,
    feishuPlainText: body.plainText || '',
    feishuHeadings: body.headings || [],
    // NotionNext themes read post.toc
    toc: (body.headings || []).map(h => ({
      id: h.id,
      text: h.text,
      title: h.text,
      level: h.level
    })),
    // Feishu meta for themes / PostMeta
    feishuMeta: body.meta || null,
    feishuDisplaySetting: display,
    showAuthors: display?.show_authors ?? (page.ext as any)?.showAuthors ?? null,
    showCreateTime: display?.show_create_time ?? (page.ext as any)?.showCreateTime ?? null,
    coverOffsetX: body.coverOffsetX ?? null,
    coverOffsetY: body.coverOffsetY ?? null,
    revisionId: body.revisionId ?? (page.ext as any)?.revisionId ?? null,
    ext: {
      ...(page.ext || {}),
      documentId,
      coverToken: body.coverToken || (page.ext as any)?.coverToken || null,
      displaySetting: display,
      revisionId: body.revisionId ?? (page.ext as any)?.revisionId ?? null,
      showAuthors: display?.show_authors ?? null,
      showCreateTime: display?.show_create_time ?? null,
      source: 'feishu'
    },
    password: null
  })
}

export async function findFeishuPageBySlug(
  siteData: SiteData,
  slug: string
): Promise<(BasePage & Record<string, any>) | null> {
  const page =
    siteData.allPages.find(p => p.slug === slug) ||
    siteData.allPages.find(p => p.href === `/article/${slug}`) ||
    siteData.allPages.find(p => p.href === `/${slug}`)
  if (!page) return null
  if (page.type === 'Menu' || page.type === 'SubMenu') return page as any
  return enrichFeishuPost(page)
}
