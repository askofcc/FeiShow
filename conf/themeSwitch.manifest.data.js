/**
 * Build-time source data for the theme switch console.
 * The active-theme resolver extracts one row; application code must not import this file.
 */

export const THEME_SWITCH_MANIFEST = {
  gitbook: {
    name: 'GitBook',
    summary: '文档与手册式侧栏目录结构。',
    palette: [
      { key: 'GITBOOK_COLOR_PRIMARY', cssVar: '--gitbook-color-primary', label: '主色', defaultValue: '#16a34a' }
    ]
  },
  simple: {
    name: 'Simple',
    summary: '极简清爽，适合文字为主的博客。',
    palette: [
      { key: 'SIMPLE_COLOR_PRIMARY', cssVar: '--simple-color-primary', label: '主色', defaultValue: '#dd3333' },
      { key: 'SIMPLE_COLOR_TITLE', cssVar: '--simple-color-title', label: '标题色', defaultValue: '#276077' }
    ]
  },
  fuwari: {
    name: 'Fuwari',
    summary: '日系轻量双栏与主题色板。',
    palette: [
      { key: 'FUWARI_THEME_COLOR_HUE', cssVar: '--fuwari-primary', label: '主色色相', defaultValue: '#b8a320' }
    ]
  },
  heo: {
    name: 'Heo',
    summary: '致敬张洪Heo,丰富的 模块化组件。',
    palette: [
      { key: 'HEO_COLOR_PRIMARY', cssVar: '--heo-color-primary', label: '主色', defaultValue: '#4f65f0' },
      { key: 'HEO_COLOR_PRIMARY_HOVER', cssVar: '--heo-color-primary-hover', label: '主色 hover', defaultValue: '#4f46e5' },
      { key: 'HEO_COLOR_PRIMARY_TEXT', cssVar: '--heo-color-primary-text', label: '主色文字', defaultValue: '#ffffff' },
      { key: 'HEO_COLOR_ACCENT', cssVar: '--heo-color-accent', label: '强调色', defaultValue: '#ca8a04' },
      { key: 'HEO_COLOR_BG', cssVar: '--heo-color-bg', label: '页面背景', defaultValue: '#f7f9fe' },
      { key: 'HEO_COLOR_CARD', cssVar: '--heo-color-card', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'HEO_COLOR_CARD_MUTED', cssVar: '--heo-color-card-muted', label: '弱背景', defaultValue: '#f1f3f8' },
      { key: 'HEO_COLOR_BORDER', cssVar: '--heo-color-border', label: '边框', defaultValue: '#4f46e5' },
      { key: 'HEO_COLOR_TEXT', cssVar: '--heo-color-text-light', label: '主文字', defaultValue: '#000000' },
      { key: 'HEO_COLOR_TEXT_SECONDARY', cssVar: '--heo-color-text-secondary-light', label: '次级文字', defaultValue: '#4b5563' },
      { key: 'HEO_COLOR_BG_DARK', cssVar: '--heo-color-bg-dark', label: '深色模式：页面背景', defaultValue: '#18171d' },
      { key: 'HEO_COLOR_CARD_DARK', cssVar: '--heo-color-card-dark', label: '深色模式：卡片背景', defaultValue: '#1e1e1e' },
      { key: 'HEO_COLOR_BORDER_DARK', cssVar: '--heo-color-border-dark', label: '深色模式：强调边框', defaultValue: '#ca8a04' },
      { key: 'HEO_COLOR_TEXT_DARK', cssVar: '--heo-color-text-dark', label: '深色模式：主文字', defaultValue: '#f3f4f6' },
      { key: 'HEO_COLOR_TEXT_SECONDARY_DARK', cssVar: '--heo-color-text-secondary-dark', label: '深色模式：次级文字', defaultValue: '#d1d5db' }
    ]
  },
  medium: {
    name: 'Medium',
    summary: 'Medium 风格阅读体验与排版。',
    palette: [
      { key: 'MEDIUM_COLOR_PRIMARY', cssVar: '--medium-color-primary', label: '主色', defaultValue: '#4f46e5' }
    ]
  },
  hexo: {
    name: 'Hexo',
    summary: '类 Hexo 经典博客结构与侧边栏。',
    palette: [
      { key: 'HEXO_COLOR_PRIMARY', cssVar: '--hexo-color-primary-light', label: '主色', defaultValue: '#928CEE' },
      { key: 'HEXO_COLOR_BG', cssVar: '--hexo-color-bg-light', label: '页面背景', defaultValue: '#f5f5f5' },
      { key: 'HEXO_COLOR_CARD', cssVar: '--hexo-color-card-light', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'HEXO_COLOR_TITLE', cssVar: '--hexo-color-title-light', label: '标题文字', defaultValue: '#4b5563' },
      { key: 'HEXO_COLOR_TEXT', cssVar: '--hexo-color-text-light', label: '正文文字', defaultValue: '#374151' },
      { key: 'HEXO_COLOR_TEXT_SECONDARY', cssVar: '--hexo-color-text-secondary-light', label: '次级文字', defaultValue: '#9ca3af' },
      { key: 'HEXO_COLOR_BORDER', cssVar: '--hexo-color-border-light', label: '边框', defaultValue: '#e5e7eb' },
      { key: 'HEXO_COLOR_PRIMARY_DARK', cssVar: '--hexo-color-primary-dark', label: '深色模式：主色', defaultValue: '#928CEE' },
      { key: 'HEXO_COLOR_BG_DARK', cssVar: '--hexo-color-bg-dark', label: '深色模式：页面背景', defaultValue: '#000000' },
      { key: 'HEXO_COLOR_CARD_DARK', cssVar: '--hexo-color-card-dark', label: '深色模式：卡片背景', defaultValue: '#101414' },
      { key: 'HEXO_COLOR_TITLE_DARK', cssVar: '--hexo-color-title-dark', label: '深色模式：标题文字', defaultValue: '#f3f4f6' },
      { key: 'HEXO_COLOR_TEXT_DARK', cssVar: '--hexo-color-text-dark', label: '深色模式：正文文字', defaultValue: '#d1d5db' },
      { key: 'HEXO_COLOR_TEXT_SECONDARY_DARK', cssVar: '--hexo-color-text-secondary-dark', label: '深色模式：次级文字', defaultValue: '#6b7280' },
      { key: 'HEXO_COLOR_BORDER_DARK', cssVar: '--hexo-color-border-dark', label: '深色模式：边框', defaultValue: '#000000' }
    ]
  },
  fukasawa: {
    name: 'Fukasawa',
    summary: '深川式多栏与侧边信息密度较高。',
    palette: [
      { key: 'FUKASAWA_COLOR_BG', cssVar: '--fukasawa-color-bg', label: '页面背景', defaultValue: '#eeedee' },
      { key: 'FUKASAWA_COLOR_CARD', cssVar: '--fukasawa-color-card', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'FUKASAWA_COLOR_BORDER', cssVar: '--fukasawa-color-border', label: '边框', defaultValue: '#d4d4d8' },
      { key: 'FUKASAWA_COLOR_TEXT', cssVar: '--fukasawa-color-text', label: '主文字', defaultValue: '#18181b' },
      { key: 'FUKASAWA_COLOR_TEXT_SECONDARY', cssVar: '--fukasawa-color-text-secondary', label: '次级文字', defaultValue: '#52525b' },
      { key: 'FUKASAWA_COLOR_BG_DARK', cssVar: '--fukasawa-color-bg-dark', label: '深色模式：页面背景', defaultValue: '#111827' },
      { key: 'FUKASAWA_COLOR_CARD_DARK', cssVar: '--fukasawa-color-card-dark', label: '深色模式：卡片背景', defaultValue: '#1f2937' },
      { key: 'FUKASAWA_COLOR_BORDER_DARK', cssVar: '--fukasawa-color-border-dark', label: '深色模式：边框', defaultValue: '#374151' },
      { key: 'FUKASAWA_COLOR_TEXT_DARK', cssVar: '--fukasawa-color-text-dark', label: '深色模式：主文字', defaultValue: '#e5e7eb' },
      { key: 'FUKASAWA_COLOR_TEXT_SECONDARY_DARK', cssVar: '--fukasawa-color-text-secondary-dark', label: '深色模式：次级文字', defaultValue: '#d1d5db' }
    ]
  },
  claude: {
    name: 'Claude',
    summary: '类 Claude Docs 的文档与终端氛围。',
    palette: [
      { key: 'CLAUDE_COLOR_ACCENT', cssVar: '--claude-accent-light', label: '强调色', defaultValue: '#DA7756' },
      { key: 'CLAUDE_COLOR_ACCENT_HOVER', cssVar: '--claude-accent-hover-light', label: '强调色 hover', defaultValue: '#C06042' },
      { key: 'CLAUDE_COLOR_BG', cssVar: '--claude-bg-light', label: '页面背景', defaultValue: '#ffffff' },
      { key: 'CLAUDE_COLOR_CARD', cssVar: '--claude-bg-secondary-light', label: '卡片背景', defaultValue: '#F3F3EE' },
      { key: 'CLAUDE_COLOR_TEXT', cssVar: '--claude-text-primary-light', label: '主文字', defaultValue: '#1A1A1A' },
      { key: 'CLAUDE_COLOR_TEXT_SECONDARY', cssVar: '--claude-text-secondary-light', label: '次级文字', defaultValue: '#5C5C5C' },
      { key: 'CLAUDE_COLOR_TEXT_TERTIARY', cssVar: '--claude-text-tertiary-light', label: '弱文字', defaultValue: '#8C8C8C' },
      { key: 'CLAUDE_COLOR_BORDER', cssVar: '--claude-border-light', label: '边框', defaultValue: '#E5E5E0' },
      { key: 'CLAUDE_COLOR_ACCENT_DARK', cssVar: '--claude-accent-dark', label: '深色模式：强调色', defaultValue: '#D4A27F' },
      { key: 'CLAUDE_COLOR_ACCENT_HOVER_DARK', cssVar: '--claude-accent-hover-dark', label: '深色模式：强调色 hover', defaultValue: '#DA7756' },
      { key: 'CLAUDE_COLOR_BG_DARK', cssVar: '--claude-bg-dark', label: '深色模式：页面背景', defaultValue: '#1A1915' },
      { key: 'CLAUDE_COLOR_CARD_DARK', cssVar: '--claude-bg-secondary-dark', label: '深色模式：卡片背景', defaultValue: '#242320' },
      { key: 'CLAUDE_COLOR_TEXT_DARK', cssVar: '--claude-text-primary-dark', label: '深色模式：主文字', defaultValue: '#9E9E9E' },
      { key: 'CLAUDE_COLOR_TEXT_SECONDARY_DARK', cssVar: '--claude-text-secondary-dark', label: '深色模式：次级文字', defaultValue: '#A0A09C' },
      { key: 'CLAUDE_COLOR_TEXT_TERTIARY_DARK', cssVar: '--claude-text-tertiary-dark', label: '深色模式：弱文字', defaultValue: '#6E6E6A' },
      { key: 'CLAUDE_COLOR_BORDER_DARK', cssVar: '--claude-border-dark', label: '深色模式：边框', defaultValue: '#333330' }
    ]
  },
  thoughtlite: {
    name: 'ThoughtLite',
    summary: '轻阅读向时间线与 Latest 卡片，单列列表与文章卡片排版。',
    palette: [
      { key: 'THOUGHTLITE_COLOR_BG', cssVar: '--tl-bg', label: '页面背景', defaultValue: '#faf9f7' },
      { key: 'THOUGHTLITE_COLOR_SURFACE', cssVar: '--tl-surface', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'THOUGHTLITE_COLOR_TEXT', cssVar: '--tl-text', label: '主文字', defaultValue: '#1a1a1a' },
      { key: 'THOUGHTLITE_COLOR_MUTED', cssVar: '--tl-muted', label: '次级文字', defaultValue: '#6b6b6b' },
      { key: 'THOUGHTLITE_COLOR_BORDER', cssVar: '--tl-border', label: '边框', defaultValue: '#e8e6e3' },
      { key: 'THOUGHTLITE_COLOR_ACCENT', cssVar: '--tl-accent', label: '强调色', defaultValue: '#2563eb' }
    ]
  },
  typography: {
    name: 'Typography',
    summary: '排版优先，强调正文阅读与层级。',
    settings: [
      { key: 'TYPOGRAPHY_BLOG_NAME', label: '站点名称', type: 'text', defaultValue: '活字印刷' },
      { key: 'TYPOGRAPHY_BLOG_NAME_EN', label: '英文名称', type: 'text', defaultValue: 'Typography' },
      { key: 'TYPOGRAPHY_POST_AD_ENABLE', label: '文章列表广告', type: 'boolean', defaultValue: false },
      { key: 'TYPOGRAPHY_POST_COVER_ENABLE', label: '文章封面', type: 'boolean', defaultValue: false },
      { key: 'TYPOGRAPHY_ARTICLE_RECOMMEND_POSTS', label: '文章推荐', type: 'boolean', defaultValue: true }
    ],
    palette: [
      { key: 'TYPOGRAPHY_COLOR_PRIMARY', cssVar: '--typography-color-primary', label: '主色', defaultValue: '#2e405b' },
      { key: 'TYPOGRAPHY_COLOR_TITLE', cssVar: '--typography-color-title', label: '标题色', defaultValue: '#276077' }
    ]
  },
  next: {
    name: 'Next',
    summary: '经典双栏布局，右侧栏与移动端悬浮目录。',
    palette: [
      { key: 'NEXT_COLOR_PRIMARY', cssVar: '--next-color-primary', label: '主色', defaultValue: '#4e80ee' },
      { key: 'NEXT_COLOR_BG', cssVar: '--next-color-bg', label: '页面背景', defaultValue: '#eeedee' }
    ]
  },
  nobelium: {
    name: 'Nobelium',
    summary: '致敬Nobelium,极简排版风格。',
    palette: [
      { key: 'NOBELIUM_COLOR_PRIMARY', cssVar: '--nobelium-color-primary', label: '主色', defaultValue: '#6b7280' }
    ]
  },
  magzine: {
    name: 'Magazine',
    summary: '杂志封面与大图列表风格。',
    palette: [
      { key: 'MAGZINE_COLOR_PRIMARY', cssVar: '--magzine-color-primary', label: '主色', defaultValue: '#7BE986' },
      { key: 'MAGZINE_COLOR_BG', cssVar: '--magzine-color-bg', label: '页面背景', defaultValue: '#f6f6f1' },
      { key: 'MAGZINE_COLOR_CARD', cssVar: '--magzine-color-card', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'MAGZINE_COLOR_TEXT', cssVar: '--magzine-color-text', label: '主文字', defaultValue: '#111827' },
      { key: 'MAGZINE_COLOR_BORDER', cssVar: '--magzine-color-border', label: '边框', defaultValue: '#d1d5db' },
      { key: 'MAGZINE_COLOR_SCROLLBAR', cssVar: '--magzine-color-scrollbar', label: '滚动条', defaultValue: '#4e4e4e' },
      { key: 'MAGZINE_COLOR_PRIMARY_DARK', cssVar: '--magzine-color-primary-dark', label: '深色模式：主色', defaultValue: '#62BA6B' },
      { key: 'MAGZINE_COLOR_BG_DARK', cssVar: '--magzine-color-bg-dark', label: '深色模式：页面背景', defaultValue: '#0b0f19' },
      { key: 'MAGZINE_COLOR_NAV_DARK', cssVar: '--magzine-color-nav-dark', label: '深色模式：导航背景', defaultValue: '#111827' },
      { key: 'MAGZINE_COLOR_CARD_DARK', cssVar: '--magzine-color-card-dark', label: '深色模式：卡片背景', defaultValue: '#1f2937' },
      { key: 'MAGZINE_COLOR_TEXT_DARK', cssVar: '--magzine-color-text-dark', label: '深色模式：主文字', defaultValue: '#e5e7eb' },
      { key: 'MAGZINE_COLOR_BORDER_DARK', cssVar: '--magzine-color-border-dark', label: '深色模式：边框', defaultValue: '#374151' }
    ]
  },
  plog: {
    name: 'Plog',
    summary: '偏图片与轻量图文化展示。',
    palette: [
      { key: 'PLOG_COLOR_PRIMARY', cssVar: '--plog-color-primary', label: '主色', defaultValue: '#1d4ed8' }
    ]
  },
  photo: {
    name: 'Photo',
    summary: '摄影作品与相册网格。',
    palette: [
      { key: 'PHOTO_COLOR_PRIMARY', cssVar: '--photo-color-primary', label: '主色', defaultValue: '#2563eb' },
      { key: 'PHOTO_COLOR_PRIMARY_DARK', cssVar: '--photo-color-primary-dark', label: '深色主色', defaultValue: '#ca8a04' }
    ]
  },
  movie: {
    name: 'Movie',
    summary: '影视与海报墙式呈现。',
    palette: [
      { key: 'MOVIE_COLOR_PRIMARY', cssVar: '--movie-color-primary', label: '主色', defaultValue: '#2563eb' },
      { key: 'MOVIE_COLOR_PRIMARY_DARK', cssVar: '--movie-color-primary-dark', label: '深色主色', defaultValue: '#ca8a04' }
    ]
  },
  game: {
    name: 'Game',
    summary: '偏游戏与像素元素装饰。',
    palette: [
      { key: 'GAME_COLOR_BG', cssVar: '--game-color-bg', label: '页面背景', defaultValue: '#ffffff' },
      { key: 'GAME_COLOR_SCROLLBAR', cssVar: '--game-color-scrollbar', label: '滚动条', defaultValue: '#4e4e4e' },
      { key: 'GAME_COLOR_PRIMARY', cssVar: '--game-color-primary', label: '主色', defaultValue: '#22c55e' }
    ]
  },
  starter: {
    name: 'Starter',
    summary: '落地页与区块化营销向模板。',
    palette: [
      { key: 'STARTER_COLOR_PRIMARY', cssVar: '--starter-color-primary', label: '主色', defaultValue: '#3758f9' },
      { key: 'STARTER_COLOR_PRIMARY_HOVER', cssVar: '--starter-color-primary-hover', label: '主色 hover', defaultValue: '#1b44c8' },
      { key: 'STARTER_COLOR_DARK', cssVar: '--starter-color-dark', label: '深色背景', defaultValue: '#111928' },
      { key: 'STARTER_COLOR_TEXT_MUTED', cssVar: '--starter-color-text-muted', label: '次级文字', defaultValue: '#637381' }
    ]
  },
  example: {
    name: 'Example',
    summary: '示例与演示向默认骨架。',
    palette: [
      { key: 'EXAMPLE_COLOR_PRIMARY', cssVar: '--example-color-primary', label: '主色', defaultValue: '#6b7280' },
      { key: 'EXAMPLE_COLOR_BG', cssVar: '--example-color-bg', label: '页面背景', defaultValue: '#f8fafc' },
      { key: 'EXAMPLE_COLOR_CARD', cssVar: '--example-color-card', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'EXAMPLE_COLOR_BORDER', cssVar: '--example-color-border', label: '边框', defaultValue: '#e5e7eb' },
      { key: 'EXAMPLE_COLOR_TEXT', cssVar: '--example-color-text', label: '主文字', defaultValue: '#111827' },
      { key: 'EXAMPLE_COLOR_BG_DARK', cssVar: '--example-color-bg-dark', label: '深色模式：页面背景', defaultValue: '#0f172a' },
      { key: 'EXAMPLE_COLOR_CARD_DARK', cssVar: '--example-color-card-dark', label: '深色模式：卡片背景', defaultValue: '#111827' },
      { key: 'EXAMPLE_COLOR_BORDER_DARK', cssVar: '--example-color-border-dark', label: '深色模式：边框', defaultValue: '#334155' },
      { key: 'EXAMPLE_COLOR_TEXT_DARK', cssVar: '--example-color-text-dark', label: '深色模式：主文字', defaultValue: '#e5e7eb' }
    ]
  },
  matery: {
    name: 'Matery',
    summary: '卡片式列表与 Material 质感组件。',
    palette: [
      { key: 'MATERY_COLOR_PRIMARY', cssVar: '--matery-color-primary', label: '主色', defaultValue: '#4338ca' },
      { key: 'MATERY_COLOR_PRIMARY_LIGHT', cssVar: '--matery-color-primary-light', label: '浅主色', defaultValue: '#818cf8' },
      { key: 'MATERY_COLOR_BG', cssVar: '--matery-color-bg', label: '页面背景', defaultValue: '#f5f5f5' }
    ]
  },
  proxio: {
    name: 'Proxio',
    summary: '作品集与个人品牌展示增强。',
    palette: [
      { key: 'PROXIO_COLOR_PRIMARY', cssVar: '--proxio-color-primary', label: '主色', defaultValue: '#3758f9' },
      { key: 'PROXIO_COLOR_PRIMARY_HOVER', cssVar: '--proxio-color-primary-hover', label: '主色 hover', defaultValue: '#1b44c8' },
      { key: 'PROXIO_COLOR_BG', cssVar: '--proxio-color-bg', label: '页面背景', defaultValue: '#ffffff' },
      { key: 'PROXIO_COLOR_DARK', cssVar: '--proxio-color-dark', label: '深色背景', defaultValue: '#121212' },
      { key: 'PROXIO_COLOR_TEXT_MUTED', cssVar: '--proxio-color-text-muted', label: '次级文字', defaultValue: '#637381' }
    ]
  },
  landing: {
    name: 'Landing',
    summary: '单页着陆与分区滚动叙述。',
    palette: [
      { key: 'LANDING_COLOR_PRIMARY', cssVar: '--landing-color-primary', label: '主色', defaultValue: '#ef4444' }
    ]
  },
  nav: {
    name: 'Nav',
    summary: '顶部导航主导航的现代布局。',
    rootId: 'theme-onenav',
    palette: [
      { key: 'NAV_COLOR_BG', cssVar: '--nav-color-bg', label: '页面背景', defaultValue: '#fbfbfb' },
      { key: 'NAV_COLOR_TEXT', cssVar: '--nav-color-text', label: '菜单文字', defaultValue: '#8c8c8c' },
      { key: 'NAV_COLOR_TEXT_HOVER', cssVar: '--nav-color-text-hover', label: '菜单 hover', defaultValue: '#000000' }
    ]
  },
  opc: {
    name: 'Opc',
    summary: '一人公司 AI 任务流水线入口，聚焦项目、产物和验收结果。',
    cover: '/images/themes-preview/opc.svg',
    coverWebp: '',
    settings: [
      { key: 'OPC_NAME', label: '顶部名称', type: 'text', defaultValue: 'Tangly · 个人公司' },
      { key: 'OPC_KICKER', label: '首屏标签', type: 'text', defaultValue: '一人公司 / 独立开发者' },
      { key: 'OPC_TITLE', label: '主标题', type: 'text', defaultValue: 'Tangly1024' },
      { key: 'OPC_SUBTITLE', label: '副标题', type: 'text', defaultValue: '一人公司的 AI 任务流水线实验室' },
      { key: 'OPC_DESCRIPTION', label: '主介绍', type: 'text', defaultValue: '我把 AI 当作能力入口，而不是模拟公司部门开会；用任务文件、产物路径和验收标准，运行内容、产品与交易实验。' },
      { key: 'OPC_PRIMARY_TEXT', label: '主按钮文字', type: 'text', defaultValue: '查看 FeiShow' },
      { key: 'OPC_PRIMARY_URL', label: '主按钮链接', type: 'text', defaultValue: 'https://github.com/askofcc/FeiShow' },
      { key: 'OPC_SECONDARY_TEXT', label: '副按钮文字', type: 'text', defaultValue: '阅读长期记录' },
      { key: 'OPC_SECONDARY_URL', label: '副按钮链接', type: 'text', defaultValue: 'https://github.com/askofcc/FeiShow' },
      { key: 'OPC_STATUS_TEXT', label: '状态标签', type: 'text', defaultValue: '持续公开构建' },
      { key: 'OPC_CARD_TITLE', label: '卡片标题', type: 'text', defaultValue: '可验收的 AI 生产流水线' },
      { key: 'OPC_CARD_DESCRIPTION', label: '卡片说明', type: 'text', defaultValue: '每轮只推进一个最小可验证目标：先买或接入成熟方案，再复制成熟做法，最后才自研；执行 AI 只领取一张任务单，交付文件后结束。' },
      { key: 'OPC_NOW_TITLE', label: '近况标题', type: 'text', defaultValue: '最近正在做什么' },
      { key: 'OPC_NOW_DESCRIPTION', label: '近况说明', type: 'text', defaultValue: '当前所有方向都按 ready、running、review、done 的流水线推进，只统计有效产物、验收结果和真实业务数据。' },
      { key: 'OPC_NOW_ITEMS', label: '近况标签', type: 'text', defaultValue: '游戏,小说,短剧,工具产品,流量媒体,AI企业工作流,量化交易' }
    ]
  },
  commerce: {
    name: 'Commerce',
    summary: '电商与商品展示向页面结构。',
    palette: [
      { key: 'COMMERCE_COLOR_PRIMARY', cssVar: '--commerce-color-primary', label: '主色', defaultValue: '#D2232A' },
      { key: 'COMMERCE_COLOR_BG', cssVar: '--commerce-color-bg', label: '页面背景', defaultValue: '#f5f5f5' }
    ]
  },
  endspace: {
    name: 'Endspace',
    summary: '轻工业终末风，侧栏导航、悬浮控件与加载动画。',
    settings: [
      { key: 'ENDSPACE_LOADING_COVER', label: '加载动画', type: 'boolean', defaultValue: true },
      { key: 'ENDSPACE_LOADING_SITE_NAME', label: '加载站点名', type: 'text', defaultValue: 'CLOUD09_SPACE' },
      { key: 'ENDSPACE_BANNER_WATERMARK_TEXT', label: '首页水印文字', type: 'text', defaultValue: 'CLOUD09_SPACE' },
      { key: 'ENDSPACE_ARTICLE_WATERMARK_TEXT', label: '文章水印文字', type: 'text', defaultValue: 'CLOUD09' },
      { key: 'ENDSPACE_MENU_ARCHIVE', label: '归档菜单', type: 'boolean', defaultValue: true }
    ],
    palette: [
      { key: 'ENDSPACE_COLOR_BG_BASE', cssVar: '--endspace-bg-base-light', label: '页面背景', defaultValue: '#fafafa' },
      { key: 'ENDSPACE_COLOR_SURFACE', cssVar: '--endspace-bg-primary-light', label: '卡片背景', defaultValue: '#ffffff' },
      { key: 'ENDSPACE_COLOR_TEXT', cssVar: '--endspace-text-primary-light', label: '主文字', defaultValue: '#18181b' },
      { key: 'ENDSPACE_COLOR_TEXT_SECONDARY', cssVar: '--endspace-text-secondary-light', label: '次级文字', defaultValue: '#52525b' },
      { key: 'ENDSPACE_COLOR_ACCENT', cssVar: '--endspace-accent-yellow-light', label: '强调色', defaultValue: '#FBFB45' },
      { key: 'ENDSPACE_COLOR_ACCENT_DIM', cssVar: '--endspace-accent-yellow-dim-light', label: '弱强调色', defaultValue: 'rgba(251, 251, 69, 0.15)' },
      { key: 'ENDSPACE_COLOR_BORDER', cssVar: '--endspace-border-base-light', label: '边框', defaultValue: '#e4e4e7' },
      { key: 'ENDSPACE_COLOR_BG_BASE_DARK', cssVar: '--endspace-bg-base-dark', label: '深色模式：页面背景', defaultValue: '#09090b' },
      { key: 'ENDSPACE_COLOR_SURFACE_DARK', cssVar: '--endspace-bg-primary-dark', label: '深色模式：卡片背景', defaultValue: '#18181b' },
      { key: 'ENDSPACE_COLOR_TEXT_DARK', cssVar: '--endspace-text-primary-dark', label: '深色模式：主文字', defaultValue: '#f4f4f5' },
      { key: 'ENDSPACE_COLOR_TEXT_SECONDARY_DARK', cssVar: '--endspace-text-secondary-dark', label: '深色模式：次级文字', defaultValue: '#d4d4d8' },
      { key: 'ENDSPACE_COLOR_BORDER_DARK', cssVar: '--endspace-border-base-dark', label: '深色模式：边框', defaultValue: '#3f3f46' },
      { key: 'ENDSPACE_COLOR_ACCENT_DARK', cssVar: '--endspace-accent-yellow-dark', label: '深色模式：强调色', defaultValue: '#fef08a' }
    ]
  },
}
