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
  book: "📖",
  rocket: "🚀",
};

function mapEmoji(id?: string): string {
  if (!id) return "💡";
  if (!/^[a-z0-9_]+$/i.test(id)) return id;
  return EMOJI_MAP[id] || EMOJI_MAP[id.toLowerCase()] || "💡";
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
  imageUrl?: string;
  preview?: { headers?: string[]; rows: string[][] };
}) {
  const icon =
    kind === "board"
      ? "🗺"
      : kind === "sheet"
        ? "📊"
        : kind === "bitable"
          ? "🗂"
          : kind === "wiki"
            ? "📚"
            : kind === "addon"
              ? "🧩"
              : "📎";
  if (imageUrl) {
    return (
      <figure className="notion-asset-wrapper notion-embed-preview">
        <div className="notion-embed-preview-label">
          <span>{icon}</span> {title}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt={title} loading="lazy" className="notion-embed-preview-img" />
        {subtitle ? <figcaption className="notion-asset-caption">{subtitle}</figcaption> : null}
      </figure>
    );
  }
  if (preview?.headers?.length) {
    return (
      <div className="notion-embed-preview notion-embed-table-preview">
        <div className="notion-embed-preview-label">
          <span>{icon}</span> {title}
        </div>
        <div className="notion-simple-table-wrapper">
          <table className="notion-simple-table">
            <thead>
              <tr>
                {preview.headers.map((h, i) => (
                  <th key={i} className="notion-simple-table-cell">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(preview.rows || []).map((row, ri) => (
                <tr key={ri}>
                  {preview.headers!.map((_, ci) => (
                    <td key={ci} className="notion-simple-table-cell">
                      {row[ci] || ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {subtitle ? <div className="notion-embed-card-sub px-3 py-2">{subtitle}</div> : null}
      </div>
    );
  }
  return (
    <div className="notion-collection-card notion-embed-card">
      <div className="notion-embed-card-icon" aria-hidden>
        {icon}
      </div>
      <div className="notion-embed-card-body">
        <div className="notion-embed-card-title">{title}</div>
        {subtitle ? <div className="notion-embed-card-sub">{subtitle}</div> : null}
      </div>
    </div>
  );
}

const UNSUPPORTED_LABEL: Record<string, string> = {
  "18": "嵌入多维表格（Bitable）",
  "20": "会话卡片",
  "29": "思维笔记",
  "30": "电子表格（Sheet）",
  "33": "视图（View）",
  "40": "文档小组件 / 目录",
  "43": "画板（Board）",
  "51": "Wiki 子目录",
  "999": "嵌入内容",
};

function RichText({ runs }: { runs?: TextRun[] }) {
  if (!runs?.length) return null;
  return (
    <>
      {runs.map((run, idx) => {
        let node: React.ReactNode = run.text;
        const s = run.style;
        if (!s) return <span key={idx}>{node}</span>;
        if (s.inlineCode) node = <code className="notion-inline-code">{node}</code>;
        if (s.bold) node = <strong className="notion-b">{node}</strong>;
        if (s.italic) node = <em className="notion-i">{node}</em>;
        if (s.underline) node = <span className="notion-u">{node}</span>;
        if (s.strikethrough) node = <span className="notion-s">{node}</span>;
        if (s.link) {
          node = (
            <a className="notion-link" href={s.link} target="_blank" rel="noreferrer">
              {node}
            </a>
          );
        }
        return <span key={idx}>{node}</span>;
      })}
    </>
  );
}

function ListItemBody({
  block,
  blockMap,
}: {
  block: FeishuBlock;
  blockMap: Record<string, FeishuBlock>;
}) {
  const children = (block.children || [])
    .map((id) => blockMap[id])
    .filter(Boolean)
    .filter((b) => b.type !== "table_cell");

  return (
    <li>
      <div className="notion-list-item">
        <span className="notion-list-item-body">
          <RichText runs={block.text} />
        </span>
      </div>
      {children.length ? (
        <div className="notion-list-item-children">
          <BlockChildren blocks={children} blockMap={blockMap} />
        </div>
      ) : null}
    </li>
  );
}

/** Group consecutive bullet/ordered items into single ul/ol (react-notion-x style). */
function BlockChildren({
  blocks,
  blockMap,
}: {
  blocks: FeishuBlock[];
  blockMap: Record<string, FeishuBlock>;
}) {
  const out: React.ReactNode[] = [];
  let i = 0;
  while (i < blocks.length) {
    const b = blocks[i];
    if (b.type === "bullet") {
      const group: FeishuBlock[] = [];
      while (i < blocks.length && blocks[i].type === "bullet") {
        group.push(blocks[i]);
        i += 1;
      }
      out.push(
        <ul key={`ul-${group[0].id}`} className="notion-list notion-list-disc">
          {group.map((item) => (
            <ListItemBody key={item.id} block={item} blockMap={blockMap} />
          ))}
        </ul>
      );
      continue;
    }
    if (b.type === "ordered") {
      const group: FeishuBlock[] = [];
      while (i < blocks.length && blocks[i].type === "ordered") {
        group.push(blocks[i]);
        i += 1;
      }
      out.push(
        <ol key={`ol-${group[0].id}`} className="notion-list notion-list-numbered" start={1}>
          {group.map((item) => (
            <ListItemBody key={item.id} block={item} blockMap={blockMap} />
          ))}
        </ol>
      );
      continue;
    }
    out.push(<BlockView key={b.id} block={b} blockMap={blockMap} />);
    i += 1;
  }
  return <>{out}</>;
}

function BlockView({
  block,
  blockMap,
}: {
  block: FeishuBlock;
  blockMap: Record<string, FeishuBlock>;
}) {
  const children = (block.children || [])
    .map((id) => blockMap[id])
    .filter(Boolean)
    .filter((b) => b.type !== "table_cell");

  switch (block.type) {
    case "page":
      return (
        <div className="notion-page-content-inner">
          <BlockChildren blocks={children} blockMap={blockMap} />
        </div>
      );

    case "heading1":
      return (
        <h2 id={block.id} data-id={block.id} className="notion-h notion-h1">
          <span className="notion-h-title">
            <RichText runs={block.text} />
          </span>
        </h2>
      );
    case "heading2":
      return (
        <h3 id={block.id} data-id={block.id} className="notion-h notion-h2">
          <span className="notion-h-title">
            <RichText runs={block.text} />
          </span>
        </h3>
      );
    case "heading3":
      return (
        <h4 id={block.id} data-id={block.id} className="notion-h notion-h3">
          <span className="notion-h-title">
            <RichText runs={block.text} />
          </span>
        </h4>
      );
    case "heading4":
    case "heading5":
    case "heading6":
      return (
        <h5 id={block.id} data-id={block.id} className="notion-h notion-h3">
          <span className="notion-h-title">
            <RichText runs={block.text} />
          </span>
        </h5>
      );

    case "paragraph": {
      const empty = !block.text?.length || !plainTextFromRuns(block.text).trim();
      if (empty && !children.length) return <div className="notion-blank" />;
      return (
        <div className="notion-text">
          <RichText runs={block.text} />
          {children.length ? (
            <div className="notion-text-children">
              <BlockChildren blocks={children} blockMap={blockMap} />
            </div>
          ) : null}
        </div>
      );
    }

    case "bullet":
    case "ordered":
      // Should be handled by BlockChildren grouping; fallback single item.
      return (
        <ul className={`notion-list ${block.type === "bullet" ? "notion-list-disc" : "notion-list-numbered"}`}>
          <ListItemBody block={block} blockMap={blockMap} />
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
              <RichText runs={block.text} />
            </div>
          </div>
          {children.length ? (
            <div className="notion-to-do-children">
              <BlockChildren blocks={children} blockMap={blockMap} />
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
              <RichText runs={block.text} />
            </div>
          ) : null}
          {children.length ? <BlockChildren blocks={children} blockMap={blockMap} /> : null}
        </blockquote>
      );

    case "callout":
      return (
        <div className="notion-callout notion-gray_background">
          <div className="notion-page-icon-inline notion-page-icon-span">
            <span className="notion-page-icon" role="img" aria-label="callout">
              {mapEmoji(block.callout?.emoji)}
            </span>
          </div>
          <div className="notion-callout-text">
            {block.text?.length ? <RichText runs={block.text} /> : null}
            {children.length ? <BlockChildren blocks={children} blockMap={blockMap} /> : null}
          </div>
        </div>
      );

    case "code": {
      const lang = block.language && block.language !== "plain" ? block.language : "";
      return (
        <div className="notion-code-wrapper">
          {lang ? <div className="notion-code-lang">{lang}</div> : null}
          <pre className="notion-code">
            <code className={lang ? `language-${lang}` : undefined}>
              <RichText runs={block.text} />
            </code>
          </pre>
        </div>
      );
    }

    case "equation":
      return (
        <div className="notion-equation notion-equation-block">
          <code>
            <RichText runs={block.text} />
          </code>
        </div>
      );

    case "image":
      if (!block.image?.url && !block.image?.token) return null;
      return (
        <figure className="notion-asset-wrapper notion-asset-wrapper-image">
          <div style={{ width: "100%", maxWidth: block.image.width || "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="notion-image"
              src={block.image.url || `/api/feishu/media/${block.image.token}`}
              alt={block.image.alt || ""}
              loading="lazy"
            />
          </div>
          {block.image.alt ? <figcaption className="notion-asset-caption">{block.image.alt}</figcaption> : null}
        </figure>
      );

    case "divider":
      return <hr className="notion-hr" />;

    case "table":
      return (
        <div className="notion-simple-table-wrapper">
          <table className="notion-simple-table">
            <tbody>
              {(block.table?.cells || []).map((row, ri) => (
                <tr key={ri} className={ri === 0 ? "notion-simple-table-header-row" : undefined}>
                  {row.map((cellId, ci) => {
                    const cell = blockMap[cellId];
                    const Tag = ri === 0 ? "th" : "td";
                    return (
                      <Tag key={ci} className="notion-simple-table-cell">
                        {cell
                          ? cell.children.map((cid) => {
                              const child = blockMap[cid];
                              return child ? (
                                <BlockView key={cid} block={child} blockMap={blockMap} />
                              ) : null;
                            })
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

    case "grid": {
      const cols = children.filter((c) => c.type === "grid_column");
      const total = cols.length || 1;
      return (
        <div className="notion-row">
          {cols.map((col, idx) => (
            <div
              key={col.id}
              className="notion-column"
              style={{ width: `${100 / total}%`, flexGrow: 1, flexShrink: 1 }}
            >
              <BlockChildren
                blocks={(col.children || []).map((id) => blockMap[id]).filter(Boolean)}
                blockMap={blockMap}
              />
              {idx < cols.length - 1 ? <div className="notion-spacer" /> : null}
            </div>
          ))}
        </div>
      );
    }

    case "grid_column":
      return (
        <div className="notion-column" style={{ width: "100%" }}>
          <BlockChildren blocks={children} blockMap={blockMap} />
        </div>
      );

    case "feishu_embed": {
      const kind = block.embed?.kind || "unknown";
      const title = block.embed?.title || "飞书嵌入内容";
      const token = block.embed?.token;
      const imageUrl = kind === "board" && token ? `/api/feishu/board/${token}` : undefined;
      const preview = block.embed?.preview;
      return (
        <EmbedCard
          kind={kind}
          title={title}
          subtitle={
            imageUrl
              ? "画板预览（官方 export image）"
              : preview
                ? "数据预览"
                : token
                  ? "飞书嵌入块 · 阅读态预览"
                  : "飞书嵌入块 · 阅读态预览"
          }
          imageUrl={imageUrl}
          preview={preview}
        />
      );
    }

    case "diagram": {
      const text = plainTextFromRuns(block.text);
      return (
        <div className="notion-unsupported">
          流程图 / UML
          {text ? <div className="mt-1 whitespace-pre-wrap text-sm opacity-80">{text}</div> : null}
        </div>
      );
    }

    case "bookmark":
    case "file":
    case "embed": {
      const href = block.text?.find((r) => r.style?.link)?.style?.link || "#";
      const text = plainTextFromRuns(block.text) || href;
      const kind = block.type === "file" ? "附件" : block.type === "embed" ? "嵌入" : "书签";
      return (
        <a className="notion-bookmark" href={href} target="_blank" rel="noreferrer">
          <div className="notion-bookmark-info">
            <div className="notion-bookmark-title">
              {kind}: {text}
            </div>
            {href !== "#" ? (
              <div className="notion-bookmark-link">
                <div className="notion-bookmark-link-text">{href}</div>
              </div>
            ) : null}
          </div>
        </a>
      );
    }

    default:
      if (children.length) {
        return (
          <div>
            <BlockChildren blocks={children} blockMap={blockMap} />
          </div>
        );
      }
      if (block.text?.length) {
        return (
          <div className="notion-text">
            <RichText runs={block.text} />
          </div>
        );
      }
      if (block.rawType != null) {
        const rt = String(block.rawType);
        const label = UNSUPPORTED_LABEL[rt] || "嵌入内容";
        const kind =
          rt === "43"
            ? "board"
            : rt === "30"
              ? "sheet"
              : rt === "18"
                ? "bitable"
                : rt === "51"
                  ? "wiki"
                  : rt === "40"
                    ? "addon"
                    : "file";
        return <EmbedCard kind={kind} title={label} subtitle="飞书嵌入块 · 阅读态预览" />;
      }
      return null;
  }
}

export default function FeishuRenderer({ content }: { content?: FeishuPageContent }) {
  if (!content) {
    return <div className="notion-text">暂无正文。</div>;
  }

  const root =
    (content.rootId && content.blockMap[content.rootId]) ||
    content.blocks.find((b) => b.type === "page") ||
    content.blocks[0];

  if (!root) return <div className="notion-text">文档块为空。</div>;

  return (
    <div className="notion light-mode">
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
