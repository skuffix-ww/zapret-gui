import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
import { logger } from './logger'

const TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const REQUEST_TIMEOUT_MS = 8000

let cacheDirCached: string | null = null

function cacheDir(): string {
  if (cacheDirCached) return cacheDirCached
  const dir = join(app.getPath('userData'), 'icon-cache')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  cacheDirCached = dir
  return dir
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

function keyFor(host: string): string {
  return createHash('sha1').update(host).digest('hex').slice(0, 16)
}

interface CachedIcon {
  contentType: string
  base64: string
}

async function fetchBuffer(url: string): Promise<{ buf: Buffer; contentType: string } | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'unlimit', 'Accept': 'image/*' },
      redirect: 'follow'
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/x-icon'
    if (!contentType.startsWith('image/')) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.byteLength === 0 || buf.byteLength > 512 * 1024) return null
    return { buf, contentType }
  } catch {
    return null
  }
}

async function resolveOne(url: string): Promise<CachedIcon | null> {
  const host = hostOf(url)
  if (!host) return null

  const file = join(cacheDir(), `${keyFor(host)}.json`)
  if (existsSync(file)) {
    try {
      const stat = statSync(file)
      if (Date.now() - stat.mtimeMs < TTL_MS) {
        return JSON.parse(readFileSync(file, 'utf8')) as CachedIcon
      }
    } catch {
      /* fall through to refetch */
    }
  }

  // DuckDuckGo proxy is reliable, served via Cloudflare, returns ICO/PNG.
  // Fallback to Google's favicon service if DDG fails.
  const sources = [
    `https://icons.duckduckgo.com/ip3/${host}.ico`,
    `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  ]

  for (const src of sources) {
    const r = await fetchBuffer(src)
    if (!r) continue
    const cached: CachedIcon = {
      contentType: r.contentType,
      base64: r.buf.toString('base64')
    }
    try {
      writeFileSync(file, JSON.stringify(cached), 'utf8')
    } catch (e) {
      logger.warn(`icon-cache: write failed for ${host}: ${(e as Error).message}`)
    }
    return cached
  }
  return null
}

function toDataUrl(c: CachedIcon): string {
  return `data:${c.contentType};base64,${c.base64}`
}

export async function resolveIcons(urls: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {}
  // Resolve in parallel with a soft cap so we don't hammer DDG with 50 sockets.
  const queue = [...urls]
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const url = queue.shift()
      if (!url) break
      const c = await resolveOne(url)
      if (c) out[url] = toDataUrl(c)
    }
  })
  await Promise.all(workers)
  return out
}
