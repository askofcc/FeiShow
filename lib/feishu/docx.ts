import { feishuFetch } from "./client";
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
  try {
    return await listDocumentBlocksOnce(documentId);
  } catch (firstError) {
    const resolved = await resolveWikiToDocumentId(documentId);
    if (resolved && resolved !== documentId) {
      return listDocumentBlocksOnce(resolved);
    }
    throw firstError;
  }
}

export async function getDocumentMeta(documentId: string): Promise<{ title?: string; revision_id?: number }> {
  try {
    const data = await feishuFetch<{ document?: { title?: string; revision_id?: number } }>(
      `/open-apis/docx/v1/documents/${encodeURIComponent(documentId)}`,
    );
    return {
      title: data.document?.title,
      revision_id: data.document?.revision_id,
    };
  } catch {
    // wiki token fallback
    const resolved = await resolveWikiToDocumentId(documentId);
    if (resolved && resolved !== documentId) {
      const data = await feishuFetch<{ document?: { title?: string; revision_id?: number } }>(
        `/open-apis/docx/v1/documents/${encodeURIComponent(resolved)}`,
      );
      return {
        title: data.document?.title,
        revision_id: data.document?.revision_id,
      };
    }
    throw new Error(`Feishu document meta failed for ${documentId}`);
  }
}

/**
 * Optional simpler path: pure markdown content (not primary renderer).
 * Official: GET /open-apis/docs/v1/content?doc_token=...&doc_type=docx&content_type=markdown
 */
export async function getDocumentMarkdown(documentId: string): Promise<string | null> {
  try {
    const qs = new URLSearchParams({
      doc_token: documentId,
      doc_type: "docx",
      content_type: "markdown",
    });
    const data = await feishuFetch<{ content?: string }>(`/open-apis/docs/v1/content?${qs.toString()}`);
    return data.content || null;
  } catch {
    return null;
  }
}
