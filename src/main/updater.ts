import { request } from 'node:https'
import type { UpdateInfo } from '@shared/types'
import { logger } from './logger'
import { getSettings } from './settings'

const RELEASES_API = 'https://api.github.com/repos/Flowseal/zapret-discord-youtube/releases/latest'
const CHECK_TIMEOUT = 8000

export interface CheckOptions {
  /** Skip `updateRemindAt` / `updateSkippedTag` filters (manual checks from UI). */
  force?: boolean
}

/**
 * Hit GitHub for latest release; compare to `installedReleaseTag` from settings.
 * Returns null if we should stay silent (auto-check disabled, throttled, or
 * network failure). `force: true` bypasses silencing.
 */
export async function checkForUpdate(opts: CheckOptions = {}): Promise<UpdateInfo | null> {
  const s = getSettings()
  if (!opts.force) {
    if (!s.autoCheckUpdates) return null
    if (s.updateRemindAt && Date.now() < s.updateRemindAt) return null
  }
  try {
    const info = await fetchLatest()
    const latestTag = String(info.tag_name ?? '')
    if (!latestTag) return null
    const current = s.installedReleaseTag
    const hasUpdate = !!current && normalize(current) !== normalize(latestTag)
    if (!opts.force && s.updateSkippedTag && normalize(s.updateSkippedTag) === normalize(latestTag)) {
      return null
    }
    return {
      currentTag: current,
      latestTag,
      hasUpdate,
      publishedAt: info.published_at ?? null,
      htmlUrl: info.html_url ?? null,
      body: typeof info.body === 'string' ? info.body : null
    }
  } catch (e) {
    logger.warn(`Не удалось проверить обновления: ${(e as Error).message}`)
    return null
  }
}

function normalize(tag: string): string {
  return tag.trim().replace(/^v/i, '').toLowerCase()
}

function fetchLatest(depth = 0, url = RELEASES_API): Promise<any> {
  return new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'unlimit', Accept: 'application/vnd.github+json' },
        timeout: CHECK_TIMEOUT
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 5) {
          res.resume()
          fetchLatest(depth + 1, res.headers.location).then(resolvePromise).catch(reject)
          return
        }
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode}`))
          return
        }
        const chunks: Buffer[] = []
        res.on('data', (c) => chunks.push(c as Buffer))
        res.on('end', () => {
          try {
            resolvePromise(JSON.parse(Buffer.concat(chunks).toString('utf8')))
          } catch (err) {
            reject(err)
          }
        })
        res.on('error', reject)
      }
    )
    req.on('timeout', () => req.destroy(new Error('timeout')))
    req.on('error', reject)
    req.end()
  })
}
