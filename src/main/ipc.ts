import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { IPC } from '@shared/types'
import type { AppSettings, Profile } from '@shared/types'
import { getSettings, updateSettings } from './settings'
import {
  deleteProfile,
  duplicateProfile,
  importFromBat,
  listProfiles,
  saveProfile
} from './profiles'
import { runner } from './runner'
import { logger } from './logger'
import { downloader, validateInstall } from './downloader'
import {
  installService,
  queryService,
  startService,
  stopService,
  uninstallService
} from './service'
import * as lists from './lists'
import { buildBat } from '@shared/bat-parser'
import { checkForUpdate } from './updater'

function remindLater(ms: number): AppSettings {
  return updateSettings({ updateRemindAt: Date.now() + ms })
}
function skipTag(tag: string): AppSettings {
  return updateSettings({ updateSkippedTag: tag, updateRemindAt: null })
}

export function registerIpc(): void {
  // ---------- settings ----------
  ipcMain.handle(IPC.settingsGet, () => getSettings())
  ipcMain.handle(IPC.settingsSet, (_e, patch) => updateSettings(patch))

  // ---------- profiles ----------
  ipcMain.handle(IPC.profilesList, () => listProfiles())
  ipcMain.handle(IPC.profilesSave, (_e, profile: Profile) => saveProfile(profile))
  ipcMain.handle(IPC.profilesDelete, (_e, id: string) => {
    deleteProfile(id)
    return true
  })
  ipcMain.handle(IPC.profilesDuplicate, (_e, id: string, name?: string) => duplicateProfile(id, name))
  ipcMain.handle(IPC.profilesImportBat, async (e, raw?: string) => {
    let content = raw
    let suggested = 'Импортированный'
    if (!content) {
      const win = BrowserWindow.fromWebContents(e.sender)
      const r = await dialog.showOpenDialog(win ?? undefined!, {
        title: 'Импорт .bat',
        filters: [{ name: 'Batch', extensions: ['bat', 'cmd'] }],
        properties: ['openFile']
      })
      if (r.canceled || !r.filePaths[0]) return null
      const path = r.filePaths[0]
      suggested = path.replace(/^.*[\\/]/, '').replace(/\.(bat|cmd)$/i, '')
      content = readFileSync(path, 'utf8')
    }
    return importFromBat(content, suggested)
  })
  ipcMain.handle(IPC.profilesExportBat, async (e, profile: Profile) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const r = await dialog.showSaveDialog(win ?? undefined!, {
      title: 'Экспорт .bat',
      defaultPath: `${profile.name}.bat`,
      filters: [{ name: 'Batch', extensions: ['bat'] }]
    })
    if (r.canceled || !r.filePath) return null
    const content = buildBat(profile)
    writeFileSync(r.filePath, content, 'utf8')
    return r.filePath
  })

  // ---------- run ----------
  ipcMain.handle(IPC.runStart, (_e, profileId: string) => {
    const p = listProfiles().find((p) => p.id === profileId)
    if (!p) throw new Error('Профиль не найден')
    runner.start(p)
    return runner.getState()
  })
  ipcMain.handle(IPC.runStop, () => {
    runner.stop()
    return runner.getState()
  })
  ipcMain.handle(IPC.runState, () => runner.getState())

  // ---------- logs ----------
  ipcMain.handle('log:snapshot', () => logger.snapshot())
  ipcMain.handle(IPC.logClear, () => {
    logger.clear()
    return true
  })

  // ---------- download & install ----------
  ipcMain.handle(IPC.downloadStart, async (_e, installPath: string) => {
    if (!installPath) throw new Error('Укажите папку установки')
    return downloader.downloadAndInstall(installPath)
  })
  ipcMain.handle(IPC.downloadCancel, () => {
    downloader.cancel()
    return true
  })
  ipcMain.handle(IPC.installValidate, (_e, installPath: string) => validateInstall(installPath))

  // ---------- dialog ----------
  ipcMain.handle(IPC.dialogPickFolder, async (e, title?: string) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    const r = await dialog.showOpenDialog(win ?? undefined!, {
      title: title ?? 'Выберите папку',
      properties: ['openDirectory', 'createDirectory']
    })
    if (r.canceled || !r.filePaths[0]) return null
    return r.filePaths[0]
  })

  // ---------- service ----------
  ipcMain.handle(IPC.serviceStatus, () => queryService())
  ipcMain.handle(IPC.serviceInstall, (_e, profileId: string) => {
    const p = listProfiles().find((p) => p.id === profileId)
    if (!p) throw new Error('Профиль не найден')
    return installService(p)
  })
  ipcMain.handle(IPC.serviceUninstall, () => uninstallService())
  ipcMain.handle(IPC.serviceStart, () => startService())
  ipcMain.handle(IPC.serviceStop, () => stopService())

  // ---------- lists ----------
  ipcMain.handle(IPC.listsList, () => lists.catalog())
  ipcMain.handle(IPC.listsRead, (_e, file: string) => lists.read(file))
  ipcMain.handle(IPC.listsWrite, (_e, file: string, content: string) => {
    lists.write(file, content)
    return true
  })

  // ---------- system ----------
  ipcMain.handle(IPC.systemOpenPath, (_e, p: string) => {
    if (!p || !existsSync(p)) return false
    shell.openPath(p)
    return true
  })
  // ---------- updates ----------
  ipcMain.handle(IPC.updateCheck, (_e, opts?: { force?: boolean }) => checkForUpdate(opts ?? {}))
  ipcMain.handle(IPC.updateRemindLater, (_e, hours = 24) => {
    const ms = Math.max(1, Number(hours)) * 60 * 60 * 1000
    return remindLater(ms)
  })
  ipcMain.handle(IPC.updateSkip, (_e, tag: string) => skipTag(tag))

  ipcMain.handle(IPC.systemIsAdmin, async () => {
    if (process.platform !== 'win32') return false
    return new Promise<boolean>((resolve) => {
      try {
        execFile('net.exe', ['session'], { windowsHide: true }, (err) => resolve(!err))
      } catch {
        resolve(false)
      }
    })
  })
}

export function broadcast(window: BrowserWindow, channel: string, payload: unknown): void {
  if (!window.isDestroyed()) window.webContents.send(channel, payload)
}
