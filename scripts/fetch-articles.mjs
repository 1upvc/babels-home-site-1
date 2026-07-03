#!/usr/bin/env node
/**
 * Babels — local article curation pipeline (Phase 2).
 *
 * Ingests items from RSS feeds (scripts/feeds.json) and ad-hoc URLs
 * (scripts/urls.txt or --url), acquires article text (hybrid: feed body,
 * falling back to fetch+extract), summarizes each with a local Gemma model
 * served by Ollama, and writes draft MDX files matching the Phase 1 contract.
 *
 * Usage:
 *   node scripts/fetch-articles.mjs                 # feeds + urls.txt
 *   node scripts/fetch-articles.mjs --dry-run       # plan only, no model, no writes
 *   node scripts/fetch-articles.mjs --url <URL>     # one-off URL (repeatable)
 *   node scripts/fetch-articles.mjs --limit 5       # cap new items this run
 *   node scripts/fetch-articles.mjs --since 2026-06-01
 *
 * Env:
 *   OLLAMA_ENDPOINT (default http://localhost:11434)
 *   OLLAMA_MODEL    (default gemma3:12b — set to your pulled Gemma tag)
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Parser from 'rss-parser'
import { extract } from '@extractus/article-extractor'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const ARTICLES_DIR = path.join(ROOT, 'content', 'articles')
const FEEDS_FILE = path.join(__dirname, 'feeds.json')
const URLS_FILE = path.join(__dirname, 'urls.txt')
const STATE_FILE = path.join(__dirname, '.processed.json')

// ---- Config ----
const OLLAMA_ENDPOINT = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434'
// Defaults to the locally-pulled Gemma-4-12B GGUF; override with OLLAMA_MODEL.
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  'hf.co/yuxinlu1/gemma-4-12B-coder-fable5-composer2.5-v1-GGUF:Q4_K_M'
const MAX_AGE_DAYS = 14          // ingestion window: skip feed items older than this
const FEED_FULLTEXT_MIN = 1200   // if feed body >= this, don't fetch the page
const EXTRACT_MAX_CHARS = 6000   // cap text sent to the model
const PER_HOST_DELAY_MS = 1500   // politeness delay between fetches to same host
const FETCH_TIMEOUT_MS = 20000
const USER_AGENT =
  'BabelsArticleBot/1.0 (+https://babels.dev; detection-engineering curation)'
const CONTROLLED_TAGS = [
  'detection-engineering', 'sigma', 'elastic', 'ai', 'mcp',
  'threat-hunting', 'ci-cd', 'siem', 'incident-response',
]

// ---- CLI args ----
function parseArgs(argv) {
  const args = { dryRun: false, limit: 10, urls: [], since: null }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') args.dryRun = true
    else if (a === '--limit') args.limit = parseInt(argv[++i], 10) || args.limit
    else if (a === '--url') args.urls.push(argv[++i])
    else if (a === '--since') args.since = new Date(argv[++i])
  }
  return args
}

// ---- Small utils ----
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function slugify(str, maxLen = 60) {
  const base = String(str)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  if (base.length <= maxLen) return base
  // Truncate on a word boundary so slugs never end mid-word.
  const words = base.split('-')
  let out = ''
  for (const w of words) {
    if (out && (out.length + 1 + w.length) > maxLen) break
    out = out ? `${out}-${w}` : w
  }
  return out || base.slice(0, maxLen).replace(/-+$/g, '')
}

function decodeEntities(str) {
  return String(str || '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&quot;/gi, '"')
    .replace(/&(apos|#39);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&') // keep last so we don't double-decode
}

function stripHtml(html) {
  return decodeEntities(
    String(html || '')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\s+/g, ' ')
    .trim()
}

function ymd(date) {
  const d = date instanceof Date && !isNaN(date) ? date : new Date()
  return d.toISOString().slice(0, 10)
}

function loadState() {
  try {
    return new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')))
  } catch {
    return new Set()
  }
}

function saveState(set) {
  fs.writeFileSync(STATE_FILE, JSON.stringify([...set], null, 2) + '\n')
}

// Collect sourceUrls already present in content/articles for dedupe.
function existingSourceUrls() {
  const urls = new Set()
  if (!fs.existsSync(ARTICLES_DIR)) return urls
  for (const f of fs.readdirSync(ARTICLES_DIR)) {
    if (!f.endsWith('.mdx')) continue
    const text = fs.readFileSync(path.join(ARTICLES_DIR, f), 'utf8')
    const m = text.match(/^sourceUrl:\s*(\S+)\s*$/m)
    if (m) urls.add(m[1].trim())
  }
  return urls
}

function fileExistsForSlug(dateStr, slug) {
  return fs.existsSync(path.join(ARTICLES_DIR, `${dateStr}-${slug}.mdx`))
}

// ---- Politeness: per-host delay + best-effort robots.txt ----
const lastHitByHost = new Map()
const robotsCache = new Map()

async function hostDelay(url) {
  const host = new URL(url).host
  const last = lastHitByHost.get(host) || 0
  const wait = PER_HOST_DELAY_MS - (Date.now() - last)
  if (wait > 0) await sleep(wait)
  lastHitByHost.set(host, Date.now())
}

async function timedFetch(url, opts = {}) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
  try {
    return await fetch(url, {
      ...opts,
      signal: ctrl.signal,
      headers: { 'User-Agent': USER_AGENT, ...(opts.headers || {}) },
      redirect: 'follow',
    })
  } finally {
    clearTimeout(t)
  }
}

// Best-effort robots.txt: returns true if allowed (fails open on error).
async function robotsAllows(targetUrl) {
  let origin
  try {
    origin = new URL(targetUrl).origin
  } catch {
    return false
  }
  if (!robotsCache.has(origin)) {
    let disallows = []
    try {
      const res = await timedFetch(`${origin}/robots.txt`)
      if (res.ok) {
        const body = await res.text()
        let applies = false
        for (const raw of body.split('\n')) {
          const line = raw.replace(/#.*$/, '').trim()
          if (!line) continue
          const [k, ...rest] = line.split(':')
          const key = k.trim().toLowerCase()
          const val = rest.join(':').trim()
          if (key === 'user-agent') {
            applies = val === '*' || /babelsarticlebot/i.test(val)
          } else if (key === 'disallow' && applies && val) {
            disallows.push(val)
          }
        }
      }
    } catch {
      // fail open
    }
    robotsCache.set(origin, disallows)
  }
  const path_ = new URL(targetUrl).pathname
  return !robotsCache.get(origin).some((d) => d !== '' && path_.startsWith(d))
}

// ---- Content acquisition (hybrid) ----
function feedBody(item) {
  return stripHtml(
    item['content:encoded'] || item.content || item.contentSnippet || ''
  )
}

async function fetchAndExtract(url) {
  if (!(await robotsAllows(url))) {
    console.warn(`  robots.txt disallows ${url} — skipping page fetch`)
    return ''
  }
  await hostDelay(url)
  try {
    const article = await extract(url, {}, { headers: { 'user-agent': USER_AGENT } })
    return stripHtml(article && article.content ? article.content : '')
  } catch (err) {
    console.warn(`  extract failed for ${url}: ${err.message}`)
    return ''
  }
}

// Returns { text, source } — text capped for the model.
async function acquireText(item, { forceFetch = false } = {}) {
  const body = forceFetch ? '' : feedBody(item)
  let text = body
  let source = 'feed'
  if (text.length < FEED_FULLTEXT_MIN && item.link) {
    const extracted = await fetchAndExtract(item.link)
    if (extracted.length > text.length) {
      text = extracted
      source = 'page'
    }
  }
  return { text: text.slice(0, EXTRACT_MAX_CHARS), source }
}

// ---- Summarize via Ollama (the single model-swap point) ----
const SYSTEM_PROMPT = `You are a detection-engineering editor for Babels. \
You write short, transformative summaries of security/detection-engineering \
articles. You never copy sentences verbatim from the source. \
Respond with a single JSON object only — no prose, no code fences — with keys:
  "suggestedTitle": string (concise, <= 90 chars),
  "summary": string (2-3 sentences, original wording, captures the author's key points),
  "value": string (one sentence stating the practical value/takeaway),
  "keywords": string[] (3-6 lowercase key terms),
  "tags": string[] (2-4 chosen ONLY from: ${CONTROLLED_TAGS.join(', ')}),
  "relevance": integer 1-5 (importance to a working detection engineer; 5 = essential, 1 = tangential).`

function parseJsonLoose(s) {
  try {
    return JSON.parse(s)
  } catch {
    const a = s.indexOf('{')
    const b = s.lastIndexOf('}')
    if (a !== -1 && b > a) {
      try {
        return JSON.parse(s.slice(a, b + 1))
      } catch {
        return null
      }
    }
    return null
  }
}

async function summarize({ title, sourceName, text }) {
  const user = `Source: ${sourceName || 'unknown'}
Title: ${title || 'untitled'}

Article text:
${text}`

  const res = await fetch(`${OLLAMA_ENDPOINT}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      format: 'json',
      stream: false,
      options: { temperature: 0.2 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const data = await res.json()
  const content = data && data.message ? data.message.content : ''
  const parsed = parseJsonLoose(content)
  if (!parsed || !parsed.summary || !parsed.value) {
    throw new Error('model did not return usable JSON')
  }
  const tags = Array.isArray(parsed.tags)
    ? parsed.tags.filter((t) => CONTROLLED_TAGS.includes(t))
    : []
  let relevance = parseInt(parsed.relevance, 10)
  if (!Number.isFinite(relevance)) relevance = 3
  relevance = Math.min(5, Math.max(1, relevance))
  return {
    suggestedTitle: parsed.suggestedTitle || title,
    summary: String(parsed.summary).trim(),
    value: String(parsed.value).trim(),
    keywords: Array.isArray(parsed.keywords)
      ? parsed.keywords.map((k) => String(k).trim()).filter(Boolean).slice(0, 6)
      : [],
    tags: tags.length ? tags : ['detection-engineering'],
    relevance,
  }
}

// ---- MDX emission (matches Phase 1 frontmatter contract) ----
const yamlList = (arr) => `[${(arr || []).join(', ')}]`

function buildMdx({ title, slug, date, sourceUrl, sourceName, tags, keywords, value, relevance, summary }) {
  const fm = [
    '---',
    `title: ${JSON.stringify(title)}`,
    `slug: ${slug}`,
    `date: ${date}`,
    'type: curated',
    'draft: true',
    `sourceUrl: ${sourceUrl}`,
    `sourceName: ${JSON.stringify(sourceName)}`,
    `tags: ${yamlList(tags)}`,
    `keywords: ${yamlList(keywords)}`,
    `value: ${JSON.stringify(value)}`,
    `relevance: ${relevance}`,
    '---',
    '',
    summary,
    '',
  ].join('\n')
  return fm
}

// ---- Gather candidate items ----
async function gatherFromFeeds(parser) {
  let feeds = []
  try {
    feeds = JSON.parse(fs.readFileSync(FEEDS_FILE, 'utf8'))
  } catch {
    return []
  }
  const items = []
  for (const feed of feeds) {
    try {
      const parsed = await parser.parseURL(feed.url)
      for (const it of parsed.items || []) {
        items.push({
          guid: it.guid || it.link,
          link: it.link,
          title: decodeEntities(it.title),
          isoDate: it.isoDate,
          creator: it.creator || it['dc:creator'],
          sourceName: feed.name,
          _item: it,
          forceFetch: false,
        })
      }
    } catch (err) {
      console.warn(`Feed failed (${feed.name}): ${err.message}`)
    }
  }
  return items
}

function gatherFromUrls(cliUrls) {
  const urls = [...cliUrls]
  try {
    for (const line of fs.readFileSync(URLS_FILE, 'utf8').split('\n')) {
      const u = line.trim()
      if (u && !u.startsWith('#')) urls.push(u)
    }
  } catch {
    /* no urls.txt */
  }
  return urls.map((u) => ({
    guid: u,
    link: u,
    title: null,
    isoDate: null,
    creator: null,
    sourceName: null,
    _item: {},
    forceFetch: true, // ad-hoc URLs always fetch+extract
  }))
}

// ---- Main ----
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const parser = new Parser({ headers: { 'User-Agent': USER_AGENT } })

  const processed = loadState()
  const seenUrls = existingSourceUrls()
  // Only ingest items within the freshness window (ad-hoc --url items are exempt).
  const ageCutoff = args.since || new Date(Date.now() - MAX_AGE_DAYS * 864e5)

  const candidates = [
    ...(await gatherFromFeeds(parser)),
    ...gatherFromUrls(args.urls),
  ]

  // newest first (undated ad-hoc URLs sort last)
  candidates.sort((a, b) => new Date(b.isoDate || 0) - new Date(a.isoDate || 0))

  const stats = { seen: candidates.length, created: 0, skipped: 0, failed: 0 }
  console.log(
    `Gathered ${candidates.length} candidate item(s). ` +
      `Mode: ${args.dryRun ? 'DRY RUN' : 'write'} · limit ${args.limit}\n`
  )

  for (const item of candidates) {
    if (stats.created >= args.limit) break

    const key = item.guid || item.link
    if (!item.link || !key) { stats.skipped++; continue }
    if (processed.has(key) || seenUrls.has(item.link)) { stats.skipped++; continue }
    if (item.isoDate && new Date(item.isoDate) < ageCutoff) {
      stats.skipped++
      continue
    }

    const label = item.title || item.link
    try {
      const { text, source } = await acquireText(item._item ? { ...item._item, link: item.link } : item, {
        forceFetch: item.forceFetch,
      })
      if (!text || text.length < 200) {
        console.warn(`SKIP  (too little text) — ${label}`)
        stats.skipped++
        continue
      }

      if (args.dryRun) {
        console.log(
          `PLAN  [${source}, ${text.length} chars] ${label}\n      ${item.link}`
        )
        stats.created++ // count as "would create" for the limit
        continue
      }

      const s = await summarize({
        title: item.title,
        sourceName: item.sourceName,
        text,
      })

      const title = item.title || s.suggestedTitle
      const date = ymd(item.isoDate ? new Date(item.isoDate) : new Date())
      let slug = slugify(title)
      if (!slug) slug = slugify(s.suggestedTitle) || `article-${Date.now()}`
      if (fileExistsForSlug(date, slug)) {
        console.warn(`SKIP  (file exists) — ${date}-${slug}.mdx`)
        processed.add(key)
        stats.skipped++
        continue
      }

      const mdx = buildMdx({
        title,
        slug,
        date,
        sourceUrl: item.link,
        sourceName: item.sourceName || new URL(item.link).host,
        tags: s.tags,
        keywords: s.keywords,
        value: s.value,
        relevance: s.relevance,
        summary: s.summary,
      })
      fs.writeFileSync(path.join(ARTICLES_DIR, `${date}-${slug}.mdx`), mdx)
      processed.add(key)
      stats.created++
      console.log(`DRAFT ${date}-${slug}.mdx  [${source}]  ${label}`)
    } catch (err) {
      console.warn(`FAIL  ${label}: ${err.message}`)
      stats.failed++
    }
  }

  if (!args.dryRun) saveState(processed)

  console.log(
    `\nDone. ${args.dryRun ? 'Would create' : 'Created'} ${stats.created}, ` +
      `skipped ${stats.skipped}, failed ${stats.failed}.` +
      (args.dryRun ? '' : ' Review the draft: true files, flip to draft: false, commit.')
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
