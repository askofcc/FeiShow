import { normalizeDocument, isContentlessPlaceholder } from '@/lib/feishu/normalize'

/** Raw Feishu docx block factory (official API shape). */
function rawBlock(block_type, extra = {}) {
  return {
    block_id: `b_${block_type}_${Math.random().toString(36).slice(2, 8)}`,
    parent_id: '',
    children: [],
    block_type,
    ...extra,
  }
}

describe('normalizeDocument drops contentless placeholder blocks', () => {
  test('filters official block_type 999 placeholder (no text / no children)', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root', text: { elements: [] } }),
      rawBlock(2, {
        block_id: 'p1',
        parent_id: 'root',
        text: { elements: [{ text_run: { content: '22222' } }] },
      }),
      rawBlock(999, { block_id: 'ph', parent_id: 'root' }),
    ])
    expect(content.blocks.map(b => b.id)).toEqual(['root', 'p1'])
    expect(content.blockMap.ph).toBeUndefined()
    expect(content.rootId).toBe('root')
  })

  test('maps reference_base (53) to bitable embed with app/table tokens', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root' }),
      rawBlock(53, {
        block_id: 'ref',
        parent_id: 'root',
        reference_base: {
          layout_mode: 'Normal',
          token: 'bascnuLz8b3ebSkahz7ggRDEPFe_tblRHzA2YtYEPHae',
          view_id: 'veweJFVvGy',
        },
      }),
    ])
    const ref = content.blockMap.ref
    expect(ref.type).toBe('feishu_embed')
    expect(ref.embed).toMatchObject({
      kind: 'bitable',
      token: 'bascnuLz8b3ebSkahz7ggRDEPFe',
      secondaryToken: 'tblRHzA2YtYEPHae',
      viewId: 'veweJFVvGy',
    })
  })

  test('keeps grid_column width_ratio', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root' }),
      rawBlock(24, { block_id: 'g', parent_id: 'root', children: ['c1', 'c2'], grid: { column_size: 2 } }),
      rawBlock(25, { block_id: 'c1', parent_id: 'g', grid_column: { width_ratio: 40 } }),
      rawBlock(25, { block_id: 'c2', parent_id: 'g', grid_column: { width_ratio: 59 } }),
    ])
    expect(content.blockMap.c1.widthRatio).toBe(40)
    expect(content.blockMap.c2.widthRatio).toBe(59)
  })

  test('filters whitespace-only unknown blocks but keeps real content', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root' }),
      rawBlock(28, {
        block_id: 'ws',
        parent_id: 'root',
        text: { elements: [{ text_run: { content: '   ' } }] },
      }),
      rawBlock(2, {
        block_id: 'real',
        parent_id: 'root',
        text: { elements: [{ text_run: { content: '正文' } }] },
      }),
    ])
    expect(content.blocks.map(b => b.id)).toEqual(['root', 'real'])
  })

  test('keeps unknown blocks that have children (containers)', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root' }),
      rawBlock(33, { block_id: 'view', parent_id: 'root', children: ['inner'] }),
      rawBlock(2, { block_id: 'inner', parent_id: 'view', text: { elements: [{ text_run: { content: 'x' } }] } }),
    ])
    expect(content.blocks.map(b => b.id)).toContain('view')
  })

  test('keeps known non-text blocks like divider and image', () => {
    const content = normalizeDocument('doc1', [
      rawBlock(1, { block_id: 'root' }),
      rawBlock(22, { block_id: 'div', parent_id: 'root' }),
      rawBlock(27, { block_id: 'img', parent_id: 'root', image: { token: 'img_tok' } }),
    ])
    expect(content.blocks.map(b => b.type)).toEqual(['page', 'divider', 'image'])
  })

  test('isContentlessPlaceholder helper semantics', () => {
    expect(isContentlessPlaceholder({ id: 'a', type: 'unknown', rawType: 999, children: [], text: [] })).toBe(true)
    expect(isContentlessPlaceholder({ id: 'b', type: 'unknown', rawType: 999, children: [], text: [{ text: ' ' }] })).toBe(true)
    expect(isContentlessPlaceholder({ id: 'c', type: 'unknown', rawType: 33, children: ['x'], text: [] })).toBe(false)
    expect(isContentlessPlaceholder({ id: 'd', type: 'paragraph', rawType: 2, children: [], text: [] })).toBe(false)
    expect(isContentlessPlaceholder({ id: 'e', type: 'divider', rawType: 22, children: [], text: [] })).toBe(false)
  })
})
