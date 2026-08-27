import { generateSitemapXml } from '@/lib/utils/sitemap.xml'
import { siteConfig } from '@/lib/config'

jest.mock('@/lib/config', () => ({
  siteConfig: jest.fn((key, defaultVal, extendConfig = {}) => {
    if (key === 'LINK' && extendConfig?.LINK) {
      return extendConfig.LINK
    }
    return defaultVal
  })
}))

describe('generateSitemapXml', () => {
  beforeEach(() => {
    siteConfig.mockClear()
  })

  it('does not generate invalid duplicated-domain URLs for external links', () => {
    const xml = generateSitemapXml({
      NOTION_CONFIG: {
        LINK: 'https://example.com/'
      },
      allPages: [
        {
          slug: '/hello-world',
          publishDay: '2026-02-20'
        },
        {
          slug: 'https://external.com/landing',
          publishDay: '2026-02-20'
        },
        {
          slug: 'https://example.com/internal/page',
          publishDay: 'invalid-date'
        }
      ]
    })

    expect(typeof xml).toBe('string')
    expect(xml).toContain('<loc>https://example.com/hello-world</loc>')
    expect(xml).toContain('<loc>https://example.com/internal/page</loc>')
    expect(xml).not.toContain('<loc>https://external.com/landing</loc>')
    expect(xml).not.toContain('https://example.com/https://external.com/landing')
    expect(xml).not.toContain('Invalid Date')
  })
})
