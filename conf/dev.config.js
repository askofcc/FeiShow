/**
 * 开发人员可能需要关注的配置
 */
module.exports = {
  SUB_PATH: '', // leave this empty unless you want to deploy in a folder
  DEBUG: process.env.NEXT_PUBLIC_DEBUG || false, // 是否显示调试按钮
  // TAILWINDCSS 配置的自定义颜色，作废
  BACKGROUND_LIGHT: '#eeeeee', // use hex value, don't forget '#' e.g #fffefc
  BACKGROUND_DARK: '#000000', // use hex value, don't forget '#'

  // Redis 缓存数据库地址
  REDIS_URL: process.env.REDIS_URL || '',

  // FeishuNext: cache ON by default (build + runtime). Only ENABLE_CACHE=false turns it off.
  // Site config (TITLE/THEME/REVALIDATE…) belongs in CONFIG-TABLE, not Vercel env.
  ENABLE_CACHE:
    process.env.ENABLE_CACHE === undefined ||
    process.env.ENABLE_CACHE === ''
      ? true
      : !(
          String(process.env.ENABLE_CACHE).trim() === 'false' ||
          String(process.env.ENABLE_CACHE).trim() === '0'
        ),
  isProd: process.env.VERCEL_ENV === 'production' || process.env.EXPORT, // distinguish between development and production environment (ref: https://vercel.com/docs/environment-variables#system-environment-variables)
  BUNDLE_ANALYZER: process.env.ANALYZE === 'true' || false, // 是否展示编译依赖内容与大小
  VERSION: (() => {
    try {
      // 优先使用环境变量，否则从package.json中获取版本号
      return (
        process.env.NEXT_PUBLIC_VERSION || require('../package.json').version
      )
    } catch (error) {
      console.warn('Failed to load package.json version:', error)
      return '1.0.0' // 缺省版本号
    }
  })()
}
