import { getTenantAccessToken } from "./auth";
import siteConfig from "./config";

/** Official: download whiteboard as image (JPEG). */
export async function downloadBoardAsImage(token: string): Promise<Response> {
  const accessToken = await getTenantAccessToken();
  const url = `${siteConfig.feishu.domain}/open-apis/board/v1/whiteboards/${encodeURIComponent(token)}/download_as_image`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  const contentType = (res.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("application/json")) {
    const json = (await res.json().catch(() => ({}))) as { code?: number; msg?: string };
    throw new Error(
      `Board download API error: ${json.code || res.status} ${json.msg || res.statusText} (token=${token})`,
    );
  }
  if (!res.ok) {
    throw new Error(`Board download failed: ${res.status}`);
  }
  return res;
}
