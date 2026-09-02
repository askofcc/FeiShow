import siteConfig from "./config";
import { clearTenantAccessTokenCache, getTenantAccessToken } from "./auth";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Proxy Feishu media download (stable OpenAPI).
 * Official: GET /open-apis/drive/v1/medias/{file_token}/download
 *
 * Checks content-type: if Feishu returns JSON, it indicates an error payload
 * (e.g. rate limit, permission denied), which must be thrown rather than served.
 */
export async function downloadMedia(fileToken: string): Promise<Response> {
  const url = `${siteConfig.feishu.domain}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`;

  const attempt = async (): Promise<Response> => {
    const token = await getTenantAccessToken();
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  };

  let res = await attempt();

  // token expired mid-flight — retry once
  if (res.status === 401 || res.status === 403) {
    clearTenantAccessTokenCache();
    res = await attempt();
  }

  // rate limited (429) — retry once after backoff
  if (res.status === 429) {
    await sleep(1000);
    res = await attempt();
  }

  const contentType = (res.headers.get("content-type") || "").toLowerCase();

  // Feishu returns application/json on failure (e.g. 99991400 frequency limit, permission denied)
  if (contentType.includes("application/json")) {
    const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
    throw new Error(
      `Feishu media API error: ${json.code || res.status} ${json.msg || res.statusText} (file_token=${fileToken})`,
    );
  }

  if (!res.ok) {
    const hint = await res.text().catch(() => "");
    const short = hint.replace(/\s+/g, " ").slice(0, 200);
    throw new Error(
      `Media download failed: ${res.status} ${res.statusText}${short ? ` — ${short}` : ""} (file_token=${fileToken})`,
    );
  }

  return res;
}
