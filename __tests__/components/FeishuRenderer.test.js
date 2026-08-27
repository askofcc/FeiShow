import { render } from '@testing-library/react'
import FeishuRenderer from '@/components/feishu/FeishuRenderer'

jest.mock('@/lib/global', () => ({
  useGlobal: () => ({ isDarkMode: false })
}))

jest.mock('@/components/Equation', () => ({
  Equation: () => null
}))

const buildContent = blocks => ({
  documentId: 'doc1',
  title: 't',
  rootId: 'root',
  blocks,
  blockMap: Object.fromEntries(blocks.map(b => [b.id, b]))
})

describe('FeishuRenderer embed/file cleanup', () => {
  it('file block renders a single clean download card without redundant button/hint', () => {
    const blocks = [
      {
        id: 'root',
        type: 'page',
        children: ['f1'],
        text: [],
        rawType: 1
      },
      {
        id: 'f1',
        type: 'file',
        parentId: 'root',
        children: [],
        rawType: 23,
        text: [{ text: 'logs (1).txt', style: { link: '/api/feishu/media/tok1' } }]
      }
    ]
    const { container } = render(<FeishuRenderer content={buildContent(blocks)} />)
    const card = container.querySelector('a.notion-file-card')
    expect(card).toBeTruthy()
    expect(card.getAttribute('href')).toBe('/api/feishu/media/tok1')
    expect(card.textContent).toContain('logs (1).txt')
    expect(card.className).toContain('w-full')
    // no redundant affordances
    expect(card.textContent).not.toContain('点击下载附件')
    expect(card.textContent).not.toContain('下载')
    // extension badge
    expect(card.textContent).toContain('TXT')
    // no external feishu links anywhere
    expect(container.querySelector('a[href*="feishu.cn"]')).toBeNull()
  })

  it('sheet/bitable/mindnote/board embeds render without external feishu.cn CTAs', () => {
    const blocks = [
      {
        id: 'root',
        type: 'page',
        children: ['s1', 'b1', 'm1', 'bd'],
        text: [],
        rawType: 1
      },
      {
        id: 's1',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 30,
        embed: { kind: 'sheet', title: '电子表格' }
      },
      {
        id: 'b1',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 18,
        embed: {
          kind: 'bitable',
          token: 'appX',
          secondaryToken: 'tblY',
          title: '多维表格',
          preview: { headers: ['A', 'B'], rows: [['1', '2']] }
        }
      },
      {
        id: 'm1',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 29,
        embed: { kind: 'mindnote', title: '思维笔记' }
      },
      {
        id: 'bd',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 43,
        embed: { kind: 'board', title: '画板' }
      }
    ]
    const { container } = render(<FeishuRenderer content={buildContent(blocks)} />)
    // bitable preview table still shows data
    expect(container.querySelector('.notion-embed-table-preview table')).toBeTruthy()
    // zero external feishu.cn anchors
    expect(container.querySelectorAll('a[href*="feishu.cn"]').length).toBe(0)
    // zero CTA labels
    expect(container.textContent).not.toContain('在飞书中打开')
    expect(container.textContent).not.toContain('打开原表')
  })

  it('single-row sheet preview renders as headerless data table', () => {
    const blocks = [
      {
        id: 'root',
        type: 'page',
        children: ['s1'],
        text: [],
        rawType: 1
      },
      {
        id: 's1',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 30,
        embed: {
          kind: 'sheet',
          title: '电子表格',
          preview: { headers: [], rows: [['1', '', '3']] }
        }
      }
    ]
    const { container } = render(<FeishuRenderer content={buildContent(blocks)} />)
    const table = container.querySelector('.notion-embed-table-preview table')
    expect(table).toBeTruthy()
    // no thead when there is no header row
    expect(table.querySelector('thead')).toBeNull()
    // the single data row is rendered with its values
    const cells = [...table.querySelectorAll('td')].map(td => td.textContent)
    expect(cells).toEqual(['1', '—', '3'])
  })

  it('wiki embed with children renders internal links; empty wiki renders nothing', () => {
    const withChildren = [
      {
        id: 'root',
        type: 'page',
        children: ['w1'],
        text: [],
        rawType: 1
      },
      {
        id: 'w1',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 51,
        embed: {
          kind: 'wiki',
          token: 'wikX',
          title: '知识库目录',
          preview: { headers: ['子页面', '_token'], rows: [['子页A', 'tokA']] }
        }
      }
    ]
    const r1 = render(<FeishuRenderer content={buildContent(withChildren)} />)
    expect(r1.container.querySelector('.notion-embed-card')).toBeTruthy()
    expect(r1.container.querySelectorAll('a[href*="feishu.cn"]').length).toBe(0)

    const emptyWiki = [
      {
        id: 'root',
        type: 'page',
        children: ['w2'],
        text: [],
        rawType: 1
      },
      {
        id: 'w2',
        type: 'feishu_embed',
        parentId: 'root',
        children: [],
        rawType: 51,
        embed: { kind: 'wiki', token: 'selfToken', title: '知识库子目录' }
      }
    ]
    const r2 = render(<FeishuRenderer content={buildContent(emptyWiki)} />)
    expect(r2.container.querySelector('.notion-embed-card')).toBeNull()
    expect(r2.container.textContent).not.toContain('该知识库目录暂无子页面')
  })

  it('callout maps round_pushpin emoji and keeps child text', () => {
    const blocks = [
      { id: 'root', type: 'page', children: ['c1'], text: [], rawType: 1 },
      {
        id: 'c1',
        type: 'callout',
        parentId: 'root',
        children: ['t1'],
        rawType: 19,
        callout: { emoji: 'round_pushpin', backgroundColor: '5' },
        text: []
      },
      {
        id: 't1',
        type: 'paragraph',
        parentId: 'c1',
        children: [],
        rawType: 2,
        text: [{ text: '各门店本周销售量 4972 单' }]
      }
    ]
    const { container } = render(<FeishuRenderer content={buildContent(blocks)} />)
    expect(container.textContent).toContain('📌')
    expect(container.textContent).toContain('各门店本周销售量 4972 单')
  })

  it('grid columns honor widthRatio', () => {
    const blocks = [
      { id: 'root', type: 'page', children: ['g'], text: [], rawType: 1 },
      { id: 'g', type: 'grid', parentId: 'root', children: ['c1', 'c2'], rawType: 24 },
      { id: 'c1', type: 'grid_column', parentId: 'g', children: ['p1'], rawType: 25, widthRatio: 40 },
      { id: 'c2', type: 'grid_column', parentId: 'g', children: ['p2'], rawType: 25, widthRatio: 60 },
      { id: 'p1', type: 'paragraph', parentId: 'c1', children: [], rawType: 2, text: [{ text: '左' }] },
      { id: 'p2', type: 'paragraph', parentId: 'c2', children: [], rawType: 2, text: [{ text: '右' }] }
    ]
    const { container } = render(<FeishuRenderer content={buildContent(blocks)} />)
    const cols = [...container.querySelectorAll('.notion-column')]
    expect(cols.length).toBeGreaterThanOrEqual(2)
    expect(cols[0].style.width).toBe('40%')
    expect(cols[1].style.width).toBe('60%')
  })
})
