import { slugify } from "@/lib/feishu/text-utils";
import type { PostSummary } from "@/lib/feishu/types";
import { getDocumentMeta } from "./docx";
import {
  isDocxObjType,
  listChildrenFromListRoot,
  type WikiNode,
} from "./wiki";

function unixToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  // Feishu wiki times are seconds
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

function shortId(token?: string): string {
  return (token || "item").slice(0, 8);
}

async function resolveTitle(node: WikiNode, index: number): Promise<string> {
  const fromNode = (node.title || "").trim();
  if (fromNode) return fromNode;
  if (node.obj_token) {
    try {
      const meta = await getDocumentMeta(node.obj_token);
      const t = (meta.title || "").trim();
      if (t) return t;
    } catch {
      // ignore
    }
  }
  return `未命名文档 ${index + 1}`;
}

/**
 * Parent page → child pages as PostSummary list.
 * Matches FeishuNext simplified model: list root link only.
 */
export async function postsFromListRoot(
  listRoot: string,
  options?: { category?: string },
): Promise<PostSummary[]> {
  const { parent, children } = await listChildrenFromListRoot(listRoot);
  const category = options?.category || parent.title || "文章";

  const docs = children.filter((c) => {
    // Prefer docx; if obj_type missing, keep if obj_token looks usable
    if (c.obj_type != null) return isDocxObjType(c.obj_type);
    return Boolean(c.obj_token);
  });

  const usedSlugs = new Set<string>();
  const posts: PostSummary[] = [];

  for (let i = 0; i < docs.length; i += 1) {
    const node = docs[i];
    if (!node) continue;
    const title = await resolveTitle(node, i);
    // Prefer stable ASCII wiki node_token as slug (avoids Chinese URL / encoding pitfalls).
    // Fall back to slugified title when token missing.
    let slug = (node.node_token || "").trim() || slugify(title);
    if (usedSlugs.has(slug)) {
      slug = `${slug}-${i + 1}`;
    }
    usedSlugs.add(slug);

    const date = unixToIso(node.obj_create_time || node.node_create_time);
    const lastEdited = unixToIso(node.obj_edit_time || node.obj_create_time);

    posts.push({
      id: node.node_token || node.obj_token || slug,
      slug,
      title,
      status: "published",
      type: "post",
      category,
      tags: [],
      summary: undefined,
      date,
      lastEdited,
      documentId: node.obj_token,
      order: i,
      pinned: false,
      href: `/posts/${slug}`,
    });
  }

  return posts;
}
