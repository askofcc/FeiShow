import { getTenantAccessToken } from "./auth";
import siteConfig from "@/lib/feishu/config";

/** Official: download whiteboard as image (JPEG). */
export async function downloadBoardAsImage(token: string): Promise<Response> {
  const accessToken = await getTenantAccessToken();
  const url = `${siteConfig.feishu.domain}/open-apis/board/v1/whiteboards/${encodeURIComponent(token)}/download_as_image`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Board download failed: ${res.status}`);
  }
  return res;
}
