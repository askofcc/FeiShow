const isAbsoluteHttpUrl = value =>
  typeof value === 'string' && /^(https?:)?\/\//i.test(value.trim())

export const normalizeSitemapBaseUrl = link => {
  if (typeof link !== 'string') return ''
  return link.trim().replace(/\/+$/, '')
}

export const normalizeSitemapLocale = locale => {
  if (!locale) return ''
  const value = String(locale).trim()
  if (!value) return ''
  return value.startsWith('/') ? value : `/${value}`
}

export const toSitemapDateString = (
  dateInput,
  fallbackDate = new Date().toISOString().split('T')[0]
) => {
  const date = new Date(dateInput)
  if (Number.isNaN(date.getTime())) {
    return fallbackDate
  }
  return date.toISOString().split('T')[0]
}

export const buildSitemapLoc = ({
  baseUrl,
  locale = '',
  slug
} = {}) => {
  const normalizedBaseUrl = normalizeSitemapBaseUrl(baseUrl)
  if (!normalizedBaseUrl) return null

  const normalizedLocale = normalizeSitemapLocale(locale)

  if (slug === undefined || slug === null || slug === '') {
    return `${normalizedBaseUrl}${normalizedLocale}`
  }

  const rawSlug = String(slug).trim()
  if (!rawSlug || rawSlug === '#') {
    return null
  }

  if (isAbsoluteHttpUrl(rawSlug)) {
    try {
      const targetUrl = new URL(rawSlug, normalizedBaseUrl)
      const siteUrl = new URL(normalizedBaseUrl)

      // sitemap 仅收录本站链接，避免外链混入
      if (targetUrl.hostname !== siteUrl.hostname) {
        return null
      }

      return targetUrl.toString().replace(/\/+$/, '')
    } catch (error) {
      return null
    }
  }

  const normalizedSlug = rawSlug.replace(/^\/+/, '')
  if (!normalizedSlug) {
    return `${normalizedBaseUrl}${normalizedLocale}`
  }

  return `${normalizedBaseUrl}${normalizedLocale}/${normalizedSlug}`
}

const MENU_TYPES = new Set(['Menu', 'SubMenu'])
const CONTENT_TYPES = new Set(['Post', 'Page', 'Notice'])

/**
 * Sitemap should only list readable site pages, not nav rows or locale switches.
 */
export const isPublicSitemapPage = page => {
  if (!page || typeof page !== 'object') return false
  const type = String(page.type || '')
  if (MENU_TYPES.has(type) || type.includes('Menu')) return false
  if (type && !CONTENT_TYPES.has(type)) return false
  const raw = String(page.slug || page.href || '').trim()
  if (!raw || raw.startsWith('#') || /^(https?:)?\/\//i.test(raw)) return false
  const slug = raw.replace(/^\/+/, '')
  if (!slug) return false
  if (slug === 'en' || slug.startsWith('en/')) return false
  const last = slug.split('/').pop() || ''
  if (/^recv[A-Za-z0-9]+$/i.test(last)) return false
  return true
}
