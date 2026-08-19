import { siteConfig } from '@/lib/config'

/**
 * 页脚驱动信息：产品为 FeiShow；前端壳基于 NotionNext（MIT）。
 */
export default function PoweredBy(props) {
  return (
    <div className={`inline text-sm font-serif ${props.className || ''}`}>
      <span className='mr-1'>Powered by</span>
      <a
        href='https://github.com/askofcc/FeiShow'
        className='underline justify-start'>
        FeiShow {siteConfig('VERSION')}
      </a>
      <span className='mx-1 text-gray-400'>·</span>
      <a
        href='https://github.com/notionnext-org/NotionNext'
        className='underline justify-start text-gray-500'
        title='Frontend shell based on NotionNext (MIT)'>
        based on NotionNext
      </a>
      .
    </div>
  )
}
