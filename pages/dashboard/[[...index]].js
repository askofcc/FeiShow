import BLOG from '@/blog.config'
import { siteConfig } from '@/lib/config'
import { resolvePostProps } from '@/lib/db/SiteDataApi'
import { DynamicLayout } from '@/themes/theme'
import PropTypes from 'prop-types'

/**
 * 根据notion的slug访问页面
 * 只解析一级目录例如 /about
 * @param {*} props
 * @returns
 */
const Dashboard = props => {
  const theme = siteConfig('THEME', BLOG.THEME, props?.NOTION_CONFIG)

  Dashboard.propTypes = {
    NOTION_CONFIG: PropTypes.object
  }
  return <DynamicLayout theme={theme} layoutName='LayoutDashboard' {...props} />
}

export async function getStaticProps({ locale }) {
  const prefix = 'dashboard'
  const props = await resolvePostProps({
    prefix,
    locale,
  })

  return {
    props,
    revalidate: process.env.EXPORT
      ? undefined
      : siteConfig(
        'NEXT_REVALIDATE_SECOND',
        BLOG.NEXT_REVALIDATE_SECOND,
        props.NOTION_CONFIG
      )
  }
}

export const getStaticPaths = () => {
  // Clerk dashboard routes are unused on Feishu self-host. Prerendering them
  // added 80-240s to Docker builds and repeatedly hit Feishu for site props.
  return {
    paths: [],
    fallback: 'blocking'
  }
}

export default Dashboard
