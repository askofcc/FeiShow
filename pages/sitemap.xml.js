// pages/sitemap.xml.js
import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import {
  buildSitemapLoc,
  isPublicSitemapPage,
  normalizeSitemapBaseUrl,
  normalizeSitemapLocale,
  toSitemapDateString
} from '@/lib/sitemap-utils'
import { extractLangId, extractLangPrefix } from '@/lib/utils/pageId'
import { getServerSideSitemap } from 'next-sitemap'
import { resolvePublicSiteLink } from '@/lib/utils/publicSiteLink'

export const getServerSideProps = async ctx => {
  const cms = String(BLOG.CMS_PROVIDER || process.env.CMS_PROVIDER || '').toLowerCase()
  if (cms === 'feishu') {
    const siteData = await fetchGlobalAllData({ from: 'sitemap.xml' })
    const configured = siteConfig(
      'LINK',
      siteData?.siteInfo?.link,
      siteData.NOTION_CONFIG
    )
    const link = resolvePublicSiteLink({
      req: ctx.req,
      candidates: [configured, siteData?.siteInfo?.link, BLOG.LINK]
    })
    const fields = getUniqueFields(generateLocalesSitemap(link, siteData.allPages, ''))
    ctx.res.setHeader(
      'Cache-Control',
      'public, max-age=3600, stale-while-revalidate=59'
    )
    return getServerSideSitemap(ctx, fields)
  }

  let fields = []
  const siteIds = BLOG.NOTION_PAGE_ID.split(',')

  for (let index = 0; index < siteIds.length; index++) {
    const siteId = siteIds[index]
    const id = extractLangId(siteId)
    const locale = extractLangPrefix(siteId)
    // 第一个id站点默认语言
    const siteData = await fetchGlobalAllData({
      pageId: id,
      from: 'sitemap.xml'
    })
    const configured = siteConfig(
      'LINK',
      siteData?.siteInfo?.link,
      siteData.NOTION_CONFIG
    )
    const link = resolvePublicSiteLink({
      req: ctx.req,
      candidates: [configured, siteData?.siteInfo?.link, BLOG.LINK]
    })
    const localeFields = generateLocalesSitemap(link, siteData.allPages, locale)
    fields = fields.concat(localeFields)
  }

  fields = getUniqueFields(fields)

  // 缓存
  ctx.res.setHeader(
    'Cache-Control',
    'public, max-age=3600, stale-while-revalidate=59'
  )
  return getServerSideSitemap(ctx, fields)
}

function generateLocalesSitemap(link, allPages, locale) {
  const normalizedLink = normalizeSitemapBaseUrl(link)
  const normalizedLocale = normalizeSitemapLocale(locale)
  const dateNow = toSitemapDateString(new Date())

  const defaultFields = [
    {
      loc: buildSitemapLoc({ baseUrl: normalizedLink, locale: normalizedLocale }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'archive'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'category'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'rss/feed.xml'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'search'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    },
    {
      loc: buildSitemapLoc({
        baseUrl: normalizedLink,
        locale: normalizedLocale,
        slug: 'tag'
      }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: '0.7'
    }
  ].filter(field => Boolean(field?.loc))

  const postFields =
    allPages
      ?.filter(p => {
        const published = BLOG.NOTION_PROPERTY_NAME?.status_publish
        if (published && p.status && p.status !== published && p.status !== 'Published') {
          return false
        }
        return isPublicSitemapPage(p)
      })
      ?.map(post => {
        const loc = buildSitemapLoc({
          baseUrl: normalizedLink,
          locale: normalizedLocale,
          slug: post?.slug
        })
        if (!loc) return null

        return {
          loc,
          lastmod: toSitemapDateString(post?.publishDay, dateNow),
          changefreq: 'daily',
          priority: '0.7'
        }
      })
      ?.filter(Boolean) ?? []

  return defaultFields.concat(postFields)
}

function getUniqueFields(fields) {
  const uniqueFieldsMap = new Map()

  fields.forEach(field => {
    const existingField = uniqueFieldsMap.get(field.loc)

    if (!existingField || new Date(field.lastmod) > new Date(existingField.lastmod)) {
      uniqueFieldsMap.set(field.loc, field)
    }
  })

  return Array.from(uniqueFieldsMap.values())
}

export default () => { }
