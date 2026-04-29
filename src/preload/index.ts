import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types'
import type {
  AppSettings,
  ChocoJobState,
  ChocoStatus,
  DomainList,
  DownloadProgress,
  FixState,
  GameFixInfo,
  LogEntry,
  PingResult,
  PingTarget,
  Profile,
  ProfileBenchProgress,
  ProfileBenchResult,
  RecommendationCategory,
  RunState,
  ServiceStatus,
  TweakInfo,
  TweakState,
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
  },
  diag: {
    ping: (target: PingTarget, opts?: { attempts?: number; timeoutMs?: number }): Promise<PingResult> =>
      ipcRenderer.invoke(IPC.diagPing, target, opts)
  },
  recommendations: {
    list: (): Promise<RecommendationCategory[]> => ipcRenderer.invoke(IPC.recommendationsList),
    icons: (urls: string[]): Promise<Record<string, string>> =>
      ipcRenderer.invoke(IPC.recommendationsIcons, urls)
  },
  choco: {
    status: (): Promise<ChocoStatus> => ipcRenderer.invoke(IPC.chocoStatus),
    install: (packageId: string): Promise<ChocoJobState> =>
      ipcRenderer.invoke(IPC.chocoInstall, packageId),
    installChoco: (): Promise<ChocoJobState> => ipcRenderer.invoke(IPC.chocoInstallChoco),
    onJob: (cb: (s: ChocoJobState) => void): Unsub => {
      const listener = (_: unknown, s: ChocoJobState): void => cb(s)
      ipcRenderer.on(IPC.chocoJobEvent, listener)
      return () => ipcRenderer.off(IPC.chocoJobEvent, listener)
    }
  },
  tweaks: {
    list: (): Promise<TweakInfo[]> => ipcRenderer.invoke(IPC.tweaksList),
    state: (): Promise<TweakState[]> => ipcRenderer.invoke(IPC.tweaksState),
    apply: (id: string): Promise<TweakState> => ipcRenderer.invoke(IPC.tweaksApply, id),
    revert: (id: string): Promise<TweakState> => ipcRenderer.invoke(IPC.tweaksRevert, id)
  },
  fixes: {
    list: (): Promise<Array<GameFixInfo & FixState>> => ipcRenderer.invoke(IPC.fixesList),
    apply: (id: string): Promise<FixState> => ipcRenderer.invoke(IPC.fixesApply, id),
    revert: (id: string): Promise<FixState> => ipcRenderer.invoke(IPC.fixesRevert, id)
  },
  bench: {
    start: (profileIds?: string[]): Promise<boolean> => ipcRenderer.invoke(IPC.benchStart, profileIds),
    cancel: (): Promise<boolean> => ipcRenderer.invoke(IPC.benchCancel),
    onProgress: (cb: (p: ProfileBenchProgress) => void): Unsub => {
      const listener = (_: unknown, p: ProfileBenchProgress): void => cb(p)
      ipcRenderer.on(IPC.benchProgressEvent, listener)
      return () => ipcRenderer.off(IPC.benchProgressEvent, listener)
    },
    onResult: (cb: (r: ProfileBenchResult) => void): Unsub => {
      const listener = (_: unknown, r: ProfileBenchResult): void => cb(r)
      ipcRenderer.on(IPC.benchResultEvent, listener)
      return () => ipcRenderer.off(IPC.benchResultEvent, listener)
    },
    onDone: (cb: (d: { cancelled: boolean; error?: string }) => void): Unsub => {
      const listener = (_: unknown, d: { cancelled: boolean; error?: string }): void => cb(d)
      ipcRenderer.on(IPC.benchDoneEvent, listener)
      return () => ipcRenderer.off(IPC.benchDoneEvent, listener)
    }
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ZapretApi = typeof api
declare global {
  interface Window {
    api: ZapretApi
  }
}
