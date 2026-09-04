import React, { Component, useState, type ReactNode } from "react";
import Link from "next/link";
import { useGlobal } from "@/lib/global";
import { Equation } from "@/components/Equation";
import type { FeishuBlock, FeishuPageContent, TextRun } from "@/lib/feishu/types";
import { plainTextFromRuns } from "@/lib/feishu/text-utils";

const EMOJI_MAP: Record<string, string> = {
  bulb: "💡",
  gift: "🎁",
  warn: "⚠️",
  warning: "⚠️",
  fire: "🔥",
  star: "⭐",
  check: "✅",
  cross: "❌",
  idea: "💡",
  pin: "📌",
  round_pushpin: "📌",
  book: "📖",
  rocket: "🚀",
};

const CALLOUT_BG_MAP: Record<string, string> = {
  "1": "notion-red_background",
  "2": "notion-orange_background",
  "3": "notion-yellow_background",
  "4": "notion-green_background",
  "5": "notion-blue_background",
  "6": "notion-purple_background",
  "7": "notion-gray_background",
  "8": "notion-brown_background",
};

function mapEmoji(id?: string): string {
  if (!id) return "💡";
  if (!/^[a-z0-9_]+$/i.test(id)) return id;
  return EMOJI_MAP[id] || EMOJI_MAP[id.toLowerCase()] || "💡";
}

/** Resolve child blocks without filter(Boolean) (TS does not narrow that). */
function resolveChildBlocks(
  ids: string[] | undefined,
  blockMap: Record<string, FeishuBlock>,
  opts?: { excludeTableCell?: boolean },
): FeishuBlock[] {
  const out: FeishuBlock[] = [];
  for (const id of ids || []) {
    const b = blockMap[id];
    if (!b) continue;
    if (opts?.excludeTableCell && b.type === "table_cell") continue;
    out.push(b);
  }
  return out;
}

function parseVideoEmbed(url?: string): { type: string; src: string } | null {
  if (!url) return null;
  const bMatch = url.match(/bilibili\.com\/video\/(BV[a-zA-Z0-9]+)/i);
  if (bMatch) {
    return {
      type: "bilibili",
      src: `//player.bilibili.com/player.html?bvid=${bMatch[1]}&page=1&high_quality=1&danmaku=0&autoplay=0`,
    };
  }
  const yMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/i);
  if (yMatch) {
    return {
      type: "youtube",
      src: `https://www.youtube.com/embed/${yMatch[1]}`,
    };
  }
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
    return {
      type: "video",
      src: url,
    };
  }
  return null;
}

function BoardPreview({
  imageUrl,
  title,
  subtitle,
}: {
  imageUrl?: string;
  title?: string;
  subtitle?: string;
}) {
  const [hasError, setHasError] = useState(false);
  const displayTitle = title || "画板";

  if (!imageUrl || hasError) {
    return (
      <div className="notion-unsupported-card my-3.5 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-base flex-shrink-0" aria-hidden>🎨</span>
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{displayTitle}</span>
      </div>
    );
  }

  return (
    <figure className="notion-asset-wrapper notion-embed-preview my-4 w-full">
      <div className="flex items-center pb-1.5 text-xs text-gray-500 dark:text-gray-400 font-medium">
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
          <span>🎨</span> <span>{displayTitle}</span>
        </span>
      </div>
      <div className="flex justify-center rounded-lg border border-gray-200/80 dark:border-gray-800 bg-white p-2 shadow-2xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt={displayTitle}
          loading="lazy"
          onError={() => setHasError(true)}
          className="notion-image notion-embed-preview-img max-w-full max-h-[420px] w-auto h-auto rounded-md cursor-zoom-in"
        />
      </div>
      {subtitle ? (
        <figcaption className="notion-asset-caption mt-1.5 text-xs text-gray-400 text-center">
          {subtitle}
        </figcaption>
      ) : null}
    </figure>
  );
}

function ImageWithFallback({
  src,
  alt,
  width,
}: {
  src?: string;
  alt?: string;
  width?: number;
}) {
  const [hasError, setHasError] = useState(false);
  const displayAlt = alt && alt !== "image" ? alt : "图片";

  if (!src || hasError) {
    return (
      <div className="notion-asset-wrapper notion-asset-wrapper-image my-4 p-4 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-lg flex-shrink-0">🖼️</span>
          <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{displayAlt}</span>
        </div>
        <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2.5 py-0.5 rounded flex-shrink-0">
          图片无法展示或加载失败
        </span>
      </div>
    );
  }

  return (
    <figure className="notion-asset-wrapper notion-asset-wrapper-image my-4">
      <div style={{ width: "100%", maxWidth: width || "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="notion-image rounded-md cursor-zoom-in"
          src={src}
          alt={alt || ""}
          loading="lazy"
          onError={() => setHasError(true)}
        />
      </div>
      {alt && alt !== "image" ? (
        <figcaption className="notion-asset-caption mt-1 text-xs text-gray-400">
          {alt}
        </figcaption>
      ) : null}
    </figure>
  );
}

function EmbedCard({
  kind,
  title,
  subtitle,
  imageUrl,
  preview,
}: {
  kind: string;
  title: string;
  subtitle?: string;
  token?: string;
  secondaryToken?: string;
  imageUrl?: string;
  preview?: { headers?: string[]; rows: string[][] };
}) {
  const icon =
    kind === "board"
      ? "🎨"
      : kind === "sheet"
        ? "📊"
        : kind === "bitable"
          ? "🗂"
          : kind === "wiki"
            ? "📚"
            : kind === "mindnote"
              ? "🧠"
              : kind === "addon"
                ? "🧩"
                : kind === "chat_card"
                  ? "💬"
                  : kind === "task"
                    ? "☑️"
                    : kind === "okr"
                      ? "🎯"
                      : kind === "jira"
                        ? "🎫"
                        : kind === "agenda"
                          ? "📅"
                          : kind === "chart"
                            ? "📈"
                            : "📎";

  // 1. Board / Image preview
  if (kind === "board" || imageUrl) {
    return (
      <BoardPreview
        imageUrl={imageUrl}
        title={title}
        subtitle={subtitle}
      />
    );
  }

  // 2. Wiki sub-page tree (Internal article links). No children → render nothing.
  if (kind === "wiki") {
    if (preview?.rows?.length) {
      return (
        <div className="notion-collection-card notion-embed-card my-3.5 w-full p-3.5 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/50 dark:bg-gray-900/30">
          <div className="flex items-center font-medium text-sm text-gray-700 dark:text-gray-200 mb-2.5">
            <div className="flex items-center gap-2">
              <span>📚</span>
              <span>{title || "知识库目录"}</span>
            </div>
          </div>
          <div className="space-y-1 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
            {preview.rows.map((row, ri) => {
              const subTitle = row[0];
              const itemToken = row[1];
              const href = itemToken ? (itemToken.startsWith("/") ? itemToken : `/article/${itemToken}`) : null;
              if (href) {
                return (
                  <Link
                    key={ri}
                    href={href}
                    className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline py-0.5"
                  >
                    <span className="text-xs opacity-60">📄</span>
                    <span className="truncate">{subTitle}</span>
                  </Link>
                );
              }
              return (
                <div key={ri} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 py-0.5">
                  <span className="text-xs opacity-60">📄</span>
                  <span className="truncate">{subTitle}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  }

  // 3. Table / Sheet / Bitable Preview
  if (kind === "sheet" || kind === "bitable") {
    const visibleHeaders = (preview?.headers || []).filter((h) => !h.startsWith("_") && h.trim());
    const rows = preview?.rows || [];
    const columnCount = visibleHeaders.length || Math.max(...rows.map((r) => r.length), 0);

    if (columnCount > 0 && (visibleHeaders.length > 0 || rows.length > 0)) {
      return (
        <div className="notion-embed-preview notion-embed-table-preview my-4 w-full border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden bg-white dark:bg-gray-900 shadow-2xs">
          <div className="notion-embed-preview-label flex items-center px-3.5 py-2 bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2 font-medium">
              <span>{icon}</span>
              <span>{title}</span>
            </div>
          </div>
          <div className="notion-simple-table-wrapper overflow-x-auto">
            <table className="notion-simple-table w-full text-xs">
              {visibleHeaders.length > 0 ? (
                <thead>
                  <tr className="bg-gray-100/70 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    {visibleHeaders.map((h, i) => (
                      <th
                        key={i}
                        className="notion-simple-table-cell px-3.5 py-2.5 text-left font-semibold text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0 whitespace-nowrap"
                      >
                        {renderInlineFormatted(h || "—")}
                      </th>
                    ))}
                  </tr>
                </thead>
              ) : null}
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((row, ri) => (
                  <tr
                    key={ri}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {Array.from({ length: columnCount }, (_, ci) => (
                      <td
                        key={ci}
                        className="notion-simple-table-cell px-3.5 py-2.5 text-gray-700 dark:text-gray-300 border-r border-gray-100 dark:border-gray-800 last:border-r-0"
                      >
                        {renderInlineFormatted(row[ci] || "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    // Table with no rows / no preview: quiet inline placeholder, no external link
    return (
      <div className="notion-unsupported-card my-3.5 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-base flex-shrink-0" aria-hidden>{icon}</span>
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{title}</span>
      </div>
    );
  }

  // 4. Mindnote
  if (kind === "mindnote") {
    return (
      <div className="notion-unsupported-card my-3.5 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
        <span className="text-base flex-shrink-0" aria-hidden>🧠</span>
        <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{title || "思维笔记"}</span>
      </div>
    );
  }

  // 5. Generic Addon / Plugin / OKR / Task / Jira / Agenda / Unknown
  return (
    <div className="notion-unsupported-card my-3.5 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40 flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
      <span className="text-base flex-shrink-0" aria-hidden>{icon}</span>
      <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{title || "飞书嵌入组件"}</span>
    </div>
  );
}

const UNSUPPORTED_LABEL: Record<string, { label: string; kind: string }> = {
  "18": { label: "嵌入多维表格（Bitable）", kind: "bitable" },
  "20": { label: "会话卡片", kind: "chat_card" },
  "21": { label: "流程图 / UML", kind: "diagram" },
  "26": { label: "内嵌网页 / Iframe", kind: "embed" },
  "28": { label: "ISV 应用组件", kind: "addon" },
  "29": { label: "思维笔记（Mindnote）", kind: "mindnote" },
  "30": { label: "电子表格（Sheet）", kind: "sheet" },
  "33": { label: "视图（View）", kind: "view" },
  "35": { label: "任务（Task）", kind: "task" },
  "36": { label: "OKR 目标与关键结果", kind: "okr" },
  "37": { label: "OKR 目标", kind: "okr" },
  "38": { label: "OKR 关键结果", kind: "okr" },
  "39": { label: "OKR 进展", kind: "okr" },
  "40": { label: "文档小组件 / 插件", kind: "addon" },
  "41": { label: "Jira 任务卡片", kind: "jira" },
  "42": { label: "Wiki 目录", kind: "wiki" },
  "43": { label: "画板（Board）", kind: "board" },
  "44": { label: "日程 / 议程", kind: "agenda" },
  "45": { label: "议程项", kind: "agenda" },
  "46": { label: "议程标题", kind: "agenda" },
  "47": { label: "议程内容", kind: "agenda" },
  "48": { label: "链接卡片", kind: "bookmark" },
  "51": { label: "Wiki 子页面列表", kind: "wiki" },
  "53": { label: "多维表格", kind: "bitable" },
  "999": { label: "飞书图表 / 嵌入组件", kind: "chart" },
};

function isSafeUrl(url?: string | null): boolean {
  if (!url) return false;
  const clean = String(url).trim().toLowerCase();
  if (clean.startsWith("javascript:") || clean.startsWith("data:") || clean.startsWith("vbscript:")) {
    return false;
  }
  return true;
}

function renderInlineFormatted(text?: string | null): ReactNode {
  if (!text) return null;
  const str = String(text);
  if (!str.includes("[") && !str.includes("`") && !str.includes("**")) {
    return str;
  }
  const regex = /\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.slice(lastIndex, match.index));
    }
    if (match[1] && match[2]) {
      const label = match[1];
      const href = match[2].trim();
      if (isSafeUrl(href)) {
        parts.push(
          <a
            key={match.index}
            href={href}
            className="notion-link underline text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            target={href.startsWith("http") ? "_blank" : undefined}
            rel={href.startsWith("http") ? "noreferrer" : undefined}
          >
            {label}
          </a>
        );
      } else {
        parts.push(label);
      }
    } else if (match[3]) {
      parts.push(
        <code key={match.index} className="notion-inline-code">
          {match[3]}
        </code>
      );
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="notion-b">
          {match[4]}
        </strong>
      );
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < str.length) {
    parts.push(str.slice(lastIndex));
  }

  return parts.length ? <>{parts}</> : str;
}

function RichText({ runs }: { runs?: TextRun[] }) {
  if (!runs?.length) return null;
  return (
    <>
      {runs.map((run, idx) => {
        let node: ReactNode = run.text;
        const s = run.style;
        if (!s) return <span key={idx}>{renderInlineFormatted(run.text)}</span>;
        if (s.inlineEquation) {
          return (
            <span key={idx} className="notion-equation notion-equation-inline inline-block px-1 align-middle">
              <Equation math={run.text} inline />
            </span>
          );
        }
        if (s.inlineCode) node = <code className="notion-inline-code">{node}</code>;
        if (s.bold) node = <strong className="notion-b">{node}</strong>;
        if (s.italic) node = <em className="notion-i">{node}</em>;
        if (s.underline) node = <span className="notion-u">{node}</span>;
        if (s.strikethrough) node = <span className="notion-s">{node}</span>;
        if (s.link) {
          if (isSafeUrl(s.link)) {
            node = (
              <a className="notion-link" href={s.link} target="_blank" rel="noreferrer">
                {node}
              </a>
            );
          }
        } else if (!s.inlineCode) {
          node = renderInlineFormatted(run.text);
        }
        return <span key={idx}>{node}</span>;
      })}
    </>
  );
}

function ListItemBody({
  block,
  blockMap,
  depth = 0,
}: {
  block: FeishuBlock;
  blockMap: Record<string, FeishuBlock>;
  depth?: number;
}) {
  const children = resolveChildBlocks(block.children, blockMap, { excludeTableCell: true });

  return (
    <li>
      <div className="notion-list-item">
        <span className="notion-list-item-body">
          <RichText runs={block.text ?? []} />
        </span>
      </div>
      {children.length ? (
        <div className="notion-list-item-children">
          <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
        </div>
      ) : null}
    </li>
  );
}

/** Group consecutive bullet/ordered items into single ul/ol (react-notion-x style). */
function BlockChildren({
  blocks,
  blockMap,
  depth = 0,
}: {
  blocks: FeishuBlock[];
  blockMap: Record<string, FeishuBlock>;
  depth?: number;
}) {
  if (depth > 25) return null;
  const out: ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (!b) {
      i += 1;
      continue;
    }
    if (b.type === "bullet") {
      const group: FeishuBlock[] = [];
      while (i < blocks.length) {
        const cur = blocks[i];
        if (!cur || cur.type !== "bullet") break;
        group.push(cur);
        i += 1;
      }
      const first = group[0];
      if (!first) continue;
      out.push(
        <ul key={`ul-${first.id}`} className="notion-list notion-list-disc">
          {group.map((item) => (
            <ListItemBody key={item.id} block={item} blockMap={blockMap} depth={depth} />
          ))}
        </ul>
      );
      continue;
    }
    if (b.type === "ordered") {
      const group: FeishuBlock[] = [];
      while (i < blocks.length) {
        const cur = blocks[i];
        if (!cur || cur.type !== "ordered") break;
        group.push(cur);
        i += 1;
      }
      const first = group[0];
      if (!first) continue;
      out.push(
        <ol key={`ol-${first.id}`} className="notion-list notion-list-numbered" start={1}>
          {group.map((item) => (
            <ListItemBody key={item.id} block={item} blockMap={blockMap} depth={depth} />
          ))}
        </ol>
      );
      continue;
    }
    out.push(
      <BlockErrorBoundary key={b.id} blockId={b.id}>
        <BlockView block={b} blockMap={blockMap} depth={depth} />
      </BlockErrorBoundary>
    );
    i += 1;
  }
  return <>{out}</>;
}

class BlockErrorBoundary extends Component<{ children: ReactNode; blockId?: string }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; blockId?: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  override componentDidCatch(error: Error) {
    console.warn("[FeishuRenderer] Block render error:", error);
  }
  override render() {
    if (this.state.hasError) {
      return (
        <div className="notion-unsupported-card my-2.5 w-full p-3 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 bg-gray-50/40 dark:bg-gray-900/20">
          <span>该内容块渲染异常</span>
          <span className="text-[10px] bg-gray-200/50 dark:bg-gray-800 px-2 py-0.5 rounded">无法展示</span>
        </div>
      );
    }
    return this.props.children;
  }
}

function BlockView({
  block,
  blockMap,
  depth = 0,
}: {
  block: FeishuBlock;
  blockMap: Record<string, FeishuBlock>;
  depth?: number;
}) {
  if (depth > 25) return null;
  const children = resolveChildBlocks(block.children, blockMap, { excludeTableCell: true });

  switch (block.type) {
    case "page":
      return (
        <div className="notion-page-content-inner">
          <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
        </div>
      );

    case "heading1":
      return (
        <h2 id={block.id} data-id={block.id} className="notion-h notion-h1">
          <span className="notion-h-title">
            <RichText runs={block.text ?? []} />
          </span>
        </h2>
      );
    case "heading2":
      return (
        <h3 id={block.id} data-id={block.id} className="notion-h notion-h2">
          <span className="notion-h-title">
            <RichText runs={block.text ?? []} />
          </span>
        </h3>
      );
    case "heading3":
      return (
        <h4 id={block.id} data-id={block.id} className="notion-h notion-h3">
          <span className="notion-h-title">
            <RichText runs={block.text ?? []} />
          </span>
        </h4>
      );
    case "heading4":
    case "heading5":
    case "heading6":
      return (
        <h5 id={block.id} data-id={block.id} className="notion-h notion-h3">
          <span className="notion-h-title">
            <RichText runs={block.text ?? []} />
          </span>
        </h5>
      );

    case "paragraph": {
      const empty = !block.text?.length || !plainTextFromRuns(block.text).trim();
      if (empty && !children.length) return <div className="notion-blank" />;
      return (
        <div className="notion-text">
          <RichText runs={block.text ?? []} />
          {children.length ? (
            <div className="notion-text-children">
              <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
            </div>
          ) : null}
        </div>
      );
    }

    case "bullet":
    case "ordered":
      return (
        <ul className={`notion-list ${block.type === "bullet" ? "notion-list-disc" : "notion-list-numbered"}`}>
          <ListItemBody block={block} blockMap={blockMap} depth={depth} />
        </ul>
      );

    case "todo":
      return (
        <div className={`notion-to-do${block.checked ? " notion-to-do-checked" : ""}`}>
          <div className="notion-to-do-item">
            <div className="notion-property notion-property-checkbox">
              <div className={`notion-property-checkbox-${block.checked ? "checked" : "unchecked"}`}>
                {block.checked ? (
                  <svg viewBox="0 0 14 14" className="notionCheckbox" style={{ width: 16, height: 16 }}>
                    <polygon points="5.5 11.9993304 14 3.49933039 12.5 2 5.5 8.99933039 1.5 4.9968652 0 6.49933039" />
                  </svg>
                ) : (
                  <div
                    style={{
                      width: 16,
                      height: 16,
                      border: "1.5px solid rgba(55,53,47,0.35)",
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            </div>
            <div className="notion-to-do-body">
              <RichText runs={block.text ?? []} />
            </div>
          </div>
          {children.length ? (
            <div className="notion-to-do-children">
              <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
            </div>
          ) : null}
        </div>
      );

    case "quote":
    case "quote_container":
      return (
        <blockquote className="notion-quote">
          {block.text?.length ? (
            <div>
              <RichText runs={block.text ?? []} />
            </div>
          ) : null}
          {children.length ? <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} /> : null}
        </blockquote>
      );

    case "callout": {
      const bgClass = (block.callout?.backgroundColor && CALLOUT_BG_MAP[block.callout.backgroundColor]) || "notion-gray_background";
      return (
        <div className={`notion-callout ${bgClass}`}>
          <div className="notion-page-icon-inline notion-page-icon-span">
            <span className="notion-page-icon" role="img" aria-label="callout">
              {mapEmoji(block.callout?.emoji)}
            </span>
          </div>
          <div className="notion-callout-text">
            {block.text?.length ? <RichText runs={block.text ?? []} /> : null}
            {children.length ? <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} /> : null}
          </div>
        </div>
      );
    }

    case "code": {
      const rawLang = (block.language || "plaintext").toLowerCase().trim();
      const lang = rawLang === "plain" ? "plaintext" : rawLang || "plaintext";
      const codeString = plainTextFromRuns(block.text);
      return (
        <div className="notion-code-wrapper my-3 w-full max-w-full min-w-0 overflow-hidden">
          <pre className={`notion-code language-${lang}`}>
            <code className={`language-${lang}`}>
              {codeString}
            </code>
          </pre>
        </div>
      );
    }

    case "equation": {
      const math = plainTextFromRuns(block.text);
      return (
        <div className="notion-equation notion-equation-block py-2 my-2 overflow-x-auto text-center">
          <Equation math={math} />
        </div>
      );
    }

    case "image": {
      const src = block.image?.url || (block.image?.token ? `/api/feishu/media/${block.image.token}` : undefined);
      return <ImageWithFallback src={src} alt={block.image?.alt} width={block.image?.width} />;
    }

    case "divider":
      return <hr className="notion-hr my-6" />;

    case "table": {
      const matrix = block.table?.cells || [];
      if (!matrix.length) {
        return (
          <div className="notion-unsupported-card my-3.5 w-full p-3.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>📑</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">表格</span>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2.5 py-0.5 rounded">
              暂无表格内容
            </span>
          </div>
        );
      }
      return (
        <div className="notion-simple-table-wrapper my-4 overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl shadow-2xs">
          <table className="notion-simple-table w-full text-sm">
            <tbody>
              {matrix.map((row, ri) => (
                <tr
                  key={ri}
                  className={
                    ri === 0
                      ? "notion-simple-table-header-row font-semibold bg-gray-100/80 dark:bg-gray-800/80 text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700"
                      : "border-b border-gray-100 dark:border-gray-800 last:border-b-0 hover:bg-gray-50/40 dark:hover:bg-gray-800/20 transition-colors"
                  }
                >
                  {row.map((cellId, ci) => {
                    const cell = blockMap[cellId];
                    const Tag = ri === 0 ? "th" : "td";
                    return (
                      <Tag
                        key={ci}
                        className={`notion-simple-table-cell px-3.5 py-2.5 border-r border-gray-200 dark:border-gray-800 last:border-r-0 text-left align-top ${
                          ri === 0 ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {cell
                          ? cell.children?.length
                            ? cell.children.map((cid) => {
                                const child = blockMap[cid];
                                return child ? (
                                  <BlockView key={cid} block={child} blockMap={blockMap} depth={depth + 1} />
                                ) : null;
                              })
                            : cell.text?.length
                              ? <RichText runs={cell.text} />
                              : null
                          : null}
                      </Tag>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case "grid": {
      const cols = children.filter((c) => c.type === "grid_column");
      const hasContent = cols.some((col) => {
        const colChildren = resolveChildBlocks(col.children, blockMap);
        return colChildren.length > 0;
      });
      if (!hasContent) return null;

      const ratioSum = cols.reduce((s, c) => s + (c.widthRatio || 0), 0);
      const useRatio = ratioSum > 0;
      const fallback = cols.length || 1;
      return (
        <div className="notion-row my-4">
          {cols.map((col, idx) => {
            const pct = useRatio
              ? ((col.widthRatio || 0) / ratioSum) * 100
              : 100 / fallback;
            return (
            <div
              key={col.id}
              className="notion-column"
              style={{ width: `${pct}%`, flexGrow: 0, flexShrink: 1 }}
            >
              <BlockChildren
                blocks={resolveChildBlocks(col.children, blockMap)}
                blockMap={blockMap}
                depth={depth + 1}
              />
              {idx < cols.length - 1 ? <div className="notion-spacer" /> : null}
            </div>
            );
          })}
        </div>
      );
    }

    case "grid_column":
      return (
        <div className="notion-column" style={{ width: "100%" }}>
          <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
        </div>
      );

    case "feishu_embed": {
      const kind = block.embed?.kind || "unknown";
      const title = block.embed?.title || "嵌入内容";
      const token = block.embed?.token;
      const secondaryToken = block.embed?.secondaryToken;
      const imageUrl = kind === "board" && token ? `/api/feishu/board/${token}` : undefined;
      const preview = block.embed?.preview;
      return (
        <EmbedCard
          kind={kind}
          title={title}
          token={token}
          secondaryToken={secondaryToken}
          {...(imageUrl ? { imageUrl } : {})}
          {...(preview ? { preview } : {})}
        />
      );
    }

    case "diagram": {
      const text = plainTextFromRuns(block.text);
      if (!text) {
        return (
          <div className="notion-unsupported-card my-3.5 w-full p-3.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0" aria-hidden>📊</span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-gray-800 dark:text-gray-200 truncate">流程图 / UML</div>
                <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">该图表暂不支持在网页中直接渲染</div>
              </div>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2.5 py-0.5 rounded flex-shrink-0">
              无法展示
            </span>
          </div>
        );
      }
      return (
        <div className="notion-unsupported my-3 p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300">
          <div className="flex items-center gap-2 font-medium text-gray-800 dark:text-gray-200 mb-1.5">
            <span>📊</span>
            <span>流程图 / UML</span>
          </div>
          <div className="whitespace-pre-wrap font-mono text-xs opacity-90">{text}</div>
        </div>
      );
    }

    case "bookmark":
    case "file":
    case "embed": {
      const rawHref = block.text?.find((r) => r.style?.link)?.style?.link;
      const href = isSafeUrl(rawHref) ? rawHref! : "#";
      const text = plainTextFromRuns(block.text) || (href !== "#" ? href : "");

      // Video embed (Bilibili / YouTube / MP4 video)
      const videoEmbed = parseVideoEmbed(href !== "#" ? href : undefined);
      if (videoEmbed) {
        if (videoEmbed.type === "video") {
          return (
            <div className="notion-video-wrapper my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black shadow-xs">
              <video
                src={videoEmbed.src}
                controls
                className="w-full max-h-[500px]"
                preload="metadata"
              />
              {text && text !== href && (
                <div className="px-3.5 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800">
                  {text}
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="notion-video-wrapper my-4 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-black/5 shadow-xs">
            <div className="relative w-full aspect-video">
              <iframe
                src={videoEmbed.src}
                className="absolute inset-0 w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
              />
            </div>
            {text && text !== href && (
              <div className="px-3.5 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/60 border-t border-gray-200 dark:border-gray-800">
                {text}
              </div>
            )}
          </div>
        );
      }

      // File attachment: single clean download card (whole card is the action)
      if (block.type === "file") {
        const hasValidLink = href && href !== "#";
        if (hasValidLink) {
          const ext = (() => {
            const m = /\.([a-zA-Z0-9]{1,8})(?:\?|$)/.exec(text || "");
            return m?.[1]?.toUpperCase() || "";
          })();
          return (
            <a
              className="notion-file-card my-3 flex w-full items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/60 dark:bg-gray-900/40 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group shadow-2xs"
              href={href}
              target="_blank"
              rel="noreferrer"
              download
            >
              <div className="text-xl text-blue-600/80 dark:text-blue-400/80 flex-shrink-0" aria-hidden>
                📄
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                  {text}
                </div>
              </div>
              {ext ? (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500 dark:text-gray-400 bg-gray-200/70 dark:bg-gray-800 rounded flex-shrink-0">
                  {ext}
                </span>
              ) : null}
            </a>
          );
        }

        // File without download token/link
        return (
          <div className="notion-file-card my-3 flex w-full items-center justify-between p-3.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="text-lg flex-shrink-0" aria-hidden>📄</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate">{text || "附件"}</span>
            </div>
            <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2.5 py-0.5 rounded flex-shrink-0">
              附件暂不可下载
            </span>
          </div>
        );
      }

      // Bookmark / Generic embed
      if (href && href !== "#") {
        return (
          <a
            className="notion-bookmark my-3.5 flex items-center justify-between p-3.5 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100/60 dark:hover:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors group shadow-2xs"
            href={href}
            target="_blank"
            rel="noreferrer"
          >
            <div className="notion-bookmark-info min-w-0 flex-1 pr-3">
              <div className="notion-bookmark-title text-sm font-medium text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                {text}
              </div>
              <div className="notion-bookmark-link mt-1 text-xs text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                <span>🔗</span>
                <span className="truncate">{href}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 group-hover:text-blue-500 flex-shrink-0">↗</div>
          </a>
        );
      }

      // Missing embed / bookmark link
      return (
        <div className="notion-unsupported-card my-3.5 w-full p-3.5 border border-dashed border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50/60 dark:bg-gray-900/40 flex items-center justify-between gap-3 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="text-lg flex-shrink-0" aria-hidden>🔗</span>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-800 dark:text-gray-200 truncate">{text || "嵌入链接"}</div>
              <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">链接地址未配置或无效</div>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 dark:text-gray-500 bg-gray-200/60 dark:bg-gray-800 px-2.5 py-0.5 rounded flex-shrink-0">
            无法展示
          </span>
        </div>
      );
    }

    default: {
      if (children.length) {
        return (
          <div className="w-full">
            <BlockChildren blocks={children} blockMap={blockMap} depth={depth + 1} />
          </div>
        );
      }
      if (block.text?.length) {
        return (
          <div className="notion-text">
            <RichText runs={block.text ?? []} />
          </div>
        );
      }
      const rt = block.rawType != null ? String(block.rawType) : "999";
      const meta = UNSUPPORTED_LABEL[rt] || { label: "飞书嵌入组件", kind: "unknown" };
      return (
        <EmbedCard
          kind={meta.kind}
          title={meta.label}
          subtitle="该嵌入内容暂不支持在网页中直接展示"
        />
      );
    }
  }
}

export default function FeishuRenderer({ content }: { content?: FeishuPageContent }) {
  // Hooks must be called unconditionally at top level (Rules of Hooks)
  let isDarkMode = false;
  try {
    const globalContext = useGlobal?.() as { isDarkMode?: boolean } | null | undefined;
    isDarkMode = Boolean(globalContext?.isDarkMode);
  } catch {
    // fallback for environments outside GlobalContextProvider
  }

  if (!content) {
    return <div className="notion-text py-4 text-gray-400">暂无正文内容。</div>;
  }

  const root =
    (content.rootId && content.blockMap[content.rootId]) ||
    content.blocks.find((b) => b.type === "page") ||
    content.blocks[0];

  if (!root) return <div className="notion-text py-4 text-gray-400">文档块为空。</div>;

  return (
    <div className={`notion ${isDarkMode ? "dark-mode" : "light-mode"}`}>
      <div className="notion-page">
        <div className="notion-page-content">
          {root.type === "page" ? (
            <BlockView block={root} blockMap={content.blockMap} />
          ) : (
            <div className="notion-page-content-inner">
              <BlockChildren
                blocks={content.blocks.filter((b) => !b.parentId || !content.blockMap[b.parentId])}
                blockMap={content.blockMap}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
