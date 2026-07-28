import siteConfig from "@/lib/feishu/config";

type TokenCache = {
  token: string;
  expiresAt: number;
};

let cache: TokenCache | null = null;

/** Clear cached tenant token (e.g. after 99991663 invalid-token responses). */
export function clearTenantAccessTokenCache(): void {
  cache = null;
}

/**
 * Tenant access token for Feishu open platform.
 * Cached in-memory for the process lifetime of the serverless/node instance.
 * Refresh 60s before expire to avoid edge races.
 *
 * Official: POST /open-apis/auth/v3/tenant_access_token/internal
 * See docs/STABLE_FEISHU_DATA.md
 */
export async function getTenantAccessToken(): Promise<string> {
  if (cache && cache.expiresAt > Date.now() + 60_000) {
    return cache.token;
  }

  const { appId, appSecret, domain } = siteConfig.feishu;
  if (!appId || !appSecret) {
    throw new Error("Missing FEISHU_APP_ID / FEISHU_APP_SECRET");
  }

  const res = await fetch(`${domain}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ app_id: appId, app_secret: appSecret }),
    cache: "no-store",
  });

  const data = (await res.json()) as {
    code: number;
    msg: string;
    tenant_access_token?: string;
    expire?: number;
  };

  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`Feishu auth failed: ${data.code} ${data.msg}`);
  }

  cache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire || 7200) * 1000,
  };

  return cache.token;
}
