import type {
  FeishuBlock,
  FeishuBlockType,
  FeishuPageContent,
  PostSummary,
  TextRun,
} from "@/lib/feishu/types";
import { plainTextFromRuns, slugify } from "@/lib/feishu/text-utils";
import siteConfig from "@/lib/feishu/config";
import {
  extractAttachmentUrl,
  extractDate,
  extractDocumentId,
  extractMultiSelect,
  extractTextField,
  type BitableRecord,
} from "./bitable";
import type { FeishuRawBlock, FeishuRawTextElement } from "./docx";

/**
 * Official Feishu Docx BlockType enum (open platform).
 * See docs/FEISHU_BLOCK_MAPPING.md — do not invent Notion types.
 */
const BLOCK_TYPE_MAP: Record<number, FeishuBlockType> = {
  1: "page",
  2: "paragraph",
  3: "heading1",
  4: "heading2",
  5: "heading3",
  6: "heading4",
  7: "heading5",
  8: "heading6",
  9: "heading6", // heading7 collapsed
  10: "heading6", // heading8
  11: "heading6", // heading9
  12: "bullet",
  13: "ordered",
  14: "code",
  15: "quote",
  16: "equation",
  17: "todo",
  18: "unknown", // bitable
  19: "callout",
  20: "unknown", // chat_card
  21: "diagram",
  22: "divider",
  23: "file",
  24: "grid",
  25: "grid_column",
  26: "embed", // iframe
  27: "image",
  28: "unknown", // isv
  29: "unknown", // mindnote
  30: "unknown", // sheet
  31: "table",
  32: "table_cell",
  33: "unknown", // view
  34: "quote_container",
  48: "bookmark", // link_preview
};


/**
 * Official Feishu code block language enum mapping.
 */
const FEISHU_CODE_LANGUAGES: Record<number, string> = {
  1: 'plaintext',
  2: 'abap',
  3: 'ada',
  4: 'apache',
  5: 'apex',
  6: 'assembly',
  7: 'bash',
  8: 'c',
  9: 'csharp',
  10: 'cpp',
  11: 'clojure',
  12: 'cobol',
  13: 'coffeescript',
  14: 'css',
  15: 'd',
  16: 'dart',
  17: 'delphi',
  18: 'dockerfile',
  19: 'erlang',
  20: 'fortran',
  21: 'foxpro',
  22: 'go',
  23: 'groovy',
  24: 'html',
  25: 'java',
  26: 'javascript',
  27: 'json',
  28: 'julia',
  29: 'kotlin',
  30: 'latex',
  31: 'lisp',
  32: 'logo',
  33: 'lua',
  34: 'matlab',
  35: 'makefile',
  36: 'markdown',
  37: 'nginx',
  38: 'objectivec',
  39: 'openedgeabl',
  40: 'pascal',
  41: 'perl',
  42: 'php',
  43: 'postscript',
  44: 'powershell',
  45: 'prolog',
  46: 'protobuf',
  47: 'python',
  48: 'r',
  49: 'raspberrypi',
  50: 'ruby',
  51: 'rust',
  52: 'sas',
  53: 'scss',
  54: 'sql',
  55: 'scala',
  56: 'scheme',
  57: 'scratch',
  58: 'shell',
  59: 'swift',
  60: 'thrift',
  61: 'typescript',
  62: 'vbscript',
  63: 'visualbasic',
  64: 'xml',
  65: 'yaml',
  66: 'wasm',
  67: 'cmake',
  68: 'diff',
  69: 'gherkin',
  70: 'graphql',
  71: 'http',
  72: 'ini',
  73: 'less',
  74: 'mermaid',
  75: 'protobuf',
  76: 'scss',
  77: 'solidity',
  78: 'toml',
  79: 'vue',
};

export function normalizeCodeLanguage(langCode?: number | string): string {
  if (langCode == null) return 'plaintext';
  if (typeof langCode === 'number') {
    return FEISHU_CODE_LANGUAGES[langCode] || 'plaintext';
  }
  const num = Number(langCode);
  if (!Number.isNaN(num) && FEISHU_CODE_LANGUAGES[num]) {
    return FEISHU_CODE_LANGUAGES[num];
  }
  return String(langCode).toLowerCase() || 'plaintext';
}

function safeDecodeUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    return decodeURIComponent(url);
  } catch {
    return url;
  }
}

function elementsOf(block: FeishuRawBlock): FeishuRawTextElement[] {
  return (
    block.page?.elements ||
    block.text?.elements ||
    block.heading1?.elements ||
    block.heading2?.elements ||
    block.heading3?.elements ||
    block.heading4?.elements ||
    block.heading5?.elements ||
    block.heading6?.elements ||
    block.bullet?.elements ||
    block.ordered?.elements ||
    block.code?.elements ||
    block.quote?.elements ||
    block.todo?.elements ||
    block.callout?.elements ||
    []
  );
}

export function normalizeTextElements(elements: FeishuRawTextElement[] = []): TextRun[] {
  const runs: TextRun[] = [];
  for (const el of elements) {
    if (el.text_run?.content != null) {
      const style = el.text_run.text_element_style;
      runs.push({
        text: el.text_run.content,
        style: style
          ? {
              bold: style.bold,
              italic: style.italic,
              strikethrough: style.strikethrough,
              underline: style.underline,
              inlineCode: style.inline_code,
              link: safeDecodeUrl(style.link?.url),
            }
          : undefined,
      });
    } else if (el.mention_doc?.title) {
      runs.push({
        text: el.mention_doc.title,
        style: el.mention_doc.url ? { link: safeDecodeUrl(el.mention_doc.url) } : undefined,
      });
    } else if (el.mention_user?.user_id) {
      runs.push({
        text: '@用户',
        style: { bold: true },
      });
    } else if (el.equation?.content) {
      runs.push({
        text: el.equation.content,
        style: { inlineEquation: true, inlineCode: true },
      });
    }
  }
  return runs;
}

export function normalizeBlock(raw: FeishuRawBlock): FeishuBlock {
  const type = BLOCK_TYPE_MAP[raw.block_type] || "unknown";
  const text = normalizeTextElements(elementsOf(raw));

  const block: FeishuBlock = {
    id: raw.block_id,
    type,
    parentId: raw.parent_id,
    children: raw.children || [],
    text,
    rawType: raw.block_type,
  };

  if (type === "todo") {
    block.checked = Boolean(raw.todo?.style?.done);
  }

  if (type === "code") {
    block.language = normalizeCodeLanguage(raw.code?.style?.language);
  }

  if (type === "image" && raw.image) {
    block.image = {
      token: raw.image.token,
      url: raw.image.token ? `/api/feishu/media/${raw.image.token}` : undefined,
      width: raw.image.width,
      height: raw.image.height,
      alt: plainTextFromRuns(text) || "image",
    };
  }

  if (type === "callout") {
    block.callout = {
      emoji: raw.callout?.emoji_id,
      backgroundColor:
        raw.callout?.background_color != null
          ? String(raw.callout.background_color)
          : undefined,
    };
  }

  if (type === "table" && raw.table) {
    const rowSize = raw.table.property?.row_size || 0;
    const columnSize = raw.table.property?.column_size || 0;
    const cells = raw.table.cells || [];
    const matrix: string[][] = [];
    for (let r = 0; r < rowSize; r += 1) {
      matrix.push(cells.slice(r * columnSize, r * columnSize + columnSize));
    }
    block.table = { rowSize, columnSize, cells: matrix };
  }

  if (type === "file" && raw.file) {
    const name = raw.file.name || "附件";
    const href = raw.file.token ? `/api/feishu/media/${raw.file.token}` : undefined;
    block.text = [{ text: name, style: href ? { link: href } : undefined }];
  }

  if (type === "embed" && raw.iframe?.component?.url) {
    const url = safeDecodeUrl(raw.iframe.component.url) || raw.iframe.component.url;
    block.text = [{ text: url, style: { link: url } }];
  }

  if ((type === "bookmark" || type === "embed") && raw.bookmark?.url) {
    const url = safeDecodeUrl(raw.bookmark.url) || raw.bookmark.url;
    block.text = [{ text: url, style: { link: url } }];
  }

  if (type === "equation" && !block.text?.length) {
    // equation blocks may only expose elements via shared path; keep empty-safe fallback
    block.text = text.length ? text : [{ text: "", style: { inlineCode: true } }];
  }

  // Feishu special embeds — keep as visual cards with fallbacks.
  if (raw.block_type === 43 && raw.board?.token) {
    block.type = "feishu_embed";
    block.embed = { kind: "board", token: raw.board.token, title: "画板" };
  } else if (raw.block_type === 43) {
    block.type = "feishu_embed";
    block.embed = { kind: "board", title: "画板" };
  } else if (raw.block_type === 30 && raw.sheet?.token) {
    const full = String(raw.sheet.token);
    const [spreadsheetToken, sheetId] = full.split("_");
    block.type = "feishu_embed";
    block.embed = {
      kind: "sheet",
      token: spreadsheetToken,
      secondaryToken: sheetId,
      title: "电子表格",
    };
  } else if (raw.block_type === 30) {
    block.type = "feishu_embed";
    block.embed = { kind: "sheet", title: "电子表格" };
  } else if (raw.block_type === 18 && raw.bitable?.token) {
    const full = String(raw.bitable.token);
    const [appToken, tableId] = full.split("_");
    block.type = "feishu_embed";
    block.embed = {
      kind: "bitable",
      token: appToken,
      secondaryToken: tableId,
      title: "多维表格",
    };
  } else if (raw.block_type === 18) {
    block.type = "feishu_embed";
    block.embed = { kind: "bitable", title: "多维表格" };
  } else if (raw.block_type === 29) {
    block.type = "feishu_embed";
    block.embed = { kind: "mindnote", title: "思维笔记" };
  } else if (raw.block_type === 51 && raw.sub_page_list?.wiki_token) {
    block.type = "feishu_embed";
    block.embed = { kind: "wiki", token: raw.sub_page_list.wiki_token, title: "知识库目录" };
  } else if (raw.block_type === 51) {
    block.type = "feishu_embed";
    block.embed = { kind: "wiki", title: "知识库子目录" };
  } else if (raw.block_type === 40) {
    block.type = "feishu_embed";
    block.embed = { kind: "addon", title: "文档小组件 / 插件" };
  } else if (raw.block_type === 20) {
    block.type = "feishu_embed";
    block.embed = { kind: "chat_card", title: "会话卡片" };
  } else if (raw.block_type === 35) {
    block.type = "feishu_embed";
    block.embed = { kind: "task", title: "任务" };
  } else if (raw.block_type >= 36 && raw.block_type <= 39) {
    block.type = "feishu_embed";
    block.embed = { kind: "okr", title: "OKR" };
  } else if (raw.block_type === 41) {
    block.type = "feishu_embed";
    block.embed = { kind: "jira", title: "Jira 任务" };
  } else if (raw.block_type >= 44 && raw.block_type <= 47) {
    block.type = "feishu_embed";
    block.embed = { kind: "agenda", title: "日程 / 议程" };
  }

  return block;
}

export function normalizeDocument(
  documentId: string,
  rawBlocks: FeishuRawBlock[],
  titleFallback?: string,
): FeishuPageContent {
  const blocks = rawBlocks.map(normalizeBlock);
  const blockMap = Object.fromEntries(blocks.map((b) => [b.id, b]));
  const root = blocks.find((b) => b.type === "page") || blocks[0];
  const title =
    titleFallback ||
    plainTextFromRuns(root?.text) ||
    documentId;

  return {
    documentId,
    title,
    blocks,
    blockMap,
    rootId: root?.id,
  };
}

function normalizeType(raw: string): PostSummary["type"] {
  const v = raw.trim().toLowerCase();
  if (!v) return "post";
  if (["文档", "doc", "docs", "help"].includes(v)) return "doc";
  if (["page", "页面"].includes(v)) return "page";
  if (["菜单", "menu", "导航", ...siteConfig.menuTypes.map((x) => x.toLowerCase())].includes(v)) {
    return "menu";
  }
  if (["文章", "post", "blog", ...siteConfig.postTypes.map((x) => x.toLowerCase())].includes(v)) {
    return "post";
  }
  return raw || "post";
}

function normalizeStatus(raw: string): PostSummary["status"] {
  const v = raw.trim();
  if (!v) return "draft";
  if (v === siteConfig.publishedStatus || ["已发布", "Published", "publish", "online"].includes(v)) {
    return "published";
  }
  return v;
}

export function recordToPostSummary(record: BitableRecord): PostSummary {
  const f = siteConfig.fields;
  const fields = record.fields || {};

  const title = extractTextField(fields[f.title]) || "Untitled";
  const slugRaw = extractTextField(fields[f.slug]);
  const slug = slugify(slugRaw || title);
  const type = normalizeType(extractTextField(fields[f.type]));
  const status = normalizeStatus(extractTextField(fields[f.status]));
  const tags = extractMultiSelect(fields[f.tags]);
  const category = extractTextField(fields[f.category]) || undefined;
  const summary = extractTextField(fields[f.summary]) || undefined;
  const cover = extractAttachmentUrl(fields[f.cover]);
  const date =
    extractDate(fields[f.date]) ||
    (record.created_time
      ? extractDate(
          typeof record.created_time === "number"
            ? record.created_time
            : Number(record.created_time),
        )
      : undefined);
  const lastEdited = record.last_modified_time
    ? extractDate(
        typeof record.last_modified_time === "number"
          ? record.last_modified_time
          : Number(record.last_modified_time),
      )
    : undefined;
  const documentId = extractDocumentId(fields[f.document]);
  const orderRaw = extractTextField(fields[f.order]);
  const order = orderRaw ? Number(orderRaw) : undefined;
  const pinnedRaw = extractTextField(fields[f.pinned]);
  const pinned = ["true", "1", "是", "yes", "置顶"].includes(pinnedRaw.toLowerCase());

  const href =
    type === "doc" ? `/docs/${slug}` : type === "page" ? `/${slug}` : `/posts/${slug}`;

  return {
    id: record.record_id,
    slug,
    title,
    status,
    type,
    category,
    tags,
    summary,
    cover,
    date,
    lastEdited,
    documentId,
    order: Number.isFinite(order) ? order : undefined,
    pinned,
    href,
  };
}

export function extractHeadings(content: FeishuPageContent) {
  return content.blocks
    .filter((b) => b.type.startsWith("heading"))
    .map((b) => {
      const level = Number(b.type.replace("heading", "")) || 1;
      return {
        id: b.id,
        text: plainTextFromRuns(b.text),
        level,
      };
    })
    .filter((h) => h.text);
}

export function contentToPlainText(content: FeishuPageContent): string {
  return content.blocks
    .map((b) => plainTextFromRuns(b.text))
    .filter(Boolean)
    .join("\n");
}
