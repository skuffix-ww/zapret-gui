import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { join } from 'node:path'
import { IPC } from '@shared/types'
import { registerIpc, broadcast } from './ipc'
import { logger } from './logger'
import { runner } from './runner'
import { downloader } from './downloader'
import { checkForUpdate } from './updater'
import { getSettings } from './settings'
import { migrateLegacyUserData } from './migrate'
import { chocoJobs } from './choco'
import { startGameWatcher, stopGameWatcher } from './gameWatcher'
import { profileBench } from './profileBench'

let mainWindow: BrowserWindow | null = null

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 960,
    minHeight: 640,
    show: false,
    icon: join(__dirname, '../../icon.ico'),
    backgroundColor: '#0b0d10',
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

function wireEvents(win: BrowserWindow): void {
  logger.on('entry', (entry) => broadcast(win, IPC.logEvent, entry))
  runner.on('state', (s) => broadcast(win, IPC.runStateEvent, s))
  downloader.on('progress', (p) => broadcast(win, IPC.downloadProgressEvent, p))
  chocoJobs.on('state', (s) => broadcast(win, IPC.chocoJobEvent, s))
  profileBench.on('progress', (p) => broadcast(win, IPC.benchProgressEvent, p))
  profileBench.on('result', (r) => broadcast(win, IPC.benchResultEvent, r))
  profileBench.on('done', (d) => broadcast(win, IPC.benchDoneEvent, d))
}

app.whenReady().then(() => {
  app.setAppUserModelId('dev.unlimit.app')
  try { migrateLegacyUserData() } catch { /* migration is best-effort */ }
  registerIpc()
  mainWindow = createWindow()
  wireEvents(mainWindow)
  scheduleBackgroundUpdateCheck(mainWindow)
  startGameWatcher(mainWindow)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createWindow()
      wireEvents(mainWindow)
      scheduleBackgroundUpdateCheck(mainWindow)
      startGameWatcher(mainWindow)
    }
  })
})

function scheduleBackgroundUpdateCheck(win: BrowserWindow): void {
  // Run once ~2s after window mount so it doesn't block startup paint,
  // then re-check every 6 hours while the app stays open.
  const check = async (): Promise<void> => {
    const s = getSettings()
    if (!s.installPath || !s.autoCheckUpdates) return
    const info = await checkForUpdate().catch(() => null)
    if (info?.hasUpdate && !win.isDestroyed()) {
      broadcast(win, IPC.updateAvailableEvent, info)
    }
  }
  setTimeout(() => { void check() }, 2000)
  setInterval(() => { void check() }, 6 * 60 * 60 * 1000)
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  try { runner.stop() } catch { /* ignore */ }
  try { stopGameWatcher() } catch { /* ignore */ }
})

// Window control IPC (custom titlebar buttons).
ipcMain.handle('window:minimize', () => mainWindow?.minimize())
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return
  if (mainWindow.isMaximized()) mainWindow.unmaximize()
  else mainWindow.maximize()
})
ipcMain.handle('window:close', () => mainWindow?.close())
