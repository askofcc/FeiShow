/**
 * 主题切换面板 — 集中配置（与 themes/<id> 目录名对应）
 *
 * 字段说明：
 * - name    展示名称（缺省则自动格式化为目录名的 Title Case）
 * - summary 简短简介，展示在卡片标题下方
 * - cover   预览图 URL（缺省 /images/themes-preview/<id>.png）
 * - coverWebp 可选；缺省 /images/themes-preview/<id>.webp，设为 '' 可跳过 webp 仅用 cover
 * - tier    可选；'free' | 'paid'，缺省为 'free'。面板展示对应标签，为后续付费主题预留。
 */

/** @type {Record<string, { name?: string, summary?: string, cover?: string, coverWebp?: string, rootId?: string, tier?: 'free' | 'paid', settings?: Array<{ key: string, label: string, type: 'boolean' | 'text' | 'number' | 'select', defaultValue: string | number | boolean, options?: Array<{ label: string, value: string | number | boolean }> }>, palette?: Array<{ key: string, cssVar: string, label: string, defaultValue: string }> }>} */
import {
  ACTIVE_THEME,
  ACTIVE_THEME_COLOR_OVERRIDES,
  ACTIVE_THEME_CONFIG,
  ACTIVE_THEME_CONFIG_DEFAULTS,
  ACTIVE_THEME_SWITCH_ROW
} from '@/themes/active-theme'

// Build-time data contains only the CONFIG-selected theme.
const THEME_SWITCH_MANIFEST = {
  [ACTIVE_THEME]: ACTIVE_THEME_SWITCH_ROW
}


// The generated module is the compile-time theme boundary.
const THEME_CONFIGS = {
  [ACTIVE_THEME]: ACTIVE_THEME_CONFIG
}

function withActiveThemePalette(palette = []) {
  const existing = new Set(palette.map(item => item.key))
  const prefix = ACTIVE_THEME.toUpperCase()
  const defaults = {
    light: { PRIMARY: '#2563eb', BG: '#ffffff', CARD: '#ffffff', TEXT: '#111827', TEXT_SECONDARY: '#6b7280', BORDER: '#e5e7eb' },
    dark: { PRIMARY: '#60a5fa', BG: '#000000', CARD: '#111827', TEXT: '#e5e7eb', TEXT_SECONDARY: '#9ca3af', BORDER: '#374151' }
  }
  const tokens = [
    ['PRIMARY', '主色'], ['BG', '页面背景'], ['CARD', '卡片背景'],
    ['TEXT', '主文字'], ['TEXT_SECONDARY', '次级文字'], ['BORDER', '边框'],
    ['PRIMARY_DARK', '深色模式：主色'], ['BG_DARK', '深色模式：页面背景'],
    ['CARD_DARK', '深色模式：卡片背景'], ['TEXT_DARK', '深色模式：主文字'],
    ['TEXT_SECONDARY_DARK', '深色模式：次级文字'], ['BORDER_DARK', '深色模式：边框']
  ]
  return tokens.map(([token, label]) => {
      const isDark = token.endsWith('_DARK')
      const baseToken = isDark ? token.replace(/_DARK$/, '') : token
      const key = `${prefix}_COLOR_${token}`
      return {
        key,
        cssVar: `--${ACTIVE_THEME}-color-${token.toLowerCase().replace(/_/g, '-')}`,
        label,
        defaultValue: ACTIVE_THEME_COLOR_OVERRIDES[token] ||
          ACTIVE_THEME_CONFIG_DEFAULTS[key] ||
          defaults[isDark ? 'dark' : 'light'][baseToken]
      }
    })
    .filter(item => !existing.has(item.key))
    .concat(palette)
}

function inferThemeSettings(themeId, manualSettings = []) {
  const config = THEME_CONFIGS[themeId] || {}
  const manualKeys = new Set(manualSettings.map(item => item.key))
  return Object.entries(config)
    .filter(([key, value]) => {
      if (manualKeys.has(key)) return false
      if (/_COLOR_|_THEME_COLOR/.test(key)) return false
      return ['boolean', 'string', 'number'].includes(typeof value)
    })
    .map(([key, value]) => normalizeSetting({
      key,
      label: formatConfigLabel(key, themeId),
      type: typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'text',
      defaultValue: value
    }, themeId))
}

const SELECT_OPTIONS_BY_KEY = {
  NEXT_NAV_TYPE: [
    { label: '固定顶部', value: 'fixed' },
    { label: '滚动收起', value: 'autoCollapse' },
    { label: '普通导航', value: 'normal' }
  ]
}

const CONFIG_LABEL_WORDS = {
  ABOUT: '关于',
  AD: '广告',
  ADSENSE: 'Adsense',
  ANALYTICS: '统计',
  ARCHIVE: '归档',
  AUTO: '自动',
  BACKGROUND: '背景',
  BANNER: '横幅',
  BLOG: '博客',
  BOOK: '文档',
  BUTTON: '按钮',
  CACHE: '缓存',
  CAREER: '职业经历',
  CATEGORY: '分类',
  COLLAPSE: '收起',
  COMMENT: '评论',
  CONTACT: '联系',
  COUNT: '数量',
  COVER: '封面',
  CTA: '行动按钮',
  DARK: '深色模式',
  DEFAULT: '默认',
  DETAIL: '详情',
  ENABLE: '启用',
  FAQ: '常见问题',
  FEATURE: '特性',
  FIXED: '固定',
  FORCE: '强制',
  HEADER: '标题',
  HERO: '首屏',
  HIDDEN: '隐藏',
  HOME: '首页',
  HOVER: '悬停',
  IMAGE: '图片',
  IMG: '图片',
  INDEX: '首页',
  LATEST: '最新文章',
  LAYOUT: '布局',
  LEVEL3: '三级目录',
  LIST: '列表',
  MAPS: '地图',
  MENU: '菜单',
  MINIMAL: '极简',
  MODE: '模式',
  NAME: '名称',
  NAV: '导航',
  NOTION: 'Notion',
  PAGE: '页面',
  PERSIST: '持久化',
  POST: '文章',
  POSTS: '文章',
  PREVIEW: '预览',
  PRICING: '价格',
  RANDOM: '随机文章',
  README: 'README',
  RECOMMEND: '推荐',
  REDIRECT: '重定向',
  RSS: '订阅',
  SEARCH: '搜索',
  SHOW: '显示',
  SORT: '排序',
  SUMMARY: '摘要',
  TAG: '标签',
  TESTIMONIALS: '评价',
  TEXT: '文字',
  TITLE: '标题',
  TO: '跳转',
  TOC: '目录',
  TOP: '顶部',
  TYPE: '类型',
  UPDATE: '更新',
  URL: '链接',
  VERTICAL: '上下布局',
  WIDGET: '悬浮工具',
  WWADS: '万维广告'
}

const CONFIG_HELP_RULES = [
  [/MENU_(CATEGORY|TAG|ARCHIVE|SEARCH|RSS|INDEX|HOME)/, '控制导航菜单中是否显示该入口。'],
  [/POST_LIST_COVER/, '控制文章列表卡片是否显示封面图。'],
  [/POST_LIST_(SUMMARY|PREVIEW)/, '控制文章列表是否显示摘要或正文预览。'],
  [/COVER_DEFAULT|COVER_FORCE/, '控制缺少封面时是否使用默认封面。'],
  [/WIDGET_/, '控制主题悬浮工具或侧边栏组件是否显示。'],
  [/HOME_.*ENABLE|HERO_ENABLE|BANNER_ENABLE/, '控制首页对应模块是否显示。'],
  [/COUNT$/, '控制当前模块展示的条目数量。'],
  [/NAV_TYPE$/, '控制导航栏的固定和滚动行为。'],
  [/LAYOUT_VERTICAL$/, '控制文章页使用上下布局还是左右布局。'],
  [/REDIRECT_ENABLE$/, '控制文章地址是否启用重定向。'],
  [/CACHE_ENABLED|PERSIST_ENABLED/, '控制浏览器本地缓存或持久化能力。']
]

function normalizeSetting(item, themeId) {
  const options = item.options || inferSelectOptions(item)
  return {
    ...item,
    label: item.label || formatConfigLabel(item.key, themeId),
    help: item.help || formatConfigHelp(item.key),
    type: options ? 'select' : item.type,
    options
  }
}

function inferSelectOptions(item) {
  if (SELECT_OPTIONS_BY_KEY[item.key]) return SELECT_OPTIONS_BY_KEY[item.key]
  if (typeof item.defaultValue === 'string' && /^(true|false)$/i.test(item.defaultValue)) {
    return [
      { label: '开启', value: 'true' },
      { label: '关闭', value: 'false' }
    ]
  }
  return null
}

function formatConfigHelp(key) {
  const rule = CONFIG_HELP_RULES.find(([pattern]) => pattern.test(key))
  if (rule) return rule[1]
  if (/_ENABLE$/.test(key)) return '控制该模块是否启用。'
  if (/_TEXT$|_TITLE$|_NAME$/.test(key)) return '控制页面上显示的文字内容。'
  if (/_URL$/.test(key)) return '控制点击后跳转的链接地址。'
  return '主题基础配置，修改后可实时预览并复制到 Notion Config。'
}

function formatConfigLabel(key, themeId) {
  const prefix = `${String(themeId).toUpperCase()}_`
  return key
    .replace(prefix, '')
    .split('_')
    .filter(Boolean)
    .map(word => CONFIG_LABEL_WORDS[word] || word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * @param {string} themeId themes 目录名
 * @returns {{ id: string, name: string, summary: string, coverPng: string, coverWebp: string | null, rootId: string | undefined, tier: 'free' | 'paid', settings: Array<{ key: string, label: string, type: 'boolean' | 'text' | 'number' | 'select', defaultValue: string | number | boolean, options?: Array<{ label: string, value: string | number | boolean }> }>, palette: Array<{ key: string, cssVar: string, label: string, defaultValue: string }> }}
 */
export function getThemeSwitchMeta(themeId) {
  const id = themeId == null ? '' : String(themeId).trim()
  const row = THEME_SWITCH_MANIFEST[id] || {}

  const tier = row.tier === 'paid' ? 'paid' : 'free'

  const name =
    typeof row.name === 'string' && row.name.trim()
      ? row.name.trim()
      : formatThemeId(id)

  const summary =
    typeof row.summary === 'string' ? row.summary.trim() : ''

  const coverPng =
    typeof row.cover === 'string' && row.cover.trim()
      ? row.cover.trim()
      : `/images/themes-preview/${id}.png`

  let coverWebp = null
  if (row.coverWebp === '') {
    coverWebp = null
  } else if (typeof row.coverWebp === 'string' && row.coverWebp.trim()) {
    coverWebp = row.coverWebp.trim()
  } else {
    coverWebp = `/images/themes-preview/${id}.webp`
  }

  const palette = withActiveThemePalette(Array.isArray(row.palette) ? row.palette : [])
  const manualSettings = Array.isArray(row.settings)
    ? row.settings.map(item => normalizeSetting(item, id))
    : []
  const settings = manualSettings.concat(inferThemeSettings(id, manualSettings))

  const rootId =
    typeof row.rootId === 'string' && row.rootId.trim()
      ? row.rootId.trim()
      : undefined

  return { id, name, summary, coverPng, coverWebp, rootId, tier, settings, palette }
}

export function formatThemeId(id) {
  const s = id == null ? '' : String(id).trim()
  if (!s) return ''
  return s
    .split(/[-_]/)
    .filter(Boolean)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
}
