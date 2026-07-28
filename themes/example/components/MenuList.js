import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { MenuItemDrop } from './MenuItemDrop'

/**
 * 导航菜单列表
 *
 * Feishu / NotionNext 规则：
 * - CUSTOM_MENU 默认 true：内容表「菜单/子菜单」生效
 * - CUSTOM_MENU=false：主题默认搜索/归档/分类/标签
 *
 * @param {*} props
 * @returns
 */
export const MenuList = props => {
  const { customMenu, NOTION_CONFIG } = props
  const { locale } = useGlobal()

  const defaults = [
    {
      id: 1,
      icon: 'fas fa-search',
      name: locale.NAV.SEARCH,
      href: '/search',
      show: siteConfig('EXAMPLE_MENU_SEARCH', null, CONFIG)
    },
    {
      id: 2,
      icon: 'fas fa-archive',
      name: locale.NAV.ARCHIVE,
      href: '/archive',
      show: siteConfig('EXAMPLE_MENU_ARCHIVE', null, CONFIG)
    },
    {
      id: 3,
      icon: 'fas fa-folder',
      name: locale.COMMON.CATEGORY,
      href: '/category',
      show: siteConfig('EXAMPLE_MENU_CATEGORY', null, CONFIG)
    },
    {
      id: 4,
      icon: 'fas fa-tag',
      name: locale.COMMON.TAGS,
      href: '/tag',
      show: siteConfig('EXAMPLE_MENU_TAG', null, CONFIG)
    }
  ]

  const useCustom = !!siteConfig(
    'CUSTOM_MENU',
    true,
    NOTION_CONFIG || props?.NOTION_CONFIG
  )
  const menuFromTable = Array.isArray(customMenu) ? customMenu : []

  // Strict: custom OR defaults — never silent-merge both (that caused "not my config")
  const links = useCustom && menuFromTable.length > 0 ? menuFromTable : defaults

  if (!links || links.length === 0) {
    return null
  }

  return (
    <nav className='w-full bg-white md:pt-0 px-6 relative z-20 border-t border-b border-gray-light dark:border-hexo-black-gray dark:bg-black'>
      <div className='mx-auto max-w-4xl md:flex justify-between items-center text-sm md:text-md md:justify-start'>
        <ul className='w-full text-center md:text-left flex flex-wrap justify-center items-stretch md:justify-start md:items-start'>
          {links.map((link, index) => (
            <MenuItemDrop
              key={link?.id || link?.name || link?.title || index}
              link={link}
            />
          ))}
        </ul>
      </div>
    </nav>
  )
}
