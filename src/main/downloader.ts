import { EventEmitter } from 'node:events'
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { randomBytes } from 'node:crypto'
import { request } from 'node:https'
import type { IncomingMessage } from 'node:http'
import AdmZip from 'adm-zip'
import { logger } from './logger'
import { updateSettings } from './settings'
import type { DownloadProgress } from '@shared/types'

const RELEASES_API = 'https://api.github.com/repos/Flowseal/zapret-discord-youtube/releases/latest'

class Downloader extends EventEmitter {
  private currentAbort: AbortController | null = null

  onProgress(cb: (p: DownloadProgress) => void): () => void {
    this.on('progress', cb)
    return () => this.off('progress', cb)
  }

  private emitProgress(p: DownloadProgress): void {
    this.emit('progress', p)
  }

  cancel(): void {
    this.currentAbort?.abort()
    this.currentAbort = null
  }

  /**
   * Download the latest Flowseal release zip and extract bin/ and lists/
   * into `installPath`. Resolves with the installPath on success.
   */
  async downloadAndInstall(installPath: string): Promise<string> {
    const ctl = new AbortController()
    this.currentAbort = ctl
    try {
      this.emitProgress({ phase: 'fetching-release', bytesDone: 0, bytesTotal: 0, message: 'Получаю информацию о последнем релизе…' })
      const releaseInfo = await fetchJson(RELEASES_API, ctl.signal)
      const tag = String(releaseInfo.tag_name ?? 'latest')
      const assets = (releaseInfo.assets ?? []) as Array<{ name: string; browser_download_url: string; size: number }>
      const asset = assets.find((a) => /\.zip$/i.test(a.name)) ?? null
      const zipUrl =
        asset?.browser_download_url ??
        (typeof releaseInfo.zipball_url === 'string'
          ? releaseInfo.zipball_url
          : `https://github.com/Flowseal/zapret-discord-youtube/archive/refs/tags/${encodeURIComponent(tag)}.zip`)

      logger.info(`Flowseal релиз ${tag}, скачиваю ${zipUrl}`)
      const tmpZip = join(tmpdir(), `zapret-${randomBytes(4).toString('hex')}.zip`)

      this.emitProgress({
        phase: 'downloading',
        bytesDone: 0,
        bytesTotal: asset?.size ?? 0,
        message: 'Скачиваю архив…',
        releaseTag: tag
      })
      await downloadFile(zipUrl, tmpZip, ctl.signal, (done, total) => {
        this.emitProgress({
          phase: 'downloading',
          bytesDone: done,
          bytesTotal: total || asset?.size || 0,
          message: `Скачиваю архив… ${formatBytes(done)} / ${formatBytes(total || asset?.size || 0)}`,
          releaseTag: tag
        })
      })

      this.emitProgress({ phase: 'extracting', bytesDone: 0, bytesTotal: 0, message: 'Распаковываю…', releaseTag: tag })
      extractZapretPayload(tmpZip, installPath)

      try { rmSync(tmpZip, { force: true }) } catch { /* ignore */ }

      // Persist the installed tag so the updater can diff later and so we clear
      // any stale "remind later" / "skipped" markers from a previous version.
      updateSettings({ installedReleaseTag: tag, updateRemindAt: null, updateSkippedTag: null })

      this.emitProgress({
        phase: 'done',
        bytesDone: 0,
        bytesTotal: 0,
        message: `Готово. Установлено в ${installPath}`,
        releaseTag: tag
      })
      logger.info(`Zapret установлен в ${installPath} (релиз ${tag})`)
      return installPath
    } catch (e) {
      const msg = (e as Error).message
      logger.error(`Установка не удалась: ${msg}`)
      this.emitProgress({ phase: 'error', bytesDone: 0, bytesTotal: 0, message: msg })
      throw e
    } finally {
      this.currentAbort = null
    }
  }
}

export const downloader = new Downloader()

/** Validate that `installPath` has bin/winws.exe and lists/ — used when user picks an existing folder. */
export function validateInstall(installPath: string): { ok: boolean; reason?: string } {
  if (!installPath) return { ok: false, reason: 'Путь не выбран' }
  if (!existsSync(installPath)) return { ok: false, reason: 'Папка не существует' }
  const winws = join(installPath, 'bin', 'winws.exe')
  if (!existsSync(winws)) return { ok: false, reason: 'Не найден bin/winws.exe' }
  const lists = join(installPath, 'lists')
  if (!existsSync(lists)) return { ok: false, reason: 'Не найдена папка lists/' }
  return { ok: true }
}

function fetchJson(url: string, signal: AbortSignal, depth = 0): Promise<any> {
  return new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'zapret-electron',
          Accept: 'application/vnd.github+json'
        },
        signal
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 5) {
          res.resume()
          fetchJson(res.headers.location, signal, depth + 1).then(resolvePromise).catch(reject)
          return
        }
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} при запросе ${url}`))
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
    req.on('error', reject)
    req.end()
  })
}

function downloadFile(
  url: string,
  destPath: string,
  signal: AbortSignal,
  onProgress: (done: number, total: number) => void,
  depth = 0
): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const req = request(
      url,
      {
        method: 'GET',
        headers: { 'User-Agent': 'zapret-electron' },
        signal
      },
      (res: IncomingMessage) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && depth < 5) {
          res.resume()
          downloadFile(res.headers.location, destPath, signal, onProgress, depth + 1).then(resolvePromise).catch(reject)
          return
        }
        if (!res.statusCode || res.statusCode >= 400) {
          res.resume()
          reject(new Error(`HTTP ${res.statusCode} при скачивании ${url}`))
          return
        }
        const total = Number(res.headers['content-length'] ?? 0)
        let done = 0
        const file = createWriteStream(destPath)
        res.on('data', (chunk: Buffer) => {
          done += chunk.length
          onProgress(done, total)
        })
        res.pipe(file)
        file.on('finish', () => file.close(() => resolvePromise()))
        file.on('error', reject)
        res.on('error', reject)
      }
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * Extract the zip into `installPath`, detecting the top-level folder
 * (GitHub zipballs nest content inside `<repo>-<sha>/`). We copy
 * everything from that root into the chosen install folder.
 */
function extractZapretPayload(zipPath: string, installPath: string): void {
  if (!existsSync(installPath)) mkdirSync(installPath, { recursive: true })
  const zip = new AdmZip(zipPath)
  const entries = zip.getEntries()
  if (entries.length === 0) throw new Error('Архив пустой')

  const first = entries[0]!.entryName
  const sep = first.indexOf('/')
  const topDir = sep > 0 ? first.slice(0, sep + 1) : ''
  const allHaveTop = topDir.length > 0 && entries.every((e) => e.entryName.startsWith(topDir))

  for (const entry of entries) {
    const rel = allHaveTop ? entry.entryName.slice(topDir.length) : entry.entryName
    if (!rel) continue
    const outPath = resolve(installPath, rel)
    if (!outPath.startsWith(resolve(installPath))) continue // zip-slip guard
    if (entry.isDirectory) {
      mkdirSync(outPath, { recursive: true })
    } else {
      mkdirSync(resolve(outPath, '..'), { recursive: true })
      zip.extractEntryTo(entry, resolve(outPath, '..'), /*maintainEntryPath*/ false, /*overwrite*/ true)
    }
  }

  // Sanity check
  const winws = join(installPath, 'bin', 'winws.exe')
  if (!existsSync(winws)) {
    // Some releases may not include bin/ — warn loudly but don't bail.
    logger.warn('После распаковки не найден bin/winws.exe. Проверьте содержимое архива.')
  } else {
    const sz = statSync(winws).size
    logger.info(`winws.exe ${formatBytes(sz)}`)
  }
  // Log what was extracted
  try {
    const top = readdirSync(installPath)
    logger.info(`Распаковано: ${top.slice(0, 20).join(', ')}${top.length > 20 ? ' …' : ''}`)
  } catch { /* ignore */ }
}

function formatBytes(n: number): string {
  if (!n) return '0 Б'
  if (n < 1024) return `${n} Б`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} КБ`
  return `${(n / 1024 / 1024).toFixed(1)} МБ`
}
