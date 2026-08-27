import type { FeishuBlock, FeishuPageContent, TextRun } from "@/lib/feishu/types";
import { absoluteUrl, plainTextFromRuns } from "@/lib/feishu/text-utils";

export type MarkdownOptions = {
  title?: string;
  assetBase?: string;
};

function resolveUrl(url: string | undefined, assetBase?: string): string {
  if (!url) return "";
  const clean = url.trim().toLowerCase();
  if (clean.startsWith("javascript:") || clean.startsWith("data:") || clean.startsWith("vbscript:")) {
    return "";
  }
  if (!assetBase) return url;
  if (/^https?:\/\//i.test(url)) return url;
  return absoluteUrl(url, assetBase);
}

function runsToMarkdown(runs?: TextRun[], assetBase?: string): string {
  if (!runs?.length) return "";
  return runs
    .map((run) => {
      let text = run.text || "";
      const style = run.style;
      if (!style) return text;
      if (style.inlineCode) {
        text = `\`${text.replace(/`/g, "\\`")}\``;
      } else {
        if (style.bold) text = `**${text}**`;
        if (style.italic) text = `*${text}*`;
        if (style.strikethrough) text = `~~${text}~~`;
      }
      if (style.link) {
        const href = resolveUrl(style.link, assetBase);
        if (href) {
          const label = text || href;
          text = `[${label}](${href})`;
        }
      }
      return text;
    })
    .join("");
}

function childBlocks(
  ids: string[] | undefined,
  blockMap: Record<string, FeishuBlock>,
  opts?: { excludeTableCell?: boolean },
): FeishuBlock[] {
  const out: FeishuBlock[] = [];
  for (const id of ids || []) {
    const block = blockMap[id];
    if (!block) continue;
    if (opts?.excludeTableCell && block.type === "table_cell") continue;
    out.push(block);
  }
  return out;
}

function collapseBlank(text: string): string {
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function cellText(
  cellId: string,
  blockMap: Record<string, FeishuBlock>,
  assetBase?: string,
): string {
  const cell = blockMap[cellId];
  if (!cell) return "";
  const parts = childBlocks(cell.children, blockMap).map((child) => {
    const inline = runsToMarkdown(child.text, assetBase);
    if (inline) return inline;
    return plainTextFromRuns(child.text);
  });
  return parts.join(" ").replace(/\|/g, "\\|").trim();
}

function tableMarkdown(
  block: FeishuBlock,
  blockMap: Record<string, FeishuBlock>,
  assetBase?: string,
): string {
  const rows = block.table?.cells || [];
  if (!rows.length) return "";
  const rendered = rows.map((row) => row.map((id) => cellText(id, blockMap, assetBase)));
  const width = Math.max(...rendered.map((row) => row.length), 1);
  const padded = rendered.map((row) => {
    const next = row.slice();
    while (next.length < width) next.push("");
    return next;
  });
  const header = padded[0] || Array.from({ length: width }, () => "");
  const body = padded.slice(1);
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function previewTable(preview?: { headers?: string[]; rows: string[][] }): string {
  if (!preview?.headers?.length) return "";
  const header = preview.headers;
  const lines = [
    `| ${header.join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...(preview.rows || []).map((row) => `| ${header.map((_, i) => row[i] || "").join(" | ")} |`),
  ];
  return lines.join("\n");
}

function renderChildren(
  blocks: FeishuBlock[],
  blockMap: Record<string, FeishuBlock>,
  indent: number,
  assetBase?: string,
  depth = 0,
): string {
  if (depth > 25) return "";
  const chunks: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const current = blocks[i];
    if (!current) {
      i += 1;
      continue;
    }
    if (current.type === "bullet" || current.type === "ordered") {
      const kind = current.type;
      const group: FeishuBlock[] = [];
      while (i < blocks.length) {
        const item = blocks[i];
        if (!item || item.type !== kind) break;
        group.push(item);
        i += 1;
      }
      group.forEach((item, index) => {
        const marker = kind === "bullet" ? "-" : `${index + 1}.`;
        const prefix = `${"  ".repeat(indent)}${marker} `;
        chunks.push(`${prefix}${runsToMarkdown(item.text, assetBase)}`.trimEnd());
        const nested = childBlocks(item.children, blockMap, { excludeTableCell: true });
        if (nested.length) {
          chunks.push(renderChildren(nested, blockMap, indent + 1, assetBase, depth + 1));
        }
      });
      chunks.push("");
      continue;
    }
    chunks.push(renderBlock(current, blockMap, indent, assetBase, depth));
    i += 1;
  }
  return chunks.filter((chunk) => chunk != null && chunk !== "").join("\n");
}

function renderBlock(
  block: FeishuBlock,
  blockMap: Record<string, FeishuBlock>,
  indent: number,
  assetBase?: string,
  depth = 0,
): string {
  if (depth > 25) return "";
  const children = childBlocks(block.children, blockMap, { excludeTableCell: true });
  const inline = runsToMarkdown(block.text, assetBase);

  switch (block.type) {
    case "page":
      return renderChildren(children, blockMap, indent, assetBase, depth + 1);
    case "heading1":
      return inline ? `# ${inline}\n` : "";
    case "heading2":
      return inline ? `## ${inline}\n` : "";
    case "heading3":
      return inline ? `### ${inline}\n` : "";
    case "heading4":
      return inline ? `#### ${inline}\n` : "";
    case "heading5":
      return inline ? `##### ${inline}\n` : "";
    case "heading6":
      return inline ? `###### ${inline}\n` : "";
    case "paragraph":
      if (!inline && !children.length) return "";
      return [inline, children.length ? renderChildren(children, blockMap, indent, assetBase, depth + 1) : ""]
        .filter(Boolean)
        .join("\n") + "\n";
    case "todo": {
      const box = block.checked ? "- [x]" : "- [ ]";
      const nested = children.length
        ? `\n${renderChildren(children, blockMap, indent + 1, assetBase, depth + 1)}`
        : "";
      return `${"  ".repeat(indent)}${box} ${inline}${nested}\n`;
    }
    case "quote":
    case "quote_container": {
      const body = [inline, children.length ? renderChildren(children, blockMap, 0, assetBase, depth + 1) : ""]
        .filter(Boolean)
        .join("\n");
      if (!body) return "";
      return `${body
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n`;
    }
    case "callout": {
      const emoji = block.callout?.emoji ? `${block.callout.emoji} ` : "";
      const body = [emoji + inline, children.length ? renderChildren(children, blockMap, 0, assetBase, depth + 1) : ""]
        .filter(Boolean)
        .join("\n");
      if (!body) return "";
      return `${body
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n")}\n`;
    }
    case "code": {
      const lang = block.language && block.language !== "plain" ? block.language : "";
      const code = plainTextFromRuns(block.text);
      return `\`\`\`${lang}\n${code}\n\`\`\`\n`;
    }
    case "equation":
      return inline ? `$$\n${plainTextFromRuns(block.text)}\n$$\n` : "";
    case "image": {
      const src = resolveUrl(block.image?.url, assetBase);
      if (!src && !block.image?.token) return "";
      const href = src || resolveUrl(`/api/feishu/media/${block.image?.token}`, assetBase);
      return `![${block.image?.alt || ""}](${href})\n`;
    }
    case "divider":
      return "---\n";
    case "table":
      return `${tableMarkdown(block, blockMap, assetBase)}\n`;
    case "grid":
    case "grid_column":
      return renderChildren(children, blockMap, indent, assetBase, depth + 1);
    case "feishu_embed": {
      const title = block.embed?.title || "嵌入内容";
      const preview = previewTable(block.embed?.preview);
      if (preview) return `*${title}*\n\n${preview}\n`;
      return `*${title}*\n`;
    }
    case "bookmark":
    case "file":
    case "embed": {
      const href = resolveUrl(block.text?.find((run) => run.style?.link)?.style?.link, assetBase);
      const label = plainTextFromRuns(block.text) || href;
      if (!href && !label) return "";
      return href ? `[${label}](${href})\n` : `${label}\n`;
    }
    case "diagram":
      return inline ? `${plainTextFromRuns(block.text)}\n` : "";
    default: {
      if (children.length) return renderChildren(children, blockMap, indent, assetBase);
      if (inline) return `${inline}\n`;
      return "";
    }
  }
}

/**
 * Project FeishuPageContent (same model as HTML) into readable Markdown.
 * Does not call Feishu export APIs. Unreadable embeds stay as a title line.
 */
export function contentToMarkdown(
  content?: FeishuPageContent | null,
  opts: MarkdownOptions = {},
): string {
  if (!content) {
    const title = opts.title?.trim();
    return title ? `# ${title}\n` : "";
  }

  const blockMap =
    content.blockMap && Object.keys(content.blockMap).length
      ? content.blockMap
      : Object.fromEntries((content.blocks || []).map((block) => [block.id, block]));
  const root =
    (content.rootId && blockMap[content.rootId]) ||
    content.blocks.find((block) => block.type === "page") ||
    content.blocks[0];
  const title = (opts.title || content.title || "").trim();
  const parts: string[] = [];
  if (title) parts.push(`# ${title}`, "");

  if (root) {
    if (root.type === "page") {
      parts.push(renderChildren(childBlocks(root.children, blockMap), blockMap, 0, opts.assetBase));
    } else {
      const tops = content.blocks.filter((block) => !block.parentId || !blockMap[block.parentId]);
      parts.push(renderChildren(tops, blockMap, 0, opts.assetBase));
    }
  }

  return `${collapseBlank(parts.join("\n"))}\n`;
}
