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
  /** Show OS toast when a tracked game launches. */
  notifyGameLaunch: boolean
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

export interface PingTarget {
  id: string
  label: string
  host: string
  port: number
}

export interface PingAttempt {
  ok: boolean
  ms?: number
  error?: string
}

export interface PingResult {
  target: PingTarget
  attempts: PingAttempt[]
  /** Summary stats across successful attempts. */
  min: number | null
  max: number | null
  avg: number | null
  /** Success count / total attempts — fraction (0..1) that succeeded. */
  successRate: number
}

export interface Recommendation {
  id: string
  name: string
  description: string
  url: string
  /** Override for icon source. If absent, resolver falls back to favicon for `url` host. */
  iconUrl?: string
  /** Chocolatey package id, if available — enables one-click install. */
  chocoId?: string
  /** Show a red warning ribbon (e.g. piracy/closed-source). */
  warning?: string
}

export interface RecommendationCategory {
  id: string
  label: string
  /** Lucide icon name (resolved on the renderer side). */
  icon: string
  description?: string
  items: Recommendation[]
}

export interface ChocoStatus {
  installed: boolean
  version: string | null
  /** Path to choco.exe if found; null otherwise. */
  exePath: string | null
}

export type ChocoJobPhase = 'starting' | 'installing-choco' | 'installing' | 'done' | 'error'

export interface ChocoJobState {
  /** ID of the recommendation currently being installed (or '__bootstrap__' for choco itself). */
  jobId: string | null
  phase: ChocoJobPhase
  message: string
  exitCode?: number
}

export interface TweakInfo {
  id: string
  label: string
  description: string
  category: 'telemetry' | 'ads' | 'search' | 'system' | 'edge'
  warning?: string
  requiresRestart?: boolean
}

export interface TweakState {
  id: string
  applied: boolean
  appliedAt: number | null
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
  updateAvailableEvent: 'update:available',
  diagPing: 'diag:ping',
  recommendationsList: 'recommendations:list',
  recommendationsIcons: 'recommendations:icons',
  chocoStatus: 'choco:status',
  chocoInstall: 'choco:install',
  chocoInstallChoco: 'choco:install-choco',
  chocoJobEvent: 'choco:job-event',
  tweaksList: 'tweaks:list',
  tweaksState: 'tweaks:state',
  tweaksApply: 'tweaks:apply',
  tweaksRevert: 'tweaks:revert'
} as const

export type IpcChannel = (typeof IPC)[keyof typeof IPC]
