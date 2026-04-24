import type {
  AppSettings,
  DomainList,
  DownloadProgress,
  LogEntry,
  PingResult,
  PingTarget,
  Profile,
  RunState,
  ServiceStatus,
  UpdateInfo
} from '@shared/types'

type Unsub = () => void

interface ZapretApi {
  settings: {
    get: () => Promise<AppSettings>
    set: (patch: Partial<AppSettings>) => Promise<AppSettings>
  }
  profiles: {
    list: () => Promise<Profile[]>
    save: (p: Profile) => Promise<Profile>
    delete: (id: string) => Promise<boolean>
    duplicate: (id: string, name?: string) => Promise<Profile>
    importBat: (raw?: string) => Promise<Profile | null>
    exportBat: (p: Profile) => Promise<string | null>
  }
  run: {
    start: (profileId: string) => Promise<RunState>
    stop: () => Promise<RunState>
    state: () => Promise<RunState>
    onState: (cb: (s: RunState) => void) => Unsub
  }
  log: {
    snapshot: () => Promise<LogEntry[]>
    clear: () => Promise<boolean>
    onEntry: (cb: (e: LogEntry) => void) => Unsub
  }
  install: {
    download: (installPath: string) => Promise<string>
    cancel: () => Promise<boolean>
    validate: (path: string) => Promise<{ ok: boolean; reason?: string }>
    pickFolder: (title?: string) => Promise<string | null>
    onProgress: (cb: (p: DownloadProgress) => void) => Unsub
  }
  service: {
    status: () => Promise<ServiceStatus>
    install: (profileId: string) => Promise<void>
    uninstall: () => Promise<void>
    start: () => Promise<void>
    stop: () => Promise<void>
  }
  lists: {
    catalog: () => Promise<Array<Omit<DomainList, 'content'>>>
    read: (file: string) => Promise<DomainList>
    write: (file: string, content: string) => Promise<boolean>
  }
  system: {
    openPath: (p: string) => Promise<boolean>
    isAdmin: () => Promise<boolean>
  }
  updates: {
    check: (force?: boolean) => Promise<UpdateInfo | null>
    remindLater: (hours?: number) => Promise<AppSettings>
    skip: (tag: string) => Promise<AppSettings>
    onAvailable: (cb: (info: UpdateInfo) => void) => Unsub
  }
  window: {
    minimize: () => Promise<void>
    maximize: () => Promise<void>
    close: () => Promise<void>
  }
  diag: {
    ping: (target: PingTarget, opts?: { attempts?: number; timeoutMs?: number }) => Promise<PingResult>
  }
}

declare global {
  interface Window {
    api: ZapretApi
  }
}
