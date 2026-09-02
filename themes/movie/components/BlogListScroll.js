import { siteConfig } from "@/lib/config"
import { useGlobal } from "@/lib/global"
import throttle from "lodash.throttle"
import { useCallback, useEffect, useRef, useState } from "react"
import CONFIG from "../config"
import BlogPostCard from "./BlogPostCard"

export const BlogListScroll = props => {
  const { posts } = props
  const { locale } = useGlobal()

  const [page, updatePage] = useState(1)

  let hasMore = false
  const postsToShow = posts
    ? Object.assign(posts).slice(
        0,
        parseInt(siteConfig("POSTS_PER_PAGE", 12, props?.NOTION_CONFIG)) * page
      )
    : []

  if (posts) {
    const totalCount = posts.length
    hasMore =
      page * parseInt(siteConfig("POSTS_PER_PAGE", 12, props?.NOTION_CONFIG)) <
      totalCount
  }
  const handleGetMore = () => {
    if (!hasMore) return
    updatePage(page + 1)
  }

  const targetRef = useRef(null)

  // 监听滚动自动分页加载
  const scrollTrigger = useCallback(
    throttle(() => {
      const scrollS = window.scrollY + window.outerHeight
      const clientHeight = targetRef?.current?.clientHeight || 0
      if (scrollS > clientHeight + 100) {
        handleGetMore()
      }
    }, 500)
  )
  const showPageCover = siteConfig("MOVIE_POST_LIST_COVER", null, CONFIG)

  useEffect(() => {
    window.addEventListener("scroll", scrollTrigger, { passive: true })

    return () => {
      window.removeEventListener("scroll", scrollTrigger)
    }
  }, [scrollTrigger])

  return (
    <div
      id="posts-wrapper"
      className={`w-full ${showPageCover ? "md:pr-2" : "md:pr-12"} mb-12`}
      ref={targetRef}>
      <div className="grid md:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-20 xl:gap-24 2xl:grid-cols-4">
        {postsToShow?.map(post => (
          <BlogPostCard key={post.id || post.slug} post={post} />
        ))}
      </div>

      <div
        onClick={handleGetMore}
        className="w-full my-4 py-4 text-center cursor-pointer text-neutral-400 hover:text-white transition-colors">
        {hasMore ? locale.COMMON.MORE : `${locale.COMMON.NO_MORE} 😰`}
      </div>
    </div>
  )
}
