import siteConfig from "@/lib/feishu/config";
import { clearTenantAccessTokenCache, getTenantAccessToken } from "./auth";

export type FeishuResponse<T> = {
  code: number;
  msg: string;
  data?: T;
};

/** Common Feishu open-platform codes that mean "try again". */
const RETRYABLE_CODES = new Set([
  99991400, // frequency limit
  99991401,
  99991403,
]);

/** Token invalid / expired — clear cache and retry once. */
const INVALID_TOKEN_CODES = new Set([
  99991663,
  99991664,
  99991668,
  99991661,
]);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function isRetryableHttp(status: number): boolean {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

/**
 * Unified Feishu OpenAPI fetch with Bearer tenant token.
 * - Retries transient HTTP / rate-limit errors with short backoff
 * - On invalid token codes: clear cache and retry the whole call once
 *
 * Stable path only — see docs/STABLE_FEISHU_DATA.md
 */
export async function feishuFetch<T>(
  path: string,
  init: RequestInit = {},
  options?: { maxRetries?: number },
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 3;
  let tokenRetried = false;
  let attempt = 0;

  const url = path.startsWith("http")
    ? path
    : `${siteConfig.feishu.domain}${path.startsWith("/") ? path : `/${path}`}`;
  const method = (init.method || "GET").toUpperCase();

  while (true) {
    attempt += 1;
    const token = await getTenantAccessToken();
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json; charset=utf-8");
    }

    let res: Response;
    try {
      res = await fetch(url, {
        ...init,
        headers,
        next: init.cache === "no-store" ? undefined : { revalidate: siteConfig.revalidateSeconds },
      });
    } catch (err) {
      if (attempt < maxRetries) {
        await sleep(400 * attempt * attempt);
        continue;
      }
      throw new Error(
        `Feishu network error (${method} ${path}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      if (!res.ok) {
        if (isRetryableHttp(res.status) && attempt < maxRetries) {
          await sleep(300 * attempt * attempt);
          continue;
        }
        throw new Error(
          `Feishu request failed: ${res.status} ${res.statusText} (${method} ${path})`,
        );
      }
      // binary path (e.g. media download if ever routed here)
      return res as unknown as T;
    }

    const json = (await res.json()) as FeishuResponse<T>;

    if (json.code === 0) {
      return json.data as T;
    }

    if (INVALID_TOKEN_CODES.has(json.code) && !tokenRetried) {
      clearTenantAccessTokenCache();
      tokenRetried = true;
      continue;
    }

    if (
      (RETRYABLE_CODES.has(json.code) || isRetryableHttp(res.status)) &&
      attempt < maxRetries
    ) {
      // Frequency limits need longer gaps than network blips
      const base = RETRYABLE_CODES.has(json.code) ? 800 : 300;
      await sleep(base * attempt * attempt);
      continue;
    }

    throw new Error(
      `Feishu API error ${json.code}: ${json.msg} (${method} ${path})`,
    );
  }
}
