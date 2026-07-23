import { getDocumentMeta } from "./docx";
import {
  isDocxObjType,
  listWikiChildren,
  parseWikiToken,
  resolveWikiNode,
  type WikiNode,
} from "./wiki";
import type { NavTreeNode, NodeKind, PostSummary } from "@/lib/feishu/types";

function unixToIso(value?: string): string | undefined {
  if (!value) return undefined;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  const ms = n < 1e12 ? n * 1000 : n;
  return new Date(ms).toISOString();
}

async function resolveTitle(node: WikiNode, fallback: string): Promise<string> {
  const t = (node.title || "").trim();
  if (t) return t;
  if (node.obj_token && isDocxObjType(node.obj_type)) {
    try {
      const meta = await getDocumentMeta(node.obj_token);
      if (meta.title?.trim()) return meta.title.trim();
    } catch {
      // ignore
    }
  }
  return fallback;
}

function nodeKind(node: WikiNode): NodeKind {
  // Directory: has children OR non-docx object (bitable/sheet treated as folder-ish embed page)
  if (node.has_child) return "folder";
  if (isDocxObjType(node.obj_type) || (!node.obj_type && node.obj_token)) return "doc";
  // bitable under wiki: treat as folder-like page without article body
  return "folder";
}

function toSummary(node: WikiNode, title: string, order: number, parentTitle?: string): PostSummary {
  const token = node.node_token || node.obj_token || `n-${order}`;
  const kind = nodeKind(node);
  const isDoc = kind === "doc";
  return {
    id: token,
    slug: token,
    title,
    status: "published", // Feishu-native: visible in tree = published
    type: isDoc ? "post" : "folder",
    kind,
    nodeToken: node.node_token,
    parentNodeToken: node.parent_node_token,
    hasChild: Boolean(node.has_child),
    category: parentTitle,
    tags: [],
    date: unixToIso(node.obj_create_time || node.node_create_time),
    lastEdited: unixToIso(node.obj_edit_time || node.obj_create_time),
    documentId: isDoc ? node.obj_token : undefined,
    order,
    pinned: false,
    href: isDoc ? `/posts/${token}` : `/docs#${token}`,
  };
}

export type WikiTreeResult = {
  root: WikiNode;
  /** Flat list of document nodes (articles). */
  posts: PostSummary[];
  /** All nodes (folders + docs) for nav. */
  nodes: PostSummary[];
  tree: NavTreeNode[];
};

/**
 * BFS wiki tree under list root.
 * - folder: has_child (or non-docx)
 * - doc: docx leaf / docx with optional children still listed as doc if docx
 * Docs that also have children appear as posts AND expand children under them in the tree.
 */
export async function buildWikiTree(listRoot: string, options?: { maxDepth?: number }): Promise<WikiTreeResult> {
  const token = parseWikiToken(listRoot);
  if (!token) throw new Error(`Invalid list root: ${listRoot}`);
  const root = await resolveWikiNode(token);
  if (!root?.space_id || !root.node_token) {
    throw new Error(`Cannot resolve list root: ${token}`);
  }
  const spaceId = root.space_id;
  const rootNodeToken = root.node_token;

  const maxDepth = options?.maxDepth ?? 6;
  const posts: PostSummary[] = [];
  const nodes: PostSummary[] = [];
  let order = 0;

  async function walk(
    parentToken: string,
    parentTitle: string,
    depth: number,
  ): Promise<NavTreeNode[]> {
    if (depth > maxDepth) return [];
    const children = await listWikiChildren(spaceId, parentToken);
    const treeNodes: NavTreeNode[] = [];

    for (const child of children) {
      // Skip nested bitable index tables named like templates if needed — keep all for now
      const title = await resolveTitle(child, `未命名 ${++order}`);
      const summary = toSummary(child, title, order, parentTitle);
      nodes.push(summary);

      const kind = summary.kind || "doc";
      let childTree: NavTreeNode[] = [];

      if (child.has_child && child.node_token) {
        childTree = await walk(child.node_token, title, depth + 1);
      }

      // docx nodes are articles (even if they have children — body still readable)
      if (isDocxObjType(child.obj_type) || (kind === "doc" && child.obj_token)) {
        // Re-mark as doc post for article list when it's docx
        if (isDocxObjType(child.obj_type) || (!child.obj_type && child.obj_token && !String(child.obj_type).includes("bitable"))) {
          const docSummary: PostSummary = {
            ...summary,
            kind: "doc",
            type: "post",
            documentId: child.obj_token,
            href: `/posts/${summary.slug}`,
          };
          // Avoid listing pure bitable nodes as posts
          const ot = String(child.obj_type || "").toLowerCase();
          if (ot !== "bitable" && ot !== "sheet" && ot !== "mindnote" && ot !== "file") {
            posts.push(docSummary);
          }
        }
      }

      const ot = String(child.obj_type || "").toLowerCase();
      const isArticle = isDocxObjType(child.obj_type);
      treeNodes.push({
        id: summary.id,
        title,
        kind: child.has_child || ot === "bitable" ? "folder" : kind,
        href: isArticle ? `/posts/${summary.slug}` : child.has_child ? `/docs#${summary.id}` : undefined,
        children: childTree,
      });
    }

    return treeNodes;
  }

  const rootTitle = await resolveTitle(root, "站点");
  const tree = await walk(rootNodeToken, rootTitle, 1);

  // Sort posts by date desc (NotionNext-like list)
  posts.sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  return { root, posts, nodes, tree };
}
