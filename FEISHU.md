# FeishuNext（NotionNext 二开）

本仓库 = [NotionNext](https://github.com/notionnext-org/NotionNext) 前端壳 + 飞书数据层。

## 快速开始

```bash
cd /Users/qiushuanglong/Documents/notionnext-feishu
# 依赖
npx yarn@1.22.22 install
# 配置（已有 .env.local 模板键名见 .env.feishu.example）
cp .env.feishu.example .env.local   # 填 FEISHU_APP_ID/SECRET 等
# 探测飞书
node scripts/feishu-probe.mjs
# 开发
npx yarn@1.22.22 dev -p 3460
```

必填环境变量：

- `CMS_PROVIDER=feishu`
- `FEISHU_APP_ID` / `FEISHU_APP_SECRET`
- `FEISHU_CONTENT_APP_TOKEN` / `FEISHU_CONTENT_TABLE_ID`（内容表 #2）
- `FEISHU_CONFIG_APP_TOKEN` / `FEISHU_CONFIG_TABLE_ID`（配置表 #3）
- `NEXT_PUBLIC_THEME=example`（可切换 simple/gitbook…）

## 架构

```text
themes/* + pages/*   ← 上游 NotionNext（尽量不改）
components/NotionPage → FeishuPage/FeishuRenderer（正文）
lib/site/adapters/feishu ← 内容表 + CONFIG + wiki/docx
lib/feishu/* ← OpenAPI 客户端
```

契约：`docs/feishu/`  
任务清单：`docs/feishu/TASKS.md`

## 旧仓

`/Users/qiushuanglong/Documents/FeishuNext` 仅作历史参考与样本，主工程以本仓库为准。
