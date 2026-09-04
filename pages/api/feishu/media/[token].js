import { downloadMedia } from "@/lib/feishu/media";
import { memoAsync } from "@/lib/feishu/memo";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ error: "method not allowed" });
  }
  const token = req.query.token;
  if (!token || Array.isArray(token)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res.status(400).json({ error: "missing token" });
  }
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(token)) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res.status(400).json({ error: "invalid token format" });
  }
  try {
    const payload = await memoAsync(
      "feishu-media-buf",
      token,
      async () => {
        const upstream = await downloadMedia(token);
        const contentType = upstream.headers.get("content-type") || "application/octet-stream";

        if (contentType.includes("application/json") || contentType.includes("text/html")) {
          throw new Error("upstream returned non-media payload");
        }

        const buf = Buffer.from(await upstream.arrayBuffer());

        if (buf.length === 0) {
          throw new Error("empty media payload");
        }

        return { contentType, buf };
      },
      3600_000
    );

    res.setHeader("Content-Type", payload.contentType);
    res.setHeader("Content-Length", String(payload.buf.length));
    res.setHeader("Cache-Control", "public, max-age=2592000, s-maxage=31536000, immutable");
    if (req.method === "HEAD") {
      return res.status(200).end();
    }
    return res.status(200).send(payload.buf);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    return res.status(502).json({ error: "download failed", message: e?.message });
  }
}
