/* eslint-disable */
import { siteConfig } from "@/lib/config"
import { useNavGlobal } from "@/themes/nav"
import CONFIG from "../config"
import BlogPostItem from "./BlogPostItem"
import BlogPostListEmpty from "./BlogPostListEmpty"

/**
 * 博客列表滚动分页
 * @param posts 所有文章
 * @param tags 所有标签
 * @returns {JSX.Element}
 * @constructor
 */
const BlogPostListAll = (props) => {
  const { customMenu } = props
  const { filteredNavPages } = useNavGlobal()

  // 对自定义分类格式化，方便后续使用分类名称做索引，检索同步图标信息
  const links = customMenu || []
  const filterLinks = {}
  links.forEach(link => {
    if (!link) return
    const linkTitle = link.title ? String(link.title).trim() : ""
    if (linkTitle) {
      filterLinks[linkTitle] = { title: link.title, icon: link.icon, pageIcon: link.pageIcon }
    }
    if (Array.isArray(link?.subMenus)) {
      link.subMenus.forEach(group => {
        if (!group) return
        const subMenuTitle = group.title ? String(group.title).trim() : ""
        if (subMenuTitle) {
          filterLinks[subMenuTitle] = { title: group.title, icon: group.icon, pageIcon: group.pageIcon }
        }
      })
    }
  })

  const autoSort = Boolean(siteConfig("NAV_AUTO_SORT", true, CONFIG))
  const navPages = Array.isArray(filteredNavPages) ? filteredNavPages : []

  const groupedArray = navPages.reduce((groups, item) => {
    if (!item) return groups
    const categoryName = item?.category ? String(item.category).trim() : ""
    const categoryIcon = filterLinks[categoryName]?.icon || ""
    let existingGroup = null

    if (autoSort) {
      existingGroup = groups.find(group => group.category === categoryName)
    } else {
      existingGroup = groups[groups.length - 1]
    }

    if (existingGroup && existingGroup.category === categoryName) {
      existingGroup.items.push(item)
    } else {
      groups.push({ category: categoryName, icon: categoryIcon, items: [item] })
    }
    return groups
  }, [])

  if (!groupedArray || groupedArray.length === 0) {
    return <BlogPostListEmpty />
  }

  return (
    <div id="posts-wrapper" className="stack-list w-full mx-auto justify-center">
      {groupedArray.map((group, index) => (
        <BlogPostItem
          key={index}
          group={group}
          filterLinks={filterLinks}
          onHeightChange={props.onHeightChange}
        />
      ))}
    </div>
  )
}

export default BlogPostListAll
