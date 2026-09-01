import { feishuFetch } from "./client";
import { memoAsync } from "./memo";

/**
 * Official wiki OpenAPI helpers.
 * GET /open-apis/wiki/v2/spaces/get_node?token=
 * GET /open-apis/wiki/v2/spaces/:space_id/nodes?parent_node_token=
 *
 * Not the browser /space/api/wiki/... endpoints (need login cookies).
 */
export type WikiNode = {
  space_id?: string;
  node_token?: string;
  obj_token?: string;
  obj_type?: number | string;
  title?: string;
  parent_node_token?: string;
  has_child?: boolean;
  obj_create_time?: string;
  obj_edit_time?: string;
  node_create_time?: string;
  url?: string;
  owner?: string;
  creator?: string;
  node_creator?: string;
};

type GetNodeData = {
  node?: WikiNode;
};

type ListNodesData = {
  items?: WikiNode[];
  page_token?: string;
  has_more?: boolean;
};

/** Extract space_id from /wiki/space/:space_id URL or bare numeric ID (>=15 digits). */
export function parseWikiSpaceId(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  const mSpace = raw.match(/\/wiki\/space\/([0-9A-Za-z_-]+)/);
  if (mSpace?.[1]) return mSpace[1];
  if (/^\d{15,}$/.test(raw)) return raw;
  return null;
}

/** Extract wiki node token from a /wiki/xxx URL or bare token (excluding /wiki/space/). */
export function parseWikiToken(input: string): string | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  if (raw.includes("/wiki/space/")) return null;
  if (/^\d{15,}$/.test(raw)) return null;
  // bare token
  if (/^[A-Za-z0-9_-]{10,}$/.test(raw) && !raw.includes("/")) return raw;
  try {
    const u = new URL(raw);
    const m = u.pathname.match(/\/wiki\/([A-Za-z0-9_-]+)/);
    if (m?.[1] && m[1] !== "space") return m[1];
  } catch {
    const m = raw.match(/\/wiki\/([A-Za-z0-9_-]+)/);
    if (m?.[1] && m[1] !== "space") return m[1];
  }
  return null;
}

export async function resolveWikiNode(token: string): Promise<WikiNode | null> {
  if (!token) return null;
  return memoAsync("wiki-node", token, async () => {
    try {
      const qs = new URLSearchParams({ token });
      const data = await feishuFetch<GetNodeData>(
        `/open-apis/wiki/v2/spaces/get_node?${qs.toString()}`,
      );
      return data.node || null;
    } catch {
      return null;
    }
  });
}

export async function resolveWikiToDocumentId(token: string): Promise<string | null> {
  const node = await resolveWikiNode(token);
  return node?.obj_token || null;
}

/**
 * List direct children under a parent wiki node (one level, paginated).
 * This is the FeiShow "list root → articles" path.
 */
export async function listWikiChildren(
  spaceId: string,
  parentNodeToken?: string,
  options?: { pageSize?: number; maxPages?: number },
): Promise<WikiNode[]> {
  const pageSize = Math.min(options?.pageSize ?? 50, 50);
  const maxPages = options?.maxPages ?? 20;
  const out: WikiNode[] = [];
  let pageToken = "";
  let page = 0;

  while (page < maxPages) {
    page += 1;
    const qs = new URLSearchParams({ page_size: String(pageSize) });
    if (parentNodeToken) qs.set("parent_node_token", parentNodeToken);
    if (pageToken) qs.set("page_token", pageToken);

    const data = await feishuFetch<ListNodesData>(
      `/open-apis/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes?${qs.toString()}`,
    );
    out.push(...(data.items || []));
    if (!data.has_more || !data.page_token) break;
    pageToken = data.page_token;
  }

  return out;
}

/**
 * From a parent wiki URL/token, return the parent node + its child nodes.
 */
export async function listChildrenFromListRoot(listRoot: string): Promise<{
  parent: WikiNode;
  children: WikiNode[];
}> {
  const token = parseWikiToken(listRoot);
  if (!token) {
    throw new Error(`Invalid list root (need /wiki/TOKEN or bare token): ${listRoot}`);
  }
  const parent = await resolveWikiNode(token);
  if (!parent?.space_id || !parent.node_token) {
    throw new Error(`Cannot resolve wiki list root: ${token}`);
  }
  const children = await listWikiChildren(parent.space_id, parent.node_token);
  return { parent, children };
}

export function isDocxObjType(objType: WikiNode["obj_type"]): boolean {
  if (objType == null) return false;
  if (typeof objType === "number") return objType === 8 || objType === 22; // some APIs use numbers
  const t = String(objType).toLowerCase();
  return t === "docx" || t === "doc";
}
