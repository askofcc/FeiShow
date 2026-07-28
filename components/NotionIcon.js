import LazyImage from './LazyImage'

/**
 * 标题/列表图标：兼容 Notion 与飞书适配后的 pageIcon
 * - http(s) / data: / /api/feishu/media/… → 图片
 * - fas fa-xxx → Font Awesome
 * - 其它短文本 → emoji / 字符
 * 飞书文档 OpenAPI 无稳定「页面图标」字段时，pageIcon 可能来自：
 * 内容表「图标」、标题前导 emoji，或为空。
 */
const NotionIcon = ({ icon, className = '' }) => {
  if (!icon || typeof icon !== 'string') {
    return <></>
  }

  const raw = icon.trim()
  if (!raw) return <></>

  if (
    raw.startsWith('http') ||
    raw.startsWith('data:') ||
    raw.startsWith('/api/feishu/media/')
  ) {
    return (
      <LazyImage
        src={raw}
        width={32}
        height={32}
        className={`w-8 h-8 my-auto inline mr-1 ${className}`.trim()}
      />
    )
  }

  // Font Awesome class string, e.g. "fas fa-book"
  if (/^(fa[srlb]?|fa-solid|fa-regular|fa-brands)\s+fa-/.test(raw)) {
    return <i className={`${raw} mr-1 ${className}`.trim()} aria-hidden />
  }

  return <span className={`mr-1 ${className}`.trim()}>{raw}</span>
}

export default NotionIcon
