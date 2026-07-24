import http from 'http'
import fs from 'fs'

function get(path, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now()
    const req = http.get({ host: '127.0.0.1', port: 3460, path, timeout }, res => {
      let d = ''
      res.on('data', c => (d += c))
      res.on('end', () => resolve({ status: res.statusCode, body: d, ms: Date.now() - t0, ct: res.headers['content-type'] }))
    })
    req.on('timeout', () => {
      req.destroy()
      reject(new Error('timeout ' + path))
    })
    req.on('error', reject)
  })
}

function nextData(body) {
  const m = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!m) return null
  try { return JSON.parse(m[1]) } catch { return null }
}

const out = []
function log(obj) {
  out.push(obj)
  console.log(JSON.stringify(obj))
}

const paths = [
  '/',
  '/?theme=example',
  '/?theme=simple',
  '/?theme=gitbook',
  '/archive',
  '/search',
  '/category',
  '/tag',
  '/sitemap.xml',
  '/rss/feed.xml',
  '/feed',
  '/article/WVcXwGWVdiygsHkGS6LcbWbln4e',
  '/WVcXwGWVdiygsHkGS6LcbWbln4e',
  '/article/Q7lfwTNIxizI8kkhuD0cyZCSnvf',
  '/Q7lfwTNIxizI8kkhuD0cyZCSnvf'
]

for (const p of paths) {
  try {
    const r = await get(p)
    const nd = nextData(r.body)
    const post = nd?.props?.pageProps?.post
    log({
      p,
      status: r.status,
      ms: r.ms,
      len: r.body.length,
      ct: (r.ct || '').slice(0, 40),
      themeId: (r.body.match(/id="theme-([a-z0-9_-]+)"/i) || [])[1] || null,
      page: nd?.page || null,
      title: post?.title || null,
      hasFeishu: !!post?.feishuContent,
      blocks: post?.feishuContent?.blocks?.length || 0,
      toc: (post?.toc || []).length,
      notionPage: r.body.includes('notion-page') || r.body.includes('notion-text'),
      xml: /urlset|<rss|<\?xml/.test(r.body.slice(0, 200)),
      hasPosts: r.body.includes('模板说明') || r.body.includes('示例文章'),
      err: (nd?.err || nd?.props?.pageProps?.err)?.message?.slice?.(0, 100) || null
    })
  } catch (e) {
    log({ p, error: e.message })
  }
}

// home article links
try {
  const home = await get('/')
  const arts = [...new Set([...home.body.matchAll(/href="(\/article\/[^"]+)"/g)].map(m => m[1]))]
  log({ homeArticles: arts })
} catch (e) {
  log({ homeArticlesError: e.message })
}

fs.writeFileSync('docs/feishu/samples/phase4-verify.json', JSON.stringify(out, null, 2))
console.log('wrote docs/feishu/samples/phase4-verify.json')
