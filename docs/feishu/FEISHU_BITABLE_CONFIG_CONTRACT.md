# 飞书「多维表格配置中心」契约

对照 NotionNext 配置中心：  
https://tanghh.notion.site/8f4fe6b17a9e43e0bcfb6edb50f10a62

飞书表（已写入演示数据）：  
https://test-d2al261ggga5.feishu.cn/wiki/Xk8gw3V1fiBzTukezRAcnylpn63?table=tbl4qPlVgMLg5eaH&view=vewGzGNryD

---

## 1. NotionNext 原逻辑（要模仿的规则）

来源：`lib/db/notion/getNotionConfig.js`

1. 在内容库中有一条 **type = Config** 的页面（配置中心页）。  
2. 页内嵌一张表 **CONFIG-TABLE**，列大致为：  
   - **配置名**（title）  
   - **配置值**（text）  
   - **启用**（checkbox，Yes 才生效）  
   - **备注**（text，可选）  
3. 读表：仅当 `启用 === Yes` 且 `配置名` 非空时，写入 `NOTION_CONFIG[key] = value`。  
4. `配置值` 若是合法 JSON 字符串则 `JSON.parse`，否则当纯字符串。  
5. 特殊键 `INLINE_CONFIG`：解析为对象后 **merge** 进总配置。  
6. **优先级**：Notion 配置表 **>** 环境变量 **>** `blog.config.js` / 主题 CONFIG。

配置中心页本身是「说明 + 表」，**不是**给访客看的博客正文。

---

## 2. 飞书侧落地（本表）

| 项 | 值 |
|---|---|
| Wiki 节点 | `Xk8gw3V1fiBzTukezRAcnylpn63` |
| `app_token` | `JGShbeVp9aGGV3s2J4qcMmGAn0b` |
| `table_id` | `tbl4qPlVgMLg5eaH` |
| `view_id` | `vewGzGNryD` |
| 表名 | CONFIG-TABLE |

### 字段（与 Notion CONFIG-TABLE 对齐）

| 列名 | 类型 | 对应 Notion | 说明 |
|---|---|---|---|
| 配置名 | 文本（主键） | 配置名 / Name | 配置 KEY，如 `TITLE` |
| 配置值 | 文本 | 配置值 / Value | 字符串或 JSON 文本 |
| 启用 | 复选框 | 启用 / Enable | **仅 true 时生效** |
| 备注 | 文本 | 备注 | 给人看的说明，程序可忽略 |



## 2.1 「启用」+「配置值」怎么理解（推荐模型）

**布尔开关（THEME_SWITCH / CAN_COPY / WIDGET_PET…）**

| 启用 | 配置值 | 站点实际效果 |
|---|---|---|
| ✓ 勾选 | `true`（推荐固定写 true） | **开 = true** |
| 不勾选 | `true` | **关 = false**（不会回落 blog 默认 true） |

口诀：

> **配置值写「打开时是什么」——布尔项就写 `true`。**  
> **后边「启用」才是开关：不点就是 false，点了才是 true。**

不要再在配置值里写 `false` 表示「默认关」——那会和「启用」两套开关打架。

**字符串配置（TITLE / LINK / THEME / AUTHOR / KEYWORDS…）**

- `KEYWORDS` 未启用时：与 `TITLE` 类似，回落 **主配置页标题**（`siteBrand.title`），不再只吃 blog.config 默认词。


| 启用 | 配置值 | 效果 |
|---|---|---|
| ✓ | 具体文案 | 使用该文案 |
| 不勾选 | 任意 | **不用这行**，回落 env / blog 默认 |

**实现要点（`loadConfigMap`）：**

1. 飞书未勾选时 API 常**省略**「启用」字段 → 一律当 **未启用**。  
2. 未启用 + 布尔类配置 → 强制写入 `false`（覆盖代码默认 true）。  
3. 已启用 + 布尔配置值为空 → 当作 `true`。

```bash
# 检查/规范化表（可选）
node scripts/fix-config-enable.mjs
```


### 读取伪代码（实现）

```text
records = bitable records/search(table)
config = {}
for row in records:
  key = row.配置名.strip()
  if not key: continue
  enabled = (row.启用 is explicitly true)  # missing ⇒ false
  val = parse(row.配置值)                  # 布尔项推荐恒为 true
  if enabled:
    config[key] = val if val != '' else true   # 布尔空值 → true
  else if val is boolean OR key is feature-flag:
    config[key] = false                        # 未启用 → 关
  # else string/json: ignore row
```

### 已写入的演示键（节选）

启用中的包括：`TITLE` `DESCRIPTION` `AUTHOR` `BIO` `KEYWORDS` `LINK` `LANG` `APPEARANCE` `THEME_SWITCH` `CAN_COPY` `NEXT_REVALIDATE_SECOND` `POST_SHARE_BAR_ENABLE` `SINCE` `WIDGET_PET` `FEISHU_LIST_ROOT` `FEISHU_CONFIG_TABLE` 等。

未启用的（仅占位）：`THEME` `CUSTOM_MENU` `HOME_BANNER_IMAGE` `CONTACT_*` `GLOBAL_CSS/JS` `INLINE_CONFIG` 等。

完整清单见 `docs/samples/feishu-config-table-setup.json`。

---

## 3. 与「文档契约」的分工

| | 文档（Docx/Wiki） | 多维表格 CONFIG-TABLE |
|---|---|---|
| 用途 | **展示内容** | **读配置** |
| 读者 | 访客读文章 | 构建/运行时读 key-value |
| 字段 | 见 `FEISHU_DOCUMENT_CONTRACT.md` | 配置名/值/启用/备注 |
| 是否渲染正文 | 是 | **否**（或仅管理页） |

`FEISHU_LIST_ROOT` 放在配置表里，表示「内容树从哪个 wiki 父节点展开」——仍由文档 API 取数，表只提供配置入口。

---

## 4. 优先级（建议 FeishuNext 与 NotionNext 一致）

```text
多维表格 CONFIG-TABLE（启用=true 的行）
  > 环境变量 .env
  > site.config.ts 默认值
```

当前代码**尚未**自动读这张表进运行时；表结构与样例数据已就绪，下一步是写 `getConfigMapFromBitable()`。

---

## 5. 维护约定

1. **不要改表头列名**（配置名/配置值/启用/备注），除非同步改读取代码。  
2. 新增配置：加一行，KEY 用大写+下划线（与 NotionNext 一致）。  
3. 布尔用 `true`/`false` 字符串或复选框「启用」列。  
4. JSON 配置值必须用英文双引号。  
5. 敏感信息（邮箱等）可放表内但注意权限；生产可用 env 覆盖。

---

## 6. 样本文件

- 写入结果：`docs/samples/feishu-config-table-setup.json`  
- Notion 源码逻辑：`NotionNext/lib/db/notion/getNotionConfig.js`
