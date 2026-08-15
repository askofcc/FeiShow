#!/usr/bin/env node
/**
 * Verify agent discovery + list + detail (json/md).
 * Usage: node scripts/verify-agent-api.mjs [--base http://127.0.0.1:3460]
 */
const base = (
  process.argv.includes('--base')
    ? process.argv[process.argv.indexOf('--base') + 1]
    : process.env.BASE || 'http://127.0.0.1:3460'
).replace(/\/+$/, '')

const publicBase = !/localhost|127\.0\.0\.1/.test(base)

function fail(msg) {
  console.error('FAIL', msg)
  process.exitCode = 1
}

function ok(msg) {
  console.log('OK  ', msg)
}

async function get(path, headers = {}) {
  const url = path.startsWith('http') ? path : `${base}${path}`
  const res = await fetch(url, { headers })
  const text = await res.text()
  return { url, status: res.status, text, headers: res.headers }
}

function mustJson(text, url) {
  try {
    return JSON.parse(text)
  } catch {
    fail(`not JSON: ${url}`)
    return null
  }
}

const requiredSummary = [
  'id',
  'type',
  'title',
  'slug',
  'href',
  'url',
  'updatedAt',
  'agent'
]

;(async () => {
  const llms = await get('/llms.txt')
  if (llms.status !== 200 || !llms.text.includes('/api/agent/posts')) {
    fail(`/llms.txt ${llms.status} missing agent pointer`)
  } else ok('/llms.txt')

  const robots = await get('/robots.txt')
  if (robots.status !== 200) fail(`/robots.txt ${robots.status}`)
  else ok('/robots.txt')

  const list = await get('/api/agent/posts?limit=3')
  const data = mustJson(list.text, list.url)
  if (!data) return
  if (data.version !== 1 || !Array.isArray(data.posts) || typeof data.total !== 'number') {
    fail('list schema: need version=1, posts[], total')
  } else ok(`list count=${data.posts.length} total=${data.total}`)

  if (publicBase && (list.text.includes('localhost') || list.text.includes('127.0.0.1'))) {
    fail('public list response contains localhost')
  }

  if (!data.posts.length) {
    console.log('SKIP no published posts — cannot check detail')
    process.exit(process.exitCode || 0)
  }

  const first = data.posts[0]
  for (const k of requiredSummary) {
    if (first[k] == null && k !== 'updatedAt') fail(`list item missing ${k}`)
  }
  if (!first.agent?.json || !first.agent?.markdown) fail('list item missing agent.json/markdown')

  const detail = await get(first.agent.json.replace(data.site.link, '') || `/api/agent/posts/${encodeURIComponent(first.slug)}`)
  // agent.json is absolute — fetch it directly
  const detailAbs = await get(first.agent.json)
  const detailJson = mustJson(detailAbs.text, first.agent.json)
  if (detailAbs.status !== 200 || !detailJson?.post) {
    fail(`detail json ${detailAbs.status} ${first.agent.json}`)
  } else {
    const p = detailJson.post
    if (!('markdown' in p) || !('plainText' in p)) fail('detail missing markdown/plainText')
    else if (p.markdownSource === 'feishu-official') fail('detail still uses official markdown export')
    else if (p.accessError) ok(`detail json slug=${p.slug} accessError mdSource=${p.markdownSource}`)
    else if (p.markdownSource !== 'feishu-blocks') fail(`detail markdownSource=${p.markdownSource}, expected feishu-blocks`)
    else if (!p.content || !Array.isArray(p.content.blocks)) fail('detail missing processed content.blocks')
    else ok(`detail json slug=${p.slug} mdSource=${p.markdownSource} blocks=${p.content.blocks.length}`)
  }

  const md = await get(first.agent.markdown)
  if (md.status !== 200 || !String(md.headers.get('content-type') || '').includes('markdown')) {
    // some stacks omit markdown in content-type; still require body
    if (md.status !== 200 || !md.text.includes('#')) fail(`detail md ${md.status}`)
    else ok('detail markdown (loose content-type)')
  } else ok('detail markdown')

  if (publicBase && (detailAbs.text.includes('localhost') || md.text.includes('localhost'))) {
    fail('public detail contains localhost')
  }

  process.exit(process.exitCode || 0)
})().catch(err => {
  console.error(err)
  process.exit(1)
})
