import { feishuFetch } from "./client";
import { memoAsync } from "./memo";
import type { FeishuPageContent } from "@/lib/feishu/types";

async function feishuJson(path: string, init?: RequestInit): Promise<any> {
  const body = typeof init?.body === "string" ? init.body : "";
  return memoAsync("embed-meta", `${path}:${body}`, async () => {
    try {
      return await feishuFetch(path, {
        ...init,
        cache: "no-store",
      });
    } catch {
      return null;
    }
  });
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    // Check if elements are rich text segments (e.g. from Feishu Sheet)
    const isRichText = value.some(
      (v) => v && typeof v === "object" && ("type" in v || "link" in v || "texts" in v || "segmentStyle" in v),
    );
    if (isRichText) {
      return value
        .map((v) => {
          if (v == null) return "";
          if (typeof v === "object") {
            const obj = v as { text?: string; link?: string; texts?: Array<{ text?: string }>; name?: string };
            const text = obj.text || (obj.texts ? obj.texts.map((t) => t.text || "").join("") : "") || "";
            if (obj.link) {
              const label = text.trim();
              return label ? `[${label}](${obj.link})` : text;
            }
            return text;
          }
          return String(v);
        })
        .join("");
    }
    return value
      .map((v) => cellText(v))
      .filter(Boolean)
      .join(", ");
  }
  if (typeof value === "object") {
    const o = value as { text?: string; link?: string; texts?: Array<{ text?: string }>; name?: string };
    const text = o.text || (o.texts ? o.texts.map((t) => t.text || "").join("") : "") || "";
    if (o.link) {
      const label = text.trim();
      return label ? `[${label}](${o.link})` : text;
    }
    if (typeof o.name === "string") return o.name;
    return text;
  }
  return "";
}

/** Enrich feishu_embed cards with live titles + small table previews. */
export async function enrichEmbedMetadata(content: FeishuPageContent): Promise<FeishuPageContent> {
  const embeds = content.blocks.filter((b) => b.type === "feishu_embed");
  if (!embeds.length) return content;

  await Promise.all(
    embeds.map(async (block) => {
      if (!block.embed) return;
      try {
        if (block.embed.kind === "bitable" && block.embed.token) {
          const appToken = block.embed.token;
          const tableId = block.embed.secondaryToken;
          const meta = await feishuJson(`/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}`);
          if (meta?.app?.name) block.embed.title = meta.app.name;

          if (tableId) {
            const viewQs = block.embed.viewId
              ? `&view_id=${encodeURIComponent(block.embed.viewId)}`
              : "";
            const [fieldsData, recordsData] = await Promise.all([
              feishuJson(
                `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/fields?page_size=20`,
              ),
              feishuJson(
                `/open-apis/bitable/v1/apps/${encodeURIComponent(appToken)}/tables/${encodeURIComponent(tableId)}/records?page_size=5${viewQs}`,
              ),
            ]);
            const headers = (fieldsData?.items || [])
              .map((f: { field_name?: string }) => f.field_name || "")
              .filter(Boolean)
              .slice(0, 6);
            const rows = (recordsData?.items || []).slice(0, 5).map((rec: { fields?: Record<string, unknown> }) => {
              const fields = rec.fields || {};
              return headers.map((h: string) => cellText(fields[h]));
            });
            if (headers.length) block.embed.preview = { headers, rows };
          }
        } else if (block.embed.kind === "sheet" && block.embed.token) {
          const spreadsheetToken = block.embed.token;
          const sheetId = block.embed.secondaryToken || "Sheet1";
          const meta = await feishuJson(
            `/open-apis/sheets/v3/spreadsheets/${encodeURIComponent(spreadsheetToken)}`,
          );
          if (meta?.spreadsheet?.title) block.embed.title = meta.spreadsheet.title || "电子表格";

          const range = `${sheetId}!A1:F8`;
          const valuesData = await feishuJson(
            `/open-apis/sheets/v2/spreadsheets/${encodeURIComponent(spreadsheetToken)}/values/${encodeURIComponent(range)}`,
          );
          const rawValues: unknown[][] = valuesData?.valueRange?.values || [];
          if (rawValues.length) {
            const formatted = rawValues.map((row) => (row || []).map((c) => cellText(c)));
            // Filter out trailing columns where ALL cells across ALL rows are empty
            let maxCol = 0;
            formatted.forEach((row) => {
              row.forEach((cell, ci) => {
                if (cell && cell.trim()) {
                  maxCol = Math.max(maxCol, ci + 1);
                }
              });
            });
            const trimmed = formatted
              .map((row) => row.slice(0, maxCol))
              .filter((row) => row.some((c) => c && c.trim()));

            if (trimmed.length) {
              if (trimmed.length > 1) {
                block.embed.preview = { headers: trimmed[0], rows: trimmed.slice(1, 6) };
              } else {
                block.embed.preview = { headers: [], rows: trimmed };
              }
            }
          }

        } else if (block.embed.kind === "wiki" && block.embed.token) {
          const wikiToken = block.embed.token;
          const nodeData = await feishuJson(
            `/open-apis/wiki/v2/spaces/get_node?token=${encodeURIComponent(wikiToken)}`,
          );
          const spaceId = nodeData?.node?.space_id;
          const parent = nodeData?.node?.node_token || wikiToken;
          if (nodeData?.node?.title) block.embed.title = `知识库：${nodeData.node.title}`;
          if (spaceId) {
            const nodesData = await feishuJson(
              `/open-apis/wiki/v2/spaces/${encodeURIComponent(spaceId)}/nodes?parent_node_token=${encodeURIComponent(parent)}&page_size=10`,
            );
            const items = nodesData?.items || [];
            if (items.length) {
              const headers = ["子页面", "_token"];
              const rows = items.map((n: { title?: string; node_token?: string }) => [
                n.title || n.node_token || "未命名",
                n.node_token || "",
              ]);
              block.embed.preview = { headers, rows };
            }
          }
        }
      } catch {
        // keep fallback title/card
      }
    }),
  );

  return content;
}
