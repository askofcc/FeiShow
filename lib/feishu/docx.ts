import { feishuFetch } from "./client";
import { memoAsync } from "./memo";
import { resolveWikiToDocumentId } from "./wiki";

/**
 * Raw Feishu Docx block shapes (subset used by MVP).
 * Official: GET /open-apis/docx/v1/documents/:document_id/blocks
 * See docs/STABLE_FEISHU_DATA.md
 */
export type FeishuRawTextElement = {
  text_run?: {
    content?: string;
    text_element_style?: {
      bold?: boolean;
      italic?: boolean;
      strikethrough?: boolean;
      underline?: boolean;
      inline_code?: boolean;
      link?: { url?: string };
      text_color?: number;
      background_color?: number;
    };
  };
  mention_user?: { user_id?: string };
  mention_doc?: { title?: string; url?: string };
  equation?: { content?: string };
};

export type FeishuRawBlock = {
  block_id: string;
  parent_id?: string;
  children?: string[];
  block_type: number;
  page?: { elements?: FeishuRawTextElement[] };
  text?: { elements?: FeishuRawTextElement[]; style?: { align?: number } };
  heading1?: { elements?: FeishuRawTextElement[] };
  heading2?: { elements?: FeishuRawTextElement[] };
  heading3?: { elements?: FeishuRawTextElement[] };
  heading4?: { elements?: FeishuRawTextElement[] };
  heading5?: { elements?: FeishuRawTextElement[] };
  heading6?: { elements?: FeishuRawTextElement[] };
  bullet?: { elements?: FeishuRawTextElement[] };
  ordered?: { elements?: FeishuRawTextElement[] };
  code?: { elements?: FeishuRawTextElement[]; style?: { language?: number; wrap?: boolean } };
  quote?: { elements?: FeishuRawTextElement[] };
  todo?: { elements?: FeishuRawTextElement[]; style?: { done?: boolean } };
  image?: {
    token?: string;
    width?: number;
    height?: number;
    align?: number;
  };
  table?: {
    cells?: string[];
    property?: {
      row_size?: number;
      column_size?: number;
      column_width?: number[];
    };
  };
  table_cell?: Record<string, unknown>;
  divider?: Record<string, unknown>;
  callout?: {
    emoji_id?: string;
    background_color?: number;
    border_color?: number;
    elements?: FeishuRawTextElement[];
  };
  file?: { token?: string; name?: string };
  bookmark?: { url?: string };
  iframe?: { component?: { url?: string } };
  board?: { token?: string; align?: number };
  sheet?: { token?: string };
  bitable?: { token?: string };
  grid?: { column_size?: number };
  grid_column?: { width_ratio?: number };
  /** Official block_type 53: embedded bitable view (reference_base). */
  reference_base?: { token?: string; view_id?: string; layout_mode?: string };
  sub_page_list?: { wiki_token?: string };
  add_ons?: {
    component_id?: string;
    component_type_id?: string;
    record?: string;
  };
};

type BlocksPage = {
  items?: FeishuRawBlock[];
  page_token?: string;
  has_more?: boolean;
};

async function listDocumentBlocksOnce(documentId: string): Promise<FeishuRawBlock[]> {
  const blocks: FeishuRawBlock[] = [];
  let pageToken: string | undefined;
  let guard = 0;

  // page_size max 500; guard 30 ≈ 15k blocks hard stop
  do {
    guard += 1;
    const qs = new URLSearchParams({ page_size: "500", document_revision_id: "-1" });
    if (pageToken) qs.set("page_token", pageToken);

    const data = await feishuFetch<BlocksPage>(
      `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks?${qs.toString()}`,
    );

    blocks.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken && guard < 30);

  return blocks;
}

/**
 * List all docx blocks for a document.
 * If `documentId` is actually a wiki_token (common when bitable stores /wiki/ URLs),
 * falls back to official wiki get_node → obj_token, then retries once.
 */
export async function listDocumentBlocks(documentId: string): Promise<FeishuRawBlock[]> {
  return memoAsync("docx-blocks", documentId, async () => {
    try {
      return await listDocumentBlocksOnce(documentId);
    } catch (firstError) {
      const resolved = await resolveWikiToDocumentId(documentId);
      if (resolved && resolved !== documentId) {
        return listDocumentBlocksOnce(resolved);
      }
      throw firstError;
    }
  });
}

/** Full document meta from official docx API (cover + display_setting included). */
export type FeishuDisplaySetting = {
  show_authors?: boolean;
  show_create_time?: boolean;
  show_pv?: boolean;
  show_uv?: boolean;
  show_like_count?: boolean;
  show_comment_count?: boolean;
  show_related_matters?: boolean;
};

export type FeishuDocumentCover = {
  token?: string;
  offset_ratio_x?: number;
  offset_ratio_y?: number;
};

export type FeishuDocumentMeta = {
  document_id?: string;
  title?: string;
  revision_id?: number;
  cover?: FeishuDocumentCover | null;
  display_setting?: FeishuDisplaySetting | null;
};

type DocumentMetaResponse = {
  document?: FeishuDocumentMeta;
};

async function fetchDocumentMetaOnce(documentId: string): Promise<FeishuDocumentMeta> {
  const data = await feishuFetch<DocumentMetaResponse>(
    `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}`,
  );
  const doc = data.document || {};
  return {
    document_id: doc.document_id || documentId,
    title: doc.title,
    revision_id: doc.revision_id,
    cover: doc.cover || null,
    display_setting: doc.display_setting || null,
  };
}

/**
 * Get full docx meta (title / revision / cover / display_setting).
 * If `documentId` is a wiki token, resolve via get_node once.
 */
export async function getDocumentMeta(documentId: string): Promise<FeishuDocumentMeta> {
  return memoAsync("docx-meta", documentId, async () => {
    try {
      return await fetchDocumentMetaOnce(documentId);
    } catch {
      const resolved = await resolveWikiToDocumentId(documentId);
      if (resolved && resolved !== documentId) {
        return fetchDocumentMetaOnce(resolved);
      }
      throw new Error(`Feishu document meta failed for ${documentId}`);
    }
  });
}

/**
 * First page of blocks only — for list summary extraction (cheap).
 * page_size default 40 is enough for first paragraphs.
 */
export async function listDocumentBlocksFirstPage(
  documentId: string,
  pageSize = 40,
): Promise<FeishuRawBlock[]> {
  const normalizedPageSize = Math.min(Math.max(pageSize, 1), 500)
  return memoAsync(
    "docx-blocks-first-page",
    `${documentId}:${normalizedPageSize}`,
    () => listDocumentBlocksFirstPageUncached(documentId, normalizedPageSize),
  )
}

async function listDocumentBlocksFirstPageUncached(
  documentId: string,
  pageSize: number,
): Promise<FeishuRawBlock[]> {
  const qs = new URLSearchParams({
    page_size: String(pageSize),
    document_revision_id: "-1",
  });
  try {
    const data = await feishuFetch<BlocksPage>(
      `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}/blocks?${qs.toString()}`,
    );
    return data.items || [];
  } catch {
    const resolved = await resolveWikiToDocumentId(documentId);
    if (resolved && resolved !== documentId) {
      const data = await feishuFetch<BlocksPage>(
        `/open-apis/docx/v1/documents/${encodeURIComponent(resolved)}/blocks?${qs.toString()}`,
      );
      return data.items || [];
    }
    throw new Error(`Feishu document blocks (first page) failed for ${documentId}`);
  }
}
