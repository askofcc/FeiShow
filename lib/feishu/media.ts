import siteConfig from "@/lib/feishu/config";
import { clearTenantAccessTokenCache, getTenantAccessToken } from "./auth";

/**
 * Proxy Feishu media download (stable OpenAPI).
 * Official: GET /open-apis/drive/v1/medias/{file_token}/download
 *
 * Rate limits are often the tightest of the whole data path — cache aggressively
 * at the Next route / CDN (see /api/feishu/media/[token]).
 * Do not expose tenant_access_token to the browser.
 *
 * See docs/STABLE_FEISHU_DATA.md §4.5
 */
export async function downloadMedia(fileToken: string): Promise<Response> {
  const url = `${siteConfig.feishu.domain}/open-apis/drive/v1/medias/${encodeURIComponent(fileToken)}/download`;

  const attempt = async (): Promise<Response> => {
    const token = await getTenantAccessToken();
    return fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "force-cache",
      next: { revalidate: 60 * 60 * 24 },
    });
  };

  let res = await attempt();

  // token expired mid-flight — one clean retry
  if (res.status === 401 || res.status === 403) {
    clearTenantAccessTokenCache();
    res = await attempt();
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
