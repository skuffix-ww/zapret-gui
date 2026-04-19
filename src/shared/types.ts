export interface StrategySection {
  /** Human-readable label generated from filters; editable by user. */
  label: string
  /** Raw --flag arguments for this section (without the trailing --new). */
  args: ArgEntry[]
  /** If true, this section is disabled and excluded from the final command. */
  disabled?: boolean
}

export interface ArgEntry {
  /** Argument name without leading dashes, e.g. "dpi-desync". */
  name: string
  /** Argument value (may be empty for boolean flags). */
  value: string
}

export interface Profile {
  id: string
  name: string
  /** True for read-only built-in profiles. User copies them before editing. */
  builtin?: boolean
  description?: string
  /** Global flags that precede the first --new section (e.g. --wf-tcp, --wf-udp). */
  globalArgs: ArgEntry[]
  sections: StrategySection[]
  updatedAt: number
}

export interface AppSettings {
  /** Absolute path to zapret install dir (contains bin/ and lists/). */
  installPath: string | null
  /** Last selected profile id. */
  activeProfileId: string | null
  /** Service name used when installing the Windows service. */
  serviceName: string
  /** Auto-start winws on app launch. */
  autoStart: boolean
  /** Theme accent (not wired to anything server-side; for UI personalization). */
  accent: string
  /** Minimize to tray on close. */
  minimizeToTray: boolean
  /** Custom GameFilterTCP/UDP replacements (Flowseal service.bat logic). */
  gameFilterTcp: string
  gameFilterUdp: string
  /** GitHub release tag of the currently installed zapret payload. */
  installedReleaseTag: string | null
  /** Epoch ms; if set and > Date.now(), auto-check is suppressed until that time. */
  updateRemindAt: number | null
  /** Tag the user explicitly declined — don't nag about it again. */
  updateSkippedTag: string | null
  /** Master toggle for auto-checking on startup. */
  autoCheckUpdates: boolean
}

export type RunState =
  | { status: 'stopped' }
  | { status: 'starting' }
  | { status: 'running'; pid: number; since: number }
  | { status: 'stopping' }
  | { status: 'crashed'; code: number | null; at: number }

export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'stdout' | 'stderr'

export interface LogEntry {
  id: number
  ts: number
  level: LogLevel
  message: string
}

export interface DownloadProgress {
  phase: 'idle' | 'fetching-release' | 'downloading' | 'extracting' | 'done' | 'error'
  bytesDone: number
  bytesTotal: number
  message: string
  releaseTag?: string
}

export interface UpdateInfo {
  currentTag: string | null
  latestTag: string
  hasUpdate: boolean
  publishedAt: string | null
  htmlUrl: string | null
  body: string | null
}

export interface ServiceStatus {
  exists: boolean
  running: boolean
  startType?: 'auto' | 'demand' | 'disabled' | 'unknown'
  raw?: string
}

export interface DomainList {
  /** Filename under lists/, e.g. "list-general-user.txt". */
  file: string
  /** Human label. */
  label: string
  /** Whether this list is writable (user lists are, upstream lists aren't). */
  editable: boolean
  content: string
}

export const IPC = {
  settingsGet: 'settings:get',
  settingsSet: 'settings:set',
  profilesList: 'profiles:list',
  profilesSave: 'profiles:save',
  profilesDelete: 'profiles:delete',
  profilesDuplicate: 'profiles:duplicate',
  profilesImportBat: 'profiles:import-bat',
  profilesExportBat: 'profiles:export-bat',
  runStart: 'run:start',
  runStop: 'run:stop',
  runState: 'run:state',
  runStateEvent: 'run:state-event',
  logEvent: 'log:event',
  logClear: 'log:clear',
  downloadStart: 'download:start',
  downloadProgressEvent: 'download:progress',
  downloadCancel: 'download:cancel',
  dialogPickFolder: 'dialog:pick-folder',
  installValidate: 'install:validate',
  serviceStatus: 'service:status',
  serviceInstall: 'service:install',
  serviceUninstall: 'service:uninstall',
  serviceStart: 'service:start',
  serviceStop: 'service:stop',
  listsList: 'lists:list',
  listsRead: 'lists:read',
  listsWrite: 'lists:write',
  systemOpenPath: 'system:open-path',
  systemIsAdmin: 'system:is-admin',
  updateCheck: 'update:check',
  updateRemindLater: 'update:remind-later',
  updateSkip: 'update:skip',
  updateAvailableEvent: 'update:available'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
