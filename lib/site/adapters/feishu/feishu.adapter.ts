import type { BasePage, MenuItem, NavPage, SiteData } from '@/lib/site/site.types'
import {
  expandCategoryPosts,
  fillMissingCovers,
  fillMissingSummaries,
  fillOfficialDriveFields,
  loadConfigMap,
  loadContentRows,
  loadFeishuArticleBody,
  resolveDocumentIds,
  type ContentRow
} from './feishu.content'
import formatDate from '@/lib/utils/formatDate'

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)))
}

function toPublishedPage(row: ContentRow, type: BasePage['type']): BasePage {
  // Prefer official document times: create -> publish, latest_modify -> lastEdited
  const createMs = row.createdAt ? Date.parse(row.createdAt) : NaN
  const editMs = row.updatedAt ? Date.parse(row.updatedAt) : NaN
  const fallbackMs = row.date ? Date.parse(row.date) : Date.now()
  const publishDate = Number.isFinite(createMs)
    ? createMs
    : Number.isFinite(editMs)
      ? editMs
      : Number.isFinite(fallbackMs)
        ? fallbackMs
        : Date.now()
  const lastEditedDate = Number.isFinite(editMs)
    ? editMs
    : Number.isFinite(createMs)
      ? createMs
      : publishDate

  const author =
    row.authorName ||
    // do not fall back to site config AUTHOR here — leave empty if unresolved
    null

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
    publishDate,
    lastEditedDate,
    publishDay: formatDate(publishDate),
    lastEditedDay: formatDate(lastEditedDate),
    pageCoverThumbnail: row.coverUrl || null,
    pageIcon: row.icon || null,
    href: row.href || null,
    // Some themes read post.author
    author: author,
    ext: {
      documentId: row.documentId || null,
      nodeToken: row.nodeToken || null,
      docToken: row.docToken || null,
      feishuType: row.type,
      source: 'feishu',
      ownerId: row.ownerId || row.authorId || null,
      authorId: row.authorId || row.ownerId || null,
      authorName: row.authorName || null,
      lastEditorId: row.lastEditorId || null,
      coverToken: row.coverToken || null,
      displaySetting: row.displaySetting || null,
      revisionId: row.revisionId || null,
      showAuthors: row.displaySetting?.show_authors ?? null,
      showCreateTime: row.displaySetting?.show_create_time ?? null,
      likeCount: row.likeCount ?? null,
      pv: row.pv ?? null,
      uv: row.uv ?? null,
      commentCount: row.commentCount ?? null,
      createdAt: row.createdAt || null,
      updatedAt: row.updatedAt || null
    }
  } as BasePage
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
  // Official drive meta times/owner first, then summary/cover fill
  let allPostRows = [...postMap.values()]
  let pageRowsFilled = pageRows
  let noticeRowsFilled = noticeRows
  try {
    allPostRows = await fillOfficialDriveFields(allPostRows)
    pageRowsFilled = await fillOfficialDriveFields(pageRowsFilled)
    noticeRowsFilled = await fillOfficialDriveFields(noticeRowsFilled)

    allPostRows = await fillMissingSummaries(allPostRows, { concurrency: 4, maxLen: 120 })
    pageRowsFilled = await fillMissingSummaries(pageRowsFilled, { concurrency: 3, maxLen: 120 })
    noticeRowsFilled = await fillMissingSummaries(noticeRowsFilled, { concurrency: 2, maxLen: 120 })
    allPostRows = await fillMissingCovers(allPostRows, { concurrency: 4 })
    pageRowsFilled = await fillMissingCovers(pageRowsFilled, { concurrency: 3 })
    noticeRowsFilled = await fillMissingCovers(noticeRowsFilled, { concurrency: 2 })
  } catch (e) {
    console.warn('[feishu] fill drive/summary/cover skipped', e)
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

  // Notice needs body for sidebar Announcement (NotionPage/FeishuRenderer)
  let notice: BasePage | null = noticeRowsFilled[0]
    ? toPublishedPage(noticeRowsFilled[0], 'Notice')
    : null
  if (notice) {
    try {
      notice = await enrichFeishuPost(notice)
    } catch (e) {
      console.warn('[feishu] enrich notice failed', e)
    }
  }

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

  const createMs = body.createdAt ? Date.parse(body.createdAt) : NaN
  const editMs = body.updatedAt || body.lastEdited ? Date.parse(body.updatedAt || body.lastEdited!) : NaN
  const publishDate = Number.isFinite(createMs)
    ? createMs
    : Number.isFinite(editMs)
      ? editMs
      : page.publishDate
  const lastEditedDate = Number.isFinite(editMs)
    ? editMs
    : Number.isFinite(createMs)
      ? createMs
      : page.lastEditedDate

  // Author: document owner name only (not site CONFIG AUTHOR)
  const authorName =
    body.authorName || (page.ext as any)?.authorName || (page as any).author || null

  return stripUndefined({
    ...page,
    title: body.metaTitle || page.title,
    summary,
    pageCoverThumbnail: body.cover || page.pageCoverThumbnail || null,
    publishDate,
    lastEditedDate,
    publishDay: publishDate ? formatDate(publishDate) : page.publishDay || null,
    lastEditedDay: lastEditedDate ? formatDate(lastEditedDate) : page.lastEditedDay || null,
    author: authorName,
    accessError: body.accessError || null,
    blockMap: null,
    feishuContent: body.content || null,
    feishuPlainText: body.plainText || '',
    feishuHeadings: body.headings || [],
    toc: (body.headings || []).map(h => ({
      id: h.id,
      text: h.text,
      title: h.text,
      level: h.level
    })),
    feishuMeta: body.meta || null,
    feishuDisplaySetting: display,
    showAuthors: display?.show_authors ?? null,
    showCreateTime: display?.show_create_time ?? null,
    showLikeCount: display?.show_like_count ?? null,
    showCommentCount: display?.show_comment_count ?? null,
    showPv: display?.show_pv ?? null,
    showUv: display?.show_uv ?? null,
    likeCount: body.likeCount ?? null,
    commentCount: body.commentCount ?? null,
    pv: body.pv ?? null,
    uv: body.uv ?? null,
    coverOffsetX: body.coverOffsetX ?? null,
    coverOffsetY: body.coverOffsetY ?? null,
    revisionId: body.revisionId ?? null,
    ext: {
      ...(page.ext || {}),
      documentId,
      coverToken: body.coverToken || (page.ext as any)?.coverToken || null,
      displaySetting: display,
      revisionId: body.revisionId ?? null,
      showAuthors: display?.show_authors ?? null,
      showCreateTime: display?.show_create_time ?? null,
      authorId: body.authorId || (page.ext as any)?.authorId || null,
      authorName,
      lastEditorId: body.lastEditorId || null,
      createdAt: body.createdAt || null,
      updatedAt: body.updatedAt || body.lastEdited || null,
      likeCount: body.likeCount ?? null,
      commentCount: body.commentCount ?? null,
      pv: body.pv ?? null,
      uv: body.uv ?? null,
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
    siteData.allPages.find(p => p.href === `/${slug}`) ||
    siteData.allPages.find(p => p.href === `/article/${slug}`) ||
    siteData.allPages.find(p => (p.ext as any)?.nodeToken === slug) ||
    siteData.allPages.find(p => (p.ext as any)?.documentId === slug)
  if (!page) return null
  if (page.type === 'Menu' || page.type === 'SubMenu') return page as any
  return enrichFeishuPost(page)
}
