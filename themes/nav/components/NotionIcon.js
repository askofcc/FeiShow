import LazyImage from "@/components/LazyImage"

/**
 * notion/feishu 的图标icon
 * 可能是emoji 可能是 svg 也可能是 图片或 FontAwesome
 * @returns
 */
const NotionIcon = ({ icon, className = "" }) => {
  if (!icon || typeof icon !== "string") {
    return null
  }
  const raw = icon.trim()
  if (!raw) return null

  if (
    raw.startsWith("http") ||
    raw.startsWith("data:") ||
    raw.startsWith("/api/feishu/media/") ||
    raw.startsWith("/")
  ) {
    return (
      <LazyImage
        src={raw}
        width={40}
        height={40}
        className={`w-10 h-10 inline object-cover rounded-md mr-1 ${className}`.trim()}
      />
    )
  }

  if (/^(fa[srlb]?|fa-solid|fa-regular|fa-brands)\s+fa-/.test(raw)) {
    return <i className={`${raw} mr-1 text-2xl ${className}`.trim()} aria-hidden />
  }

  return <span className={`mr-1 text-3xl ${className}`.trim()}>{raw}</span>
}

export default NotionIcon
