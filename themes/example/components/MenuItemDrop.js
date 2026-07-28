import SmartLink from '@/components/SmartLink'
import { useState } from 'react'

/**
 * 支持下拉二级的菜单
 * @param {*} param0
 * @returns
 */
function isFaIcon(icon) {
  if (!icon || typeof icon !== 'string') return false
  return /(^|\s)(fa[srlbd]?|fas|far|fal|fab|fa)\s/.test(icon) || icon.includes('fa-')
}

function MenuIcon({ icon }) {
  if (!icon) return null
  if (isFaIcon(icon)) return <i className={icon} />
  // emoji / plain text icon
  return <span className='mr-1'>{icon}</span>
}

export const MenuItemDrop = ({ link }) => {
  const [show, changeShow] = useState(false)
  const hasSubMenu = link?.subMenus?.length > 0

  if (!link || link.show === false) {
    return null
  }

  const label = link?.name || link?.title || ''

  return (
    <li
      className='relative cursor-pointer'
      onMouseOver={() => changeShow(true)}
      onMouseOut={() => changeShow(false)}>
      {!hasSubMenu && (
        <div className='rounded px-2 md:pl-0 md:mr-3 my-4 md:pr-3 text-gray-700 dark:text-gray-200 no-underline md:border-r border-gray-light'>
          <SmartLink href={link?.href} target={link?.target}>
            <MenuIcon icon={link?.icon} /> {label}
          </SmartLink>
        </div>
      )}

      {hasSubMenu && (
        <div className='rounded px-2 md:pl-0 md:mr-3 my-4 md:pr-3 text-gray-700 dark:text-gray-200 no-underline md:border-r border-gray-light'>
          <MenuIcon icon={link?.icon} /> {label}
          <i
            className={`px-2 fas fa-chevron-down duration-500 transition-all ${show ? ' rotate-180' : ''}`}></i>
        </div>
      )}

      {/* 子菜单：官方用 sLink.title；飞书适配层同时提供 title/name */}
      {hasSubMenu && (
        <ul
          className={`${show ? 'visible opacity-100 top-12 pointer-events-auto' : 'invisible opacity-0 top-10 pointer-events-none'} border-gray-100 bg-white dark:bg-black dark:border-gray-800 transition-all duration-300 z-20 absolute block drop-shadow-lg`}>
          {link.subMenus.map((sLink, index) => {
            const subLabel = sLink?.title || sLink?.name || ''
            if (!subLabel && !sLink?.icon) return null
            return (
              <li
                key={index}
                className='not:last-child:border-b-0 border-b text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900 tracking-widest transition-all duration-200 dark:border-gray-800 py-3 pr-6 pl-3'>
                <SmartLink href={sLink.href} target={sLink?.target || link?.target}>
                  <span className='text-sm text-nowrap font-extralight'>
                    {sLink?.icon ? (isFaIcon(sLink.icon) ? <i className={sLink.icon}> &nbsp; </i> : <span className="mr-1">{sLink.icon}</span>) : null}
                    {subLabel}
                  </span>
                </SmartLink>
              </li>
            )
          })}
        </ul>
      )}
    </li>
  )
}
