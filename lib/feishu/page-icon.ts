/**
 * Resolve display icon for list/title.
 *
 * Feishu docx OpenAPI has stable cover, but NO stable page-icon field.
 * Product path:
 *   1) content-table 「图标」 (emoji / image URL / fa class)
 *   2) leading emoji in title (common Feishu habit)
 *   3) null — themes already hide empty NotionIcon
 */

/** Rough leading emoji / symbol from title. */
export function extractLeadingEmoji(title?: string | null): string | null {
  if (!title) return null
  const t = title.trim()
  if (!t) return null
  // Avoid CJK / alnum as icon
  const firstCode = t.codePointAt(0)
  if (firstCode == null) return null
  if (firstCode >= 0x4e00 && firstCode <= 0x9fff) return null
  if (
    (firstCode >= 0x30 && firstCode <= 0x39) ||
    (firstCode >= 0x41 && firstCode <= 0x5a) ||
    (firstCode >= 0x61 && firstCode <= 0x7a)
  ) {
    return null
  }
  // Emoji / symbol ranges (BMP + common supplemental via surrogate pairs handled by fromCodePoint length)
  const isEmojiLike =
    (firstCode >= 0x1f300 && firstCode <= 0x1faff) ||
    (firstCode >= 0x2600 && firstCode <= 0x27bf) ||
    (firstCode >= 0x1f1e0 && firstCode <= 0x1f1ff) ||
    (firstCode >= 0x2300 && firstCode <= 0x23ff) ||
    firstCode === 0x00a9 ||
    firstCode === 0x00ae
  if (!isEmojiLike && firstCode < 0x1f000) {
    // allow a few common symbols but skip plain punctuation
    if (firstCode < 0x80) return null
  }
  // Take one or two code points (emoji + optional variation selector)
  let end = firstCode > 0xffff ? 2 : 1
  const second = t.codePointAt(end)
  if (second === 0xfe0f || second === 0x200d) {
    // variation selector or ZWJ — take a bit more conservatively
    end = Math.min(t.length, end + (second > 0xffff ? 2 : 1) + 2)
  }
  const icon = t.slice(0, Math.min(t.length, 8))
  // Prefer single grapheme-ish: stop at whitespace
  const space = icon.search(/\s/)
  const out = space > 0 ? icon.slice(0, space) : icon.slice(0, end > 4 ? 4 : end === 1 ? 2 : end)
  // final: if starts with emoji-like codepoint return first 1–2 chars by codepoint
  try {
    return String.fromCodePoint(firstCode) + (
      second === 0xfe0f ? String.fromCodePoint(second) : ''
    )
  } catch {
    return out || null
  }
}

export function isFontAwesomeClass(icon: string): boolean {
  return /^(fa[srlb]?|fa-solid|fa-regular|fa-brands)\s+fa-/.test(icon.trim())
}

/**
 * @param tableIcon content-table 图标 field
 * @param title document/list title
 */
export function resolvePageIcon(
  tableIcon?: string | null,
  title?: string | null
): string | null {
  const raw = (tableIcon || '').trim()
  if (raw) {
    if (/^(https?:\/\/|data:|\/api\/feishu\/media\/)/i.test(raw)) return raw
    if (isFontAwesomeClass(raw)) return raw
    if (raw.length <= 16) return raw
  }
  return extractLeadingEmoji(title)
}
