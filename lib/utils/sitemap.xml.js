import BLOG from '@/blog.config'
import { siteConfig } from '../config'
import {
  buildSitemapLoc,
  normalizeSitemapBaseUrl,
  toSitemapDateString
} from '../sitemap-utils'
/**
 * 生成站点地图 XML（纯函数，返回字符串）
 * 站点地图由 /pages/sitemap.xml.js 动态路由提供；
 * 不再写入 public/sitemap.xml —— 静态文件会与动态路由冲突，导致 next build 失败。
 * @param {*} param0
 */
export function generateSitemapXml({ allPages, NOTION_CONFIG }) {
  const link = normalizeSitemapBaseUrl(siteConfig('LINK', BLOG.LINK, NOTION_CONFIG))
  const dateNow = toSitemapDateString(new Date())
  const urls = [
    {
      loc: buildSitemapLoc({ baseUrl: link }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: buildSitemapLoc({ baseUrl: link, slug: 'archive' }),
      lastmod: dateNow,
      changefreq: 'daily',
      priority: 1.0
    },
    {
      loc: buildSitemapLoc({ baseUrl: link, slug: 'category' }),
      lastmod: dateNow,
      changefreq: 'daily'
    },
    {
      loc: buildSitemapLoc({ baseUrl: link, slug: 'tag' }),
      lastmod: dateNow,
      changefreq: 'daily'
    }
  ].filter(item => Boolean(item?.loc))
  // 循环页面生成
  allPages?.forEach(post => {
    const loc = buildSitemapLoc({
      baseUrl: link,
      slug: post?.slug
    })
    if (!loc) return

    urls.push({
      loc,
      lastmod: toSitemapDateString(post?.publishDay, dateNow),
      changefreq: 'daily'
    })
  })
  const xml = createSitemapXml(urls)
  return xml
}

/**
 * 生成站点地图
 * @param {*} urls
 * @returns
 */
function createSitemapXml(urls) {
  let urlsXml = ''
  urls.forEach(u => {
    urlsXml += `<url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    </url>
    `
  })

  return `
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
    xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
    xmlns:xhtml="http://www.w3.org/1999/xhtml"
    xmlns:mobile="http://www.google.com/schemas/sitemap-mobile/1.0"
    xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
    ${urlsXml}
    </urlset>
    `
}
