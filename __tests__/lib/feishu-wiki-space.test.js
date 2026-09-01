import { parseWikiSpaceId, parseWikiToken } from "@/lib/feishu/wiki";

describe("parseWikiSpaceId and parseWikiToken", () => {
  it("extracts spaceId from /wiki/space/ID URLs", () => {
    expect(parseWikiSpaceId("https://my.feishu.cn/wiki/space/7679086971335019472?from=home")).toBe("7679086971335019472");
    expect(parseWikiSpaceId("7679086971335019472")).toBe("7679086971335019472");
    expect(parseWikiSpaceId("https://my.feishu.cn/wiki/IbfEwLFCri9HFqk6YnjcL5qPneb")).toBeNull();
  });

  it("extracts nodeToken from /wiki/NODE_TOKEN URLs and ignores space URLs", () => {
    expect(parseWikiToken("https://my.feishu.cn/wiki/IbfEwLFCri9HFqk6YnjcL5qPneb")).toBe("IbfEwLFCri9HFqk6YnjcL5qPneb");
    expect(parseWikiToken("https://my.feishu.cn/wiki/space/7679086971335019472")).toBeNull();
    expect(parseWikiToken("7679086971335019472")).toBeNull();
  });
});
