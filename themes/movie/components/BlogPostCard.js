import LazyImage from "@/components/LazyImage"
import NotionIcon from "@/components/NotionIcon"
import { siteConfig } from "@/lib/config"
import { useGlobal } from "@/lib/global"
import SmartLink from "@/components/SmartLink"
import TagItemMini from "./TagItemMini"

const BlogPostCard = ({ index, post, showSummary, siteInfo }) => {
  const { siteInfo: globalSiteInfo } = useGlobal()
  const effectiveSiteInfo = siteInfo || globalSiteInfo
  const coverUrl =
    post?.pageCoverThumbnail ||
    effectiveSiteInfo?.pageCover ||
    siteConfig("HOME_BANNER_IMAGE") ||
    siteConfig("RANDOM_IMAGE_URL") ||
    "/bg_image.jpg"

  return (
    <article
      data-wow-delay=".2s"
      className="wow fadeInUp w-full mb-4 cursor-pointer overflow-hidden shadow-movie bg-neutral-900 rounded-xl text-white">
      <SmartLink href={post?.href || "#"} passHref legacyBehavior>
        {/* 固定海报比例，空白用暗色背景和渐变底拉升填充 */}
        <div className="group flex flex-col aspect-[2/3] justify-between relative bg-neutral-900 overflow-hidden">
          {/* 图片 填充卡片 */}
          <div className="flex flex-grow w-full h-full relative duration-200 cursor-pointer transform overflow-hidden bg-neutral-800">
            {coverUrl ? (
              <LazyImage
                src={coverUrl}
                alt={post?.title || "封面"}
                className="h-full w-full group-hover:brightness-90 group-hover:scale-105 transform object-cover duration-500"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-neutral-800 to-neutral-950 flex items-center justify-center text-neutral-600">
                <i className="fas fa-film text-4xl" />
              </div>
            )}
          </div>

          <div className="absolute bottom-28 z-20">
            {post?.tagItems && post?.tagItems.length > 0 && (
              <>
                <div className="px-6 justify-between flex p-2">
                  {post.tagItems.map(tag => (
                    <TagItemMini key={tag.name} tag={tag} />
                  ))}
                </div>
              </>
            )}
          </div>
          {/* 阴影遮罩与标题 */}
          <h2 className="absolute bottom-10 px-6 transition-all duration-200 text-xl font-semibold break-words shadow-text z-20 line-clamp-2">
            {siteConfig("POST_TITLE_ICON") && post?.pageIcon && (
              <NotionIcon icon={post.pageIcon} />
            )}
            {post?.title || "未命名"}
          </h2>

          <p className="absolute bottom-3 z-20 line-clamp-1 text-xs mx-6 text-neutral-300">
            {post?.summary || "暂无简介"}
          </p>

          <div className="h-3/4 w-full absolute left-0 bottom-0 z-10 pointer-events-none">
            <div className="h-full w-full absolute opacity-80 group-hover:opacity-100 transition-all duration-1000 bg-gradient-to-b from-transparent via-black/60 to-black"></div>
          </div>
        </div>
      </SmartLink>
    </article>
  )
}

export default BlogPostCard
