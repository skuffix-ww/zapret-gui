import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types'
import type {
  AppSettings,
  DomainList,
  DownloadProgress,
  LogEntry,
  Profile,
  RunState,
  ServiceStatus,
  UpdateInfo
} from '@shared/types'

type Unsub = () => void

const api = {
  settings: {
    get: (): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsGet),
    set: (patch: Partial<AppSettings>): Promise<AppSettings> => ipcRenderer.invoke(IPC.settingsSet, patch)
  },
  profiles: {
    list: (): Promise<Profile[]> => ipcRenderer.invoke(IPC.profilesList),
    save: (p: Profile): Promise<Profile> => ipcRenderer.invoke(IPC.profilesSave, p),
    delete: (id: string): Promise<boolean> => ipcRenderer.invoke(IPC.profilesDelete, id),
    duplicate: (id: string, name?: string): Promise<Profile> =>
      ipcRenderer.invoke(IPC.profilesDuplicate, id, name),
    importBat: (raw?: string): Promise<Profile | null> => ipcRenderer.invoke(IPC.profilesImportBat, raw),
    exportBat: (p: Profile): Promise<string | null> => ipcRenderer.invoke(IPC.profilesExportBat, p)
  },
  run: {
    start: (profileId: string): Promise<RunState> => ipcRenderer.invoke(IPC.runStart, profileId),
    stop: (): Promise<RunState> => ipcRenderer.invoke(IPC.runStop),
    state: (): Promise<RunState> => ipcRenderer.invoke(IPC.runState),
    onState: (cb: (s: RunState) => void): Unsub => {
      const listener = (_: unknown, s: RunState): void => cb(s)
      ipcRenderer.on(IPC.runStateEvent, listener)
      return () => ipcRenderer.off(IPC.runStateEvent, listener)
    }
  },
  log: {
    snapshot: (): Promise<LogEntry[]> => ipcRenderer.invoke('log:snapshot'),
    clear: (): Promise<boolean> => ipcRenderer.invoke(IPC.logClear),
    onEntry: (cb: (e: LogEntry) => void): Unsub => {
      const listener = (_: unknown, e: LogEntry): void => cb(e)
      ipcRenderer.on(IPC.logEvent, listener)
      return () => ipcRenderer.off(IPC.logEvent, listener)
    }
  },
  install: {
    download: (installPath: string): Promise<string> => ipcRenderer.invoke(IPC.downloadStart, installPath),
    cancel: (): Promise<boolean> => ipcRenderer.invoke(IPC.downloadCancel),
    validate: (path: string): Promise<{ ok: boolean; reason?: string }> =>
      ipcRenderer.invoke(IPC.installValidate, path),
    pickFolder: (title?: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC.dialogPickFolder, title),
    onProgress: (cb: (p: DownloadProgress) => void): Unsub => {
      const listener = (_: unknown, p: DownloadProgress): void => cb(p)
      ipcRenderer.on(IPC.downloadProgressEvent, listener)
      return () => ipcRenderer.off(IPC.downloadProgressEvent, listener)
    }
  },
  service: {
    status: (): Promise<ServiceStatus> => ipcRenderer.invoke(IPC.serviceStatus),
    install: (profileId: string): Promise<void> => ipcRenderer.invoke(IPC.serviceInstall, profileId),
    uninstall: (): Promise<void> => ipcRenderer.invoke(IPC.serviceUninstall),
    start: (): Promise<void> => ipcRenderer.invoke(IPC.serviceStart),
    stop: (): Promise<void> => ipcRenderer.invoke(IPC.serviceStop)
  },
  lists: {
    catalog: (): Promise<Array<Omit<DomainList, 'content'>>> => ipcRenderer.invoke(IPC.listsList),
    read: (file: string): Promise<DomainList> => ipcRenderer.invoke(IPC.listsRead, file),
    write: (file: string, content: string): Promise<boolean> =>
      ipcRenderer.invoke(IPC.listsWrite, file, content)
  },
  system: {
    openPath: (p: string): Promise<boolean> => ipcRenderer.invoke(IPC.systemOpenPath, p),
    isAdmin: (): Promise<boolean> => ipcRenderer.invoke(IPC.systemIsAdmin)
  },
  updates: {
    check: (force = false): Promise<UpdateInfo | null> =>
      ipcRenderer.invoke(IPC.updateCheck, { force }),
    remindLater: (hours = 24): Promise<AppSettings> =>
      ipcRenderer.invoke(IPC.updateRemindLater, hours),
    skip: (tag: string): Promise<AppSettings> => ipcRenderer.invoke(IPC.updateSkip, tag),
    onAvailable: (cb: (info: UpdateInfo) => void): Unsub => {
      const listener = (_: unknown, info: UpdateInfo): void => cb(info)
      ipcRenderer.on(IPC.updateAvailableEvent, listener)
      return () => ipcRenderer.off(IPC.updateAvailableEvent, listener)
    }
  },
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke('window:minimize'),
    maximize: (): Promise<void> => ipcRenderer.invoke('window:maximize'),
    close: (): Promise<void> => ipcRenderer.invoke('window:close')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ZapretApi = typeof api
declare global {
  interface Window {
    api: ZapretApi
  }
}
