import { useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import FeishuRenderer from '@/components/feishu/FeishuRenderer'
import mediumZoom from '@fisch0920/medium-zoom'
import { isBrowser } from '@/lib/utils'
import 'katex/dist/katex.min.css'

const PrismMac = dynamic(() => import('@/components/PrismMac'), {
  ssr: false
})

const AdEmbed = dynamic(
  () => import('@/components/GoogleAdsense').then(m => m.AdEmbed),
  { ssr: true }
)

function getMediumZoomMargin() {
  if (typeof window === 'undefined') return 20
  const width = window.innerWidth
  if (width < 500) return 8
  if (width < 800) return 20
  if (width < 1280) return 30
  if (width < 1600) return 40
  if (width < 1920) return 48
  return 72
}

const hasCodeBlock = content => {
  if (!content?.blocks) return false
  return content.blocks.some(b => b.type === 'code')
}

/**
 * Drop-in body renderer for Feishu docs (replaces NotionRenderer path).
 * Includes image click zoom (medium-zoom), anchor auto-scroll, and code highlighting (PrismMac).
 */
export default function FeishuPage({ post, className }) {
  const zoomRef = useRef(null)

  useEffect(() => {
    if (!isBrowser) return

    // 1. 初始化 mediumZoom
    if (!zoomRef.current) {
      zoomRef.current = mediumZoom({
        background: 'rgba(0, 0, 0, 0.3)',
        margin: getMediumZoomMargin()
      })
    }

    const attachZoom = () => {
      const container = document.getElementById('notion-article')
      if (!container || !zoomRef.current) return
      const images = container.querySelectorAll(
        '.notion-image, .notion-asset-wrapper img, .notion-embed-preview-img'
      )
      images.forEach(img => {
        zoomRef.current.attach(img)
      })
    }

    attachZoom()
    const timer = setTimeout(attachZoom, 500)

    // 2. 处理 URL 锚点跳转
    const hash = window?.location?.hash
    if (hash && hash.length > 1) {
      const target = document.getElementById(hash.substring(1))
      if (target) {
        target.scrollIntoView({ block: 'start', behavior: 'smooth' })
      }
    }

    return () => {
      clearTimeout(timer)
      if (zoomRef.current) {
        zoomRef.current.detach()
      }
    }
  }, [post])

  if (post?.accessError) {
    return (
      <div
        id='notion-article'
        className={`w-full px-4 py-10 text-center text-gray-500 ${className || ''}`}
      >
        <div className='text-lg mb-2 font-medium'>无法显示文档</div>
        <div className='text-sm'>{post.accessError}</div>
      </div>
    )
  }

  if (!post?.feishuContent) {
    return (
      <div
        id='notion-article'
        className={`w-full px-4 py-8 text-gray-400 text-center ${className || ''}`}
      >
        暂无正文
      </div>
    )
  }

  const hasCode = hasCodeBlock(post.feishuContent)

  return (
    <div
      id='notion-article'
      className={`mx-auto ${className || ''}`}
    >
      <FeishuRenderer content={post.feishuContent} />
      <AdEmbed />
      {hasCode && <PrismMac />}
    </div>
  )
}
