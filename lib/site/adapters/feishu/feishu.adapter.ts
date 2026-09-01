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
  resolveSitePageCover,
  resolveSiteRootBrand,
  applyCoverCascade,
  type ContentRow
} from './feishu.content'
import siteConfig from '@/lib/feishu/config'
import { resolvePageIcon } from '@/lib/feishu/page-icon'
import formatDate from '@/lib/utils/formatDate'

function stripUndefined<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_k, v) => (v === undefined ? null : v)))
}

function stripTitlePrefix(text: string, title: string): string {
  let s = (text || '').trim()
  const tit = (title || '').trim()
  if (!s || !tit) return s
  if (s === tit) return ''
  if (s.startsWith(tit)) {
    s = s.slice(tit.length).trim().replace(/^[\s\-—|:：,.，。]+/, '')
  }
  return s
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
    pageIcon: resolvePageIcon(row.icon, row.title),
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

function isExternalHref(href?: string | null): boolean {
  return !!href && (href.startsWith('http://') || href.startsWith('https://'))
}

/** Only FontAwesome-like classes; emoji/text must not go into className. */
function menuIconClass(icon?: string | null): string | null {
  if (!icon) return null
  const s = String(icon).trim()
  if (!s) return null
  if (/(^|\s)(fa[srlbd]?|fas|far|fal|fab|fa)\s/.test(s) || s.includes('fa-')) return s
  return null
}

function stripLeadingEmoji(label: string): string {
  // Avoid \p{} (needs ES2018); strip common leading symbol/emoji code points
  try {
    const chars = Array.from(label || '')
    let i = 0
    while (i < chars.length) {
      const cp = chars[i]!.codePointAt(0) || 0
      const emojiLike =
        (cp >= 0x1f300 && cp <= 0x1faff) ||
        (cp >= 0x2600 && cp <= 0x27bf) ||
        (cp >= 0x1f1e0 && cp <= 0x1f1ff) ||
        cp === 0xfe0f ||
        cp === 0x200d
      if (!emojiLike) break
      i += 1
    }
    return chars.slice(i).join('').trim() || label
  } catch {
    return label
  }
}

function buildMenus(rows: ContentRow[]): MenuItem[] {
  // Only menu/submenu rows; order by 排序 then stable recordId
  const menuRows = rows.filter(r => r.type === 'menu' || r.type === 'submenu')
  const sorted = [...menuRows].sort((a, b) => {
    const ao = a.order ?? 0
    const bo = b.order ?? 0
    if (ao !== bo) return ao - bo
    return (a.recordId || '').localeCompare(b.recordId || '')
  })

  const menus: MenuItem[] = []
  const byName = new Map<string, MenuItem>()
  let current: MenuItem | null = null

  for (const row of sorted) {
    const label = (row.title || '').trim()
    if (!label) continue

    const href = row.href && String(row.href).trim() ? String(row.href).trim() : '#'
    const icon = menuIconClass(row.icon)
    const target = isExternalHref(href) ? '_blank' : undefined

    if (row.type === 'menu') {
      current = {
        name: label,
        title: label,
        icon,
        href,
        to: href,
        target,
        show: true,
        subMenus: [] as MenuItem[]
      } as MenuItem
      menus.push(current)
      byName.set(label, current)
      const bare = stripLeadingEmoji(label)
      if (bare && bare !== label) byName.set(bare, current)
      continue
    }

    if (row.type === 'submenu') {
      const item = {
        name: label,
        title: label,
        icon,
        href,
        to: href,
        target,
        show: true
      } as MenuItem
      const parentName = (row.parentMenu || '').trim()
      const parent =
        (parentName &&
          (byName.get(parentName) || byName.get(stripLeadingEmoji(parentName)))) ||
        current ||
        null
      if (parent) {
        parent.subMenus = parent.subMenus || []
        parent.subMenus.push(item)
      } else {
        menus.push(item)
      }
    }
  }
  return menus
}

/**
 * Build NotionNext-compatible SiteData from Feishu content table + CONFIG table.
 * Only de-duplicate simultaneous fetches here. Expiration belongs to the shared
 * cache manager, otherwise a warm Docker/Vercel process would never see CONFIG
 * or content changes after the configured TTL.
 */
let siteDataInflight: Promise<SiteData> | null = null

export async function fetchSiteFromFeishu(): Promise<SiteData> {
  if (siteDataInflight) return siteDataInflight
  siteDataInflight = fetchSiteFromFeishuUncached()
    .finally(() => {
      siteDataInflight = null
    })
  return siteDataInflight
}

async function fetchSiteFromFeishuUncached(): Promise<SiteData> {
  const siteRoot =
    process.env.FEISHU_SITE_ROOT ||
    process.env.FEISHU_LIST_ROOT ||
    (siteConfig as any)?.feishu?.siteRoot ||
    ''
  if (!String(siteRoot).trim()) {
    console.warn(
      '[feishu] FEISHU_SITE_ROOT is empty — set the main wiki/doc root (required product input)'
    )
  }
  const configMap = await loadConfigMap()
  let rows = await loadContentRows(configMap)
  rows = await resolveDocumentIds(rows, configMap)

  const menus = rows.filter(r => r.type === 'menu' || r.type === 'submenu')
  const pageRows = rows.filter(r => r.type === 'page')
  const noticeRows = rows.filter(r => r.type === 'notice')
  const categoryRows = rows.filter(r => r.type === 'category')
  const postRows = rows.filter(r => r.type === 'post')

  const expanded = await expandCategoryPosts(categoryRows, configMap)
  const postMap = new Map<string, ContentRow>()
  for (const p of [...postRows, ...expanded]) {
    if (!postMap.has(p.slug)) postMap.set(p.slug, p)
  }
  // Official drive meta times/owner first, then summary/cover fill
  let allPostRows = Array.from(postMap.values())
  let pageRowsFilled = pageRows
  let noticeRowsFilled = noticeRows
  let categoryRowsFilled = categoryRows
  // Site banner early — used as last cover fallback for posts without own/category cover
  const siteBrand = await resolveSiteRootBrand(configMap.HOME_BANNER_IMAGE)
  const bannerEarly = {
    pageCover: siteBrand.pageCover,
    source:
      siteBrand.source === 'config'
        ? 'config'
        : siteBrand.pageCover
          ? 'site-root'
          : 'empty',
    coverToken: siteBrand.coverToken
  } as { pageCover: string; source: 'config' | 'site-root' | 'empty'; coverToken?: string }
  try {
    // Drive meta once for all rows (batch API), then split back
    const driveFilled = await fillOfficialDriveFields([
      ...allPostRows,
      ...pageRowsFilled,
      ...noticeRowsFilled
    ])
    const byRecord = new Map(driveFilled.map(r => [r.recordId, r]))
    allPostRows = allPostRows.map(r => byRecord.get(r.recordId) || r)
    pageRowsFilled = pageRowsFilled.map(r => byRecord.get(r.recordId) || r)
    noticeRowsFilled = noticeRowsFilled.map(r => byRecord.get(r.recordId) || r)

    const buildLight = Boolean((siteConfig as any).buildLight ?? false)
    if (buildLight) {
      console.log(
        '[feishu] BUILD_LIGHT: skip per-doc summaries; still fill document covers'
      )
    } else {
      allPostRows = await fillMissingSummaries(allPostRows, { concurrency: 3, maxLen: 120 })
      pageRowsFilled = await fillMissingSummaries(pageRowsFilled, { concurrency: 2, maxLen: 120 })
      noticeRowsFilled = await fillMissingSummaries(noticeRowsFilled, { concurrency: 2, maxLen: 120 })
    }
    // List cards use each document/category cover. Do not stamp the site banner
    // onto every post — that banner belongs on the header only.
    const allRowsNeedingCovers = [
      ...categoryRowsFilled,
      ...allPostRows,
      ...pageRowsFilled,
      ...noticeRowsFilled
    ]
    const coversFilled = await fillMissingCovers(allRowsNeedingCovers, { concurrency: 2 })
    const coverByRecord = new Map(coversFilled.map(r => [r.recordId, r]))
    categoryRowsFilled = categoryRowsFilled.map(r => coverByRecord.get(r.recordId) || r)
    allPostRows = allPostRows.map(r => coverByRecord.get(r.recordId) || r)
    pageRowsFilled = pageRowsFilled.map(r => coverByRecord.get(r.recordId) || r)
    noticeRowsFilled = noticeRowsFilled.map(r => coverByRecord.get(r.recordId) || r)
    allPostRows = applyCoverCascade(allPostRows, categoryRowsFilled, null)
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
  const builtMenu = buildMenus(menus)
  // Content-table menus default ON.
  // - CONFIG 启用=关 → configMap has no CUSTOM_MENU → default ON
  // - CONFIG 启用=开 + true → ON
  // - CONFIG 启用=开 + false → OFF
  const flag = configMap.CUSTOM_MENU ?? configMap.NEXT_PUBLIC_CUSTOM_MENU
  // default ON; only explicit false turns off content-table menus
  const customMenuEnabled =
    flag === undefined || flag === null || flag === ''
      ? true
      : !(flag === false || flag === 'false' || flag === 0 || flag === '0')
  const customMenu = customMenuEnabled && builtMenu.length > 0 ? builtMenu : []
  if (customMenuEnabled && builtMenu.length === 0) {
    console.warn(
      '[feishu] CUSTOM_MENU is on but content table has no Menu/SubMenu rows; theme falls back to default nav'
    )
  }
  // Tell themes the effective switch
  configMap.CUSTOM_MENU = customMenuEnabled

  const categoryCount = new Map<string, number>()
  const tagCount = new Map<string, number>()
  for (const p of posts) {
    if (p.category) categoryCount.set(p.category, (categoryCount.get(p.category) || 0) + 1)
    for (const t of p.tags || []) tagCount.set(t, (tagCount.get(t) || 0) + 1)
  }

  // Site identity: CONFIG-TABLE > 主配置文档 > code default. Not Vercel env.
  const title = (
    configMap.TITLE ||
    configMap.NEXT_PUBLIC_TITLE ||
    siteBrand.title ||
    'FeiShow'
  ).toString().trim()
  const descriptionRaw = (
    configMap.DESCRIPTION ||
    configMap.NEXT_PUBLIC_DESCRIPTION ||
    siteBrand.description ||
    '飞书驱动的公开站点'
  ).toString().trim()
  const description = stripTitlePrefix(descriptionRaw, title) || descriptionRaw
  // LINK: non-local CONFIG/env > Vercel URL > localhost (dev only)
  // Localhost in CONFIG or NEXT_PUBLIC_LINK must not win on production deploys.
  const pickPublicLink = (...values: Array<unknown>) => {
    for (const value of values) {
      if (value === undefined || value === null) continue
      const raw = String(value).trim()
      if (!raw) continue
      try {
        const withProto = /^(https?:)?\/\//i.test(raw) ? raw : `https://${raw}`
        const host = new URL(withProto).hostname.toLowerCase()
        if (!host || host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0') {
          continue
        }
        return raw.replace(/\/+$/, '')
      } catch {
        continue
      }
    }
    return ''
  }
  const link =
    pickPublicLink(
      configMap.LINK,
      process.env.NEXT_PUBLIC_LINK,
      process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${String(process.env.VERCEL_PROJECT_PRODUCTION_URL).replace(/^https?:\/\//, '')}`
        : '',
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    ) || 'http://localhost:3460'
  const keywords = (
    configMap.KEYWORDS ||
    configMap.NEXT_PUBLIC_KEYWORD ||
    siteBrand.title ||
    title ||
    'FeiShow'
  )
    .toString()
    .trim()

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

  // Site banner already resolved as bannerEarly (config → site-root cover)
  const banner = bannerEarly
  if (banner.source === 'site-root') {
    console.log('[feishu] site pageCover from site-root cover', banner.coverToken)
  } else if (banner.source === 'config') {
    console.log('[feishu] site pageCover from CONFIG HOME_BANNER_IMAGE')
  }

  const siteData: SiteData = {
    NOTION_CONFIG: {
      ...configMap,
      TITLE: title,
      DESCRIPTION: description,
      LINK: link,
      KEYWORDS: keywords,
      AUTHOR: configMap.AUTHOR || siteBrand.authorName || 'FeiShow',
      SINCE: configMap.SINCE || siteBrand.createdYear || new Date().getFullYear(),
      ICON: configMap.ICON || siteBrand.authorAvatar || '',
      BLOG_FAVICON:
        configMap.BLOG_FAVICON ||
        configMap.ICON ||
        siteBrand.authorAvatar ||
        '/favicon.ico',
      AVATAR: configMap.AVATAR || configMap.ICON || siteBrand.authorAvatar || '',
      THEME: configMap.THEME || 'example',
      CMS_PROVIDER: 'feishu',
      // Cache TTL only from CONFIG-TABLE (or 300s default) — not a Vercel requirement
      NEXT_REVALIDATE_SECOND:
        process.env.ENABLE_CACHE === 'false' || process.env.ENABLE_CACHE === '0'
          ? 1
          : Number(
              configMap.NEXT_REVALIDATE_SECOND ??
                configMap.NEXT_PUBLIC_REVALIDATE_SECOND ??
                process.env.NEXT_REVALIDATE_SECOND ??
                process.env.NEXT_PUBLIC_REVALIDATE_SECOND ??
                300
            ),
      // so themes reading siteConfig('HOME_BANNER_IMAGE') also get fallback
      HOME_BANNER_IMAGE: banner.pageCover || configMap.HOME_BANNER_IMAGE || ''
    },
    siteInfo: {
      title,
      description,
      pageCover: banner.pageCover || '',
      icon: configMap.ICON || siteBrand.authorAvatar || '',
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
    categoryOptions: Array.from(categoryCount.entries()).map(([name, count]) => ({
      id: name,
      name,
      value: name,
      count
    })),
    tagOptions: Array.from(tagCount.entries()).map(([name, count]) => ({
      id: name,
      name,
      value: name,
      count,
      source: 'Published'
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
    }) as BasePage & Record<string, any>
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

  const pageIcon = resolvePageIcon(
    (page as any).pageIcon || (page.ext as any)?.icon,
    body.metaTitle || page.title
  )

  return stripUndefined({
    ...page,
    title: body.metaTitle || page.title,
    summary,
    pageCoverThumbnail: body.cover || page.pageCoverThumbnail || null,
    pageIcon,
    publishDate,
    lastEditedDate,
    publishDay: publishDate ? formatDate(publishDate) : (page as any).publishDay || null,
    lastEditedDay: lastEditedDate ? formatDate(lastEditedDate) : (page as any).lastEditedDay || null,
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
      level: h.level,
      indentLevel: Math.max(0, (h.level || 1) - 1)
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
  }) as BasePage & Record<string, any>
}

export async function findFeishuPageBySlug(
  siteData: SiteData,
  slug: string
): Promise<(BasePage & Record<string, any>) | null> {
  if (!slug) return null
  const clean = decodeURIComponent(String(slug).replace(/^\/+|\/+$/g, ''))
  const candidates = siteData.allPages || []

  // 1. Exact match by slug / href / nodeToken / documentId
  let page = candidates.find(
    p =>
      p &&
      (p.slug === clean ||
        p.href === `/${clean}` ||
        p.href === clean ||
        (p.ext as any)?.nodeToken === clean ||
        (p.ext as any)?.documentId === clean ||
        p.id === clean)
  )

  // 2. Exact match with article/ prefix
  if (!page) {
    page = candidates.find(
      p => p && (p.href === `/article/${clean}` || p.slug === `article/${clean}`)
    )
  }

  // 3. Fallback suffix match
  if (!page) {
    page = candidates.find(
      p =>
        p &&
        typeof p.slug === 'string' &&
        (p.slug.endsWith('/' + clean) || p.slug.split('/').pop() === clean)
    )
  }

  if (!page) return null
  if (page.type === 'Menu' || page.type === 'SubMenu') return page as any
  return enrichFeishuPost(page)
}
