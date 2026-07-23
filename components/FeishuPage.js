import FeishuRenderer from '@/components/feishu/FeishuRenderer'

/**
 * Drop-in body renderer for Feishu docs (replaces NotionRenderer path).
 */
export default function FeishuPage({ post, className }) {
  if (post?.accessError) {
    return (
      <div className={`w-full px-4 py-10 text-center text-gray-500 ${className || ''}`}>
        <div className='text-lg mb-2'>无法显示文档</div>
        <div className='text-sm'>{post.accessError}</div>
      </div>
    )
  }
  if (!post?.feishuContent) {
    return (
      <div className={`w-full px-4 py-8 text-gray-400 text-center ${className || ''}`}>
        暂无正文
      </div>
    )
  }
  return (
    <div className={className}>
      <FeishuRenderer content={post.feishuContent} />
    </div>
  )
}
