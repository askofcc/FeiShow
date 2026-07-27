import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import Slug from '..'
import { getStaticPathsBase } from '@/lib/build/staticPaths'
import { isExport } from '@/lib/utils/buildMode'
import { checkSlugHasOneSlash } from '@/lib/utils/post'

const isStaticExport = process.env.EXPORT === 'true'

/**
 * 根据notion的slug访问页面
 * 解析二级目录 /article/about
 * @param {*} props
 * @returns
 */
const PrefixSlug = props => {
  return <Slug {...props} />
}

export async function getStaticPaths() {
  return getStaticPathsBase({
    from: 'slug-paths',
    filterFn: row => {
      // Notion style: slug already "article/xxx"
      if (checkSlugHasOneSlash(row)) return true
      // Feishu posts: slug is bare node_token, canonical path /article/{slug}
      if (row.type === 'Post' || row?.ext?.feishuType === 'post') {
        return Boolean(row.slug) && !String(row.slug).includes('/')
      }
      return false
    },
    mapPageToParams: row => {
      if (checkSlugHasOneSlash(row)) {
        return {
          params: {
            prefix: row.slug.split('/')[0],
            slug: row.slug.split('/')[1]
          }
        }
      }
      // Post → /article/{slug}
      const prefix =
        (row.href || '').replace(/^\//, '').split('/')[0] || 'article'
      return {
        params: {
          prefix,
          slug: row.slug
        }
      }
    }
  })
}

export async function getStaticProps({ params: { prefix, slug }, locale }) {
  const props = await resolvePostProps({
    prefix,
    slug,
    locale,
  })

  return {
    props,
    revalidate: isStaticExport
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      ),
    notFound: !props.post
  }
}

export default PrefixSlug
