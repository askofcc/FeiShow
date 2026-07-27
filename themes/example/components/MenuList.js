import { siteConfig } from '@/lib/config'
import { useGlobal } from '@/lib/global'
import CONFIG from '../config'
import { MenuItemDrop } from './MenuItemDrop'

/**
 * 导航菜单列表
 * Feishu: CUSTOM_MENU + customMenu from content table (菜单/子菜单)
 * @param {*} props
 * @returns
 */
export const MenuList = props => {
  const { customNav, customMenu, NOTION_CONFIG } = props
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

  // Prefer page props config so Feishu adapter CUSTOM_MENU=true is visible
  const useCustom = siteConfig('CUSTOM_MENU', true, NOTION_CONFIG || props?.NOTION_CONFIG)
  const menuFromFeishu = Array.isArray(customMenu)
    ? customMenu
    : Array.isArray(customNav)
      ? customNav
      : []

  let links
  if (useCustom && menuFromFeishu.length > 0) {
    // Fully switch to Feishu/Notion Menu rows
    links = menuFromFeishu
  } else {
    links = defaults
    if (menuFromFeishu.length > 0) {
      links = links.concat(menuFromFeishu)
    } else if (customNav) {
      links = links.concat(customNav)
    }
  }

  if (!links || links.length === 0) {
    return null
  }

  return (
    <nav className='w-full bg-white md:pt-0 px-6 relative z-20 border-t border-b border-gray-light dark:border-hexo-black-gray dark:bg-black'>
      <div className='mx-auto max-w-4xl md:flex justify-between items-center text-sm md:text-md md:justify-start'>
        <ul className='w-full text-center md:text-left flex flex-wrap justify-center items-stretch md:justify-start md:items-start'>
          {links.map((link, index) => (
            <MenuItemDrop key={link?.id || link?.name || link?.title || index} link={link} />
          ))}
        </ul>
      </div>
    </nav>
  )
}
