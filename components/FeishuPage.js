import { useEffect } from "react";
import dynamic from "next/dynamic";
import FeishuRenderer from "@/components/feishu/FeishuRenderer";
import { isBrowser } from "@/lib/utils";
import "katex/dist/katex.min.css";

const PrismMac = dynamic(() => import("@/components/PrismMac"), {
  ssr: false,
});

const AdEmbed = dynamic(
  () => import("@/components/GoogleAdsense").then((m) => m.AdEmbed),
  { ssr: true }
);

const hasCodeBlock = (content) => {
  if (!content?.blocks) return false;
  return content.blocks.some((b) => b.type === "code");
};

/**
 * Drop-in body renderer for Feishu docs (replaces NotionRenderer path).
 * Self-contained image zoom (medium-zoom), anchor auto-scroll, and code highlighting (PrismMac).
 */
export default function FeishuPage({ post, className }) {
  useEffect(() => {
    if (!isBrowser) return;

    // 处理 URL 锚点跳转
    const hash = window?.location?.hash;
    if (hash && hash.length > 1) {
      const target = document.getElementById(hash.substring(1));
      if (target) {
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  }, [post]);

  if (post?.accessError) {
    return (
      <div
        id="notion-article"
        className={`w-full px-4 py-10 text-center text-gray-500 ${className || ""}`}
      >
        <div className="text-lg mb-2 font-medium">无法显示文档</div>
        <div className="text-sm">{post.accessError}</div>
      </div>
    );
  }

  if (!post?.feishuContent) {
    return (
      <div
        id="notion-article"
        className={`w-full px-4 py-8 text-gray-400 text-center ${className || ""}`}
      >
        暂无正文
      </div>
    );
  }

  const hasCode = hasCodeBlock(post.feishuContent);

  return (
    <div id="notion-article" className={`mx-auto ${className || ""}`}>
      <FeishuRenderer content={post.feishuContent} />
      <AdEmbed />
      {hasCode && <PrismMac />}
    </div>
  );
}
