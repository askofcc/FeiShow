# 上游说明

- 上游项目：[NotionNext](https://github.com/notionnext-org/NotionNext)
- 许可证：MIT（保留 LICENSE 与版权声明）
- 本 fork 起始 commit：见 `git log` 中 clone 基线
- remote：
  - `upstream` → https://github.com/notionnext-org/NotionNext.git
- 同步策略：优先 merge `themes/*`、壳层修复；冲突时保护 `lib/feishu` 与 `lib/site/adapters/feishu`
