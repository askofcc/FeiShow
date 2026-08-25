export type PostStatus = "published" | "draft" | "hidden" | string;
export type PostType = "post" | "page" | "doc" | "menu" | "folder" | string;
/** Feishu-native: only folder (directory) vs document. */
export type NodeKind = "folder" | "doc";

export type TextStyle = {
  bold?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
  inlineCode?: boolean;
  inlineEquation?: boolean;
  link?: string;
  color?: string;
  backgroundColor?: string;
};

export type TextRun = {
  text: string;
  style?: TextStyle;
};

export type FeishuBlockType =
  | "page"
  | "paragraph"
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "bullet"
  | "ordered"
  | "code"
  | "quote"
  | "quote_container"
  | "equation"
  | "todo"
  | "image"
  | "table"
  | "table_cell"
  | "divider"
  | "callout"
  | "bookmark"
  | "file"
  | "embed"
  | "grid"
  | "grid_column"
  | "diagram"
  | "feishu_embed"
  | "unknown";

export type FeishuBlock = {
  id: string;
  type: FeishuBlockType;
  parentId?: string;
  children: string[];
  text?: TextRun[];
  checked?: boolean;
  language?: string;
  image?: {
    token?: string;
    url?: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  table?: {
    rowSize: number;
    columnSize: number;
    cells: string[][];
  };
  callout?: {
    emoji?: string;
    backgroundColor?: string;
  };
  rawType?: number | string;
  embed?: {
    kind: "board" | "sheet" | "bitable" | "wiki" | "addon" | "mindnote" | "chat_card" | "task" | "okr" | "jira" | "agenda" | "unknown";
    token?: string;
    /** sheet: sheetId; bitable: tableId */
    secondaryToken?: string;
    title?: string;
    /** preview matrix for sheet/bitable */
    preview?: { headers?: string[]; rows: string[][] };
  };
};

export type FeishuPageContent = {
  documentId: string;
  title: string;
  blocks: FeishuBlock[];
  blockMap: Record<string, FeishuBlock>;
  rootId?: string;
};

export type PostSummary = {
  id: string;
  /** Route key: prefer wiki node_token (no custom slug). */
  slug: string;
  title: string;
  status: PostStatus;
  type: PostType;
  /** Feishu-native node kind. */
  kind?: NodeKind;
  nodeToken?: string;
  parentNodeToken?: string;
  hasChild?: boolean;
  category?: string;
  tags: string[];
  summary?: string;
  cover?: string;
  date?: string;
  lastEdited?: string;
  documentId?: string;
  order?: number;
  pinned?: boolean;
  href: string;
  /** Permission / password gate from Feishu. */
  accessError?: string;
};

export type NavTreeNode = {
  id: string;
  title: string;
  kind: NodeKind;
  href?: string;
  children: NavTreeNode[];
};

export type Post = PostSummary & {
  content?: FeishuPageContent;
  plainText?: string;
  headings?: Array<{ id: string; text: string; level: number }>;
};

export type SiteInfo = {
  title: string;
  description: string;
  author: string;
  bio: string;
  url: string;
  keywords: string[];
};

export type SiteData = {
  siteInfo: SiteInfo;
  posts: PostSummary[];
  pages: PostSummary[];
  docs: PostSummary[];
  allPages: PostSummary[];
  latestPosts: PostSummary[];
  /** Wiki tree under list root (folders + docs). */
  tree: NavTreeNode[];
  categories: Array<{ name: string; count: number }>;
  tags: Array<{ name: string; count: number }>;
  demo: boolean;
  generatedAt: string;
  /** Data source for debugging. */
  source?: "list-root" | "bitable" | "single-doc" | "demo" | "empty";
};
