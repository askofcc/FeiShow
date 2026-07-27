import siteConfig from "@/lib/feishu/config";
import { feishuFetch } from "./client";

/** Bitable list/index via official records/search. See docs/STABLE_FEISHU_DATA.md */

export type BitableFieldValue =
  | string
  | number
  | boolean
  | null
  | Array<{ text?: string; type?: string; link?: string; file_token?: string; name?: string; url?: string }>
  | Array<string>
  | { link?: string; text?: string }
  | Record<string, unknown>;

export type BitableRecord = {
  record_id: string;
  fields: Record<string, BitableFieldValue>;
  created_time?: number | string;
  last_modified_time?: number | string;
};

type SearchResult = {
  items?: BitableRecord[];
  has_more?: boolean;
  page_token?: string;
  total?: number;
};

export async function listBitableRecords(options?: {
  pageSize?: number;
  maxPages?: number;
}): Promise<BitableRecord[]> {
  const { bitableAppToken, bitableTableId, bitableViewId } = siteConfig.feishu;
  if (!bitableAppToken || !bitableTableId) {
    throw new Error("Missing FEISHU_BITABLE_APP_TOKEN / FEISHU_BITABLE_TABLE_ID");
  }

  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 20;
  const records: BitableRecord[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    page += 1;
    const body: Record<string, unknown> = {
      page_size: pageSize,
      automatic_fields: true,
    };
    if (bitableViewId) body.view_id = bitableViewId;
    if (pageToken) body.page_token = pageToken;

    // page_size typically up to 500; we default 100 and cap maxPages to bound work
    const data = await feishuFetch<SearchResult>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(bitableAppToken)}/tables/${encodeURIComponent(bitableTableId)}/records/search`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    records.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken && page < maxPages);

  return records;
}

export function extractTextField(value: BitableFieldValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          return item.text || item.name || item.link || item.url || "";
        }
        return "";
      })
      .filter(Boolean)
      .join("");
  }
  if (typeof value === "object") {
    const obj = value as { text?: string; link?: string };
    return obj.text || obj.link || "";
  }
  return "";
}

export function extractMultiSelect(value: BitableFieldValue | undefined): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    return value
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "text" in item) return item.text || "";
        return "";
      })
      .filter(Boolean) as string[];
  }
  return [];
}

export function extractDate(value: BitableFieldValue | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === "number") {
    // Feishu often returns ms timestamp.
    const ms = value < 1e12 ? value * 1000 : value;
    return new Date(ms).toISOString();
  }
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return undefined;
}

export function extractAttachmentUrl(value: BitableFieldValue | undefined): string | undefined {
  if (!Array.isArray(value) || value.length === 0) return undefined;
  const first = value[0];
  if (typeof first === "string") return first;
  if (first && typeof first === "object") {
    if (first.url) return first.url;
    if (first.file_token) return `/api/feishu/media/${first.file_token}`;
    if (first.link) return first.link;
  }
  return undefined;
}

/**
 * Document field may be text token, link, or duplex link to a Feishu doc.
 */
export function extractDocumentId(value: BitableFieldValue | undefined): string | undefined {
  const raw = extractTextField(value).trim();
  if (!raw) return undefined;

  // direct token-like string
  if (/^[a-zA-Z0-9]{10,}$/.test(raw) && !raw.includes("/")) return raw;

  // URLs: https://xxx.feishu.cn/docx/TOKEN or /wiki/TOKEN or /docs/TOKEN
  const match = raw.match(/\/(docx|wiki|docs|doc)\/([a-zA-Z0-9]+)/);
  if (match?.[2]) return match[2];

  return raw;
}

/** Search records from an arbitrary bitable app/table. */
export async function listBitableRecordsFrom(
  appToken: string,
  tableId: string,
  options?: { pageSize?: number; maxPages?: number; viewId?: string },
): Promise<BitableRecord[]> {
  if (!appToken || !tableId) {
    throw new Error("listBitableRecordsFrom: missing appToken/tableId");
  }
  const pageSize = options?.pageSize ?? 100;
  const maxPages = options?.maxPages ?? 20;
  const records: BitableRecord[] = [];
  let pageToken: string | undefined;
  let page = 0;

  do {
    page += 1;
    const body: Record<string, unknown> = {
      page_size: pageSize,
      automatic_fields: true,
    };
    if (options?.viewId) body.view_id = options.viewId;
    if (pageToken) body.page_token = pageToken;

    const data = await feishuFetch<SearchResult>(
      `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records/search`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    );

    records.push(...(data.items || []));
    pageToken = data.has_more ? data.page_token : undefined;
  } while (pageToken && page < maxPages);

  return records;
}

/**
 * Resolve document/wiki token from bitable field (text, link, mention array).
 */
export function extractDocToken(value: BitableFieldValue | undefined): string | undefined {
  if (value == null) return undefined;

  // mention / link cell arrays
  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") continue;
      const any = item as Record<string, unknown>;
      if (typeof any.token === "string" && any.token) return any.token;
      if (typeof any.link === "string") {
        const m = String(any.link).match(/\/(docx|wiki|docs|doc)\/([a-zA-Z0-9]+)/);
        if (m?.[2]) return m[2];
      }
      if (typeof any.url === "string") {
        const m = String(any.url).match(/\/(docx|wiki|docs|doc)\/([a-zA-Z0-9]+)/);
        if (m?.[2]) return m[2];
      }
      if (typeof any.text === "string") {
        const m = String(any.text).match(/\/(docx|wiki|docs|doc)\/([a-zA-Z0-9]+)/);
        if (m?.[2]) return m[2];
        if (/^[a-zA-Z0-9]{10,}$/.test(any.text)) return any.text;
      }
    }
  }

  return extractDocumentId(value);
}

export type BitableView = {
  view_id?: string
  view_name?: string
  view_type?: string
}

/** List table views (for reading user-facing row order). */
export async function listBitableViews(
  appToken: string,
  tableId: string
): Promise<BitableView[]> {
  const data = await feishuFetch<{ items?: BitableView[] }>(
    `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/views?page_size=50`
  )
  return data.items || []
}

/**
 * Prefer explicit viewId; else first grid view; else first view.
 * Content table "排序" is often just the Grid view order — must pass view_id to search.
 */
export async function resolveBitableViewId(
  appToken: string,
  tableId: string,
  preferred?: string
): Promise<string | undefined> {
  if (preferred && String(preferred).trim()) return String(preferred).trim()
  try {
    const views = await listBitableViews(appToken, tableId)
    if (!views.length) return undefined
    const grid = views.find(v => String(v.view_type || '').toLowerCase() === 'grid')
    return grid?.view_id || views[0]?.view_id
  } catch (e) {
    console.warn('[feishu] list views failed, fall back to unordered search', e)
    return undefined
  }
}

