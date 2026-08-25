'use client'

import BLOG from '@/blog.config'
import { getGlobalSnapshot } from './global'
import { deepClone, isUrlLikePath } from './utils'

/**
 * Resolve a user-facing site setting.
 *
 * Feishu mode uses NOTION_CONFIG as a legacy compatibility name for the
 * normalized CONFIG-TABLE map. Infrastructure values (credentials, root,
 * cache backend, etc.) deliberately do not flow through this function.
 *
 * Priority:
 * runtime UI override -> CONFIG-TABLE -> provided config -> active theme
 * defaults -> root-page derived fallback -> code/env defaults -> caller default.
 */
export const siteConfig = (key, defaultVal = null, extendConfig = {}) => {
  if (!key) {
    return null
  }
  const hasVal = value => value !== undefined && value !== null
  const global = getGlobalSnapshot() || {}

  const get = config => {
    if (!config || typeof config !== 'object') return undefined
    if (config[key] !== undefined) return config[key]
    const upper = typeof key === 'string' ? key.toUpperCase() : key
    if (config[upper] !== undefined) return config[upper]
    const lower = typeof key === 'string' ? key.toLowerCase() : key
    if (config[lower] !== undefined) return config[lower]
    if (typeof key === 'string') {
      const noPrefix = key.replace(/^NEXT_PUBLIC_/, '')
      if (config[noPrefix] !== undefined) return config[noPrefix]
      const noPrefixUpper = upper.replace(/^NEXT_PUBLIC_/, '')
      if (config[noPrefixUpper] !== undefined) return config[noPrefixUpper]
      const withPrefix = `NEXT_PUBLIC_${upper}`
      if (config[withPrefix] !== undefined) return config[withPrefix]
    }
    return undefined
  }

  const candidates = [
    get(global.runtimeConfigOverrides),
    get(global.NOTION_CONFIG),
    get(extendConfig),
    get(global.THEME_CONFIG)
  ]

  for (const value of candidates) {
    if (hasVal(value)) return convertVal(value)
  }

  // Root-page metadata is a Feishu fallback when the CONFIG-TABLE does not
  // provide a site identity value.
  const siteInfo = global.siteInfo
  const siteInfoFallbacks = {
    HOME_BANNER_IMAGE: siteInfo?.pageCover,
    AVATAR: siteInfo?.icon,
    TITLE: siteInfo?.title,
    DESCRIPTION: siteInfo?.description
  }
  if (hasVal(siteInfoFallbacks[key])) {
    return convertVal(siteInfoFallbacks[key])
  }

  // Legacy CONFIG rows occasionally used the old env-shaped Waline names.
  // Keep this narrow compatibility bridge while all new rows use COMMENT_*.
  if (key === 'COMMENT_WALINE_SERVER_URL') {
    const value =
      global.NOTION_CONFIG?.WALINE_SERVER_URL ||
      global.NOTION_CONFIG?.NEXT_PUBLIC_WALINE_SERVER_URL
    if (hasVal(value)) return convertVal(value)
  }
  if (key === 'COMMENT_WALINE_RECENT') {
    const value =
      global.NOTION_CONFIG?.WALINE_RECENT ||
      global.NOTION_CONFIG?.NEXT_PUBLIC_WALINE_RECENT
    if (hasVal(value)) return convertVal(value)
  }

  const blogVal = get(BLOG)
  if (hasVal(blogVal)) return convertVal(blogVal)
  return defaultVal
}

export const cleanJsonString = val => {
  // 使用正则表达式去掉不必要的空格、换行符和制表符
  return val.replace(/\s+/g, ' ').trim()
}

/**
 * 从环境变量和NotionConfig读取的配置都是string类型；
 * 这里识别出配置的字符值若为 数字、布尔、[]数组，{}对象，若是则转成对应类型
 * @param {*} val
 * @returns
 */
export const convertVal = val => {
  // 如果传入参数本身就是 obj、数组、boolean，就无需处理
  if (typeof val !== 'string' || !val) {
    return val
  }

  const trimmed = val.trim()
  const lower = trimmed.toLowerCase()

  // 检测布尔值及常用中文/英文写法
  if (lower === 'true' || lower === 'yes' || trimmed === '是') {
    return true
  }
  if (lower === 'false' || lower === 'no' || trimmed === '否') {
    return false
  }

  // 检测是否为整数并避免数值溢出
  if (/^-?\d+$/.test(trimmed)) {
    const parsedNum = Number(trimmed)
    if (parsedNum > Number.MAX_SAFE_INTEGER || parsedNum < Number.MIN_SAFE_INTEGER) {
      return trimmed
    }
    return parsedNum
  }

  // 检测是否为浮点数
  if (/^-?\d+\.\d+$/.test(trimmed)) {
    const parsedNum = parseFloat(trimmed)
    if (!Number.isNaN(parsedNum)) {
      return parsedNum
    }
  }

  // 检测是否为 URL
  if (isUrlLikePath(trimmed)) {
    return trimmed
  }

  // 配置值前可能有污染的空格
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return trimmed
  }

  // 转换 [] , {} 这类字符串为对象
  try {
    const cleaned = cleanJsonString(trimmed)
    const parsedJson = JSON.parse(cleaned)
    if (parsedJson !== null) {
      return parsedJson
    }
  } catch (error) {
    // 解析失败，返回原始字符串
    return trimmed
  }

  return trimmed
}

/**
 * 读取所有配置
 * 1. 优先读取NotionConfig表
 * 2. 其次读取环境变量
 * 3. 再读取blog.config.js文件
 * @param {*} key
 * @returns
 */
export const siteConfigMap = () => {
  const val = deepClone(BLOG)
  for (const key in val) {
    val[key] = siteConfig(key)
  }
  return val
}
