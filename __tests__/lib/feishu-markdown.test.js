import { contentToMarkdown } from '@/lib/feishu/markdown'

function page(blocks) {
  const blockMap = Object.fromEntries(blocks.map(b => [b.id, b]))
  return {
    documentId: 'doc1',
    title: '示例文章',
    rootId: 'root',
    blocks,
    blockMap
  }
}

describe('contentToMarkdown', () => {
  test('projects headings, lists, code from feishuContent', () => {
    const md = contentToMarkdown(
      page([
        { id: 'root', type: 'page', children: ['h', 'p', 'li1', 'li2', 'code'], text: [{ text: '示例文章' }] },
        { id: 'h', type: 'heading2', parentId: 'root', children: [], text: [{ text: '背景' }] },
        { id: 'p', type: 'paragraph', parentId: 'root', children: [], text: [{ text: '一段正文', style: { bold: true } }] },
        { id: 'li1', type: 'bullet', parentId: 'root', children: [], text: [{ text: '条目一' }] },
        { id: 'li2', type: 'bullet', parentId: 'root', children: [], text: [{ text: '条目二' }] },
        {
          id: 'code',
          type: 'code',
          parentId: 'root',
          children: [],
          language: 'js',
          text: [{ text: 'const a = 1' }]
        }
      ])
    )
    expect(md).toContain('# 示例文章')
    expect(md).toContain('## 背景')
    expect(md).toContain('**一段正文**')
    expect(md).toContain('- 条目一')
    expect(md).toContain('- 条目二')
    expect(md).toContain('```js')
    expect(md).toContain('const a = 1')
  })

  test('does not invent body for unread embeds', () => {
    const md = contentToMarkdown(
      page([
        { id: 'root', type: 'page', children: ['embed'], text: [] },
        { id: 'embed', type: 'feishu_embed', parentId: 'root', children: [], embed: { kind: 'board', title: '画板' } }
      ])
    )
    expect(md).toContain('*画板*')
    expect(md).not.toMatch(/whiteboard|protobuf/i)
  })
})
