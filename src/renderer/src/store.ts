import { create } from 'zustand'
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

type Route = 'home' | 'editor' | 'lists' | 'settings' | 'service' | 'setup' | 'diagnostics'

interface State {
  route: Route
  settings: AppSettings | null
  profiles: Profile[]
  activeProfileId: string | null
  editingProfileId: string | null
  runState: RunState
  logs: LogEntry[]
  serviceStatus: ServiceStatus | null
  download: DownloadProgress
  listsCatalog: Array<Omit<DomainList, 'content'>>
  isAdmin: boolean
  updatePrompt: UpdateInfo | null
  updateChecking: boolean
  updateInstalling: boolean
  setRoute(r: Route): void
  bootstrap(): Promise<void>
  refreshProfiles(): Promise<void>
  setActive(id: string): void
  openEditor(id: string): void
  saveProfile(p: Profile): Promise<Profile>
  deleteProfile(id: string): Promise<void>
  duplicateProfile(id: string, name?: string): Promise<Profile>
  start(): Promise<void>
  stop(): Promise<void>
  clearLogs(): Promise<void>
  setSettings(patch: Partial<AppSettings>): Promise<void>
  download$Start(path: string): Promise<void>
  refreshServiceStatus(): Promise<void>
  appendLog(e: LogEntry): void
  setRunState(s: RunState): void
  setDownload(p: DownloadProgress): void
  checkUpdates(force?: boolean): Promise<UpdateInfo | null>
  dismissUpdate(): void
  remindLater(hours?: number): Promise<void>
  skipCurrentUpdate(): Promise<void>
  installUpdate(): Promise<void>
}

export const useApp = create<State>((set, get) => ({
  route: 'home',
  settings: null,
  profiles: [],
  activeProfileId: null,
  editingProfileId: null,
  runState: { status: 'stopped' },
  logs: [],
  serviceStatus: null,
  download: { phase: 'idle', bytesDone: 0, bytesTotal: 0, message: '' },
  listsCatalog: [],
  isAdmin: false,
  updatePrompt: null,
  updateChecking: false,
  updateInstalling: false,

  setRoute: (route) => set({ route }),

  bootstrap: async () => {
    const [settings, profiles, runState, logs, listsCatalog, serviceStatus, isAdmin] = await Promise.all([
      window.api.settings.get(),
      window.api.profiles.list(),
      window.api.run.state(),
      window.api.log.snapshot(),
      window.api.lists.catalog(),
      window.api.service.status().catch(() => null),
      window.api.system.isAdmin()
    ])
    const activeId = settings.activeProfileId ?? profiles[0]?.id ?? null
    const firstRun = !settings.installPath
    set({
      settings,
      profiles,
      activeProfileId: activeId,
      runState,
      logs,
      listsCatalog,
      serviceStatus,
      isAdmin,
      route: firstRun ? 'setup' : 'home'
    })
    window.api.run.onState((s) => set({ runState: s }))
    window.api.log.onEntry((e) => {
      const logs = [...get().logs, e]
      if (logs.length > 2000) logs.splice(0, logs.length - 2000)
      set({ logs })
    })
    window.api.install.onProgress((p) => set({ download: p }))
    window.api.updates.onAvailable((info) => set({ updatePrompt: info }))
  },

  refreshProfiles: async () => set({ profiles: await window.api.profiles.list() }),

  setActive: (id) => {
    set({ activeProfileId: id })
    void window.api.settings.set({ activeProfileId: id }).then((s) => set({ settings: s }))
  },

  openEditor: (id) => set({ editingProfileId: id, route: 'editor' }),

  saveProfile: async (p) => {
    const saved = await window.api.profiles.save(p)
    await get().refreshProfiles()
    set({ editingProfileId: saved.id, activeProfileId: saved.id })
    return saved
  },

  deleteProfile: async (id) => {
    await window.api.profiles.delete(id)
    const profiles = await window.api.profiles.list()
    const active = get().activeProfileId === id ? (profiles[0]?.id ?? null) : get().activeProfileId
    set({ profiles, activeProfileId: active, editingProfileId: null })
  },

  duplicateProfile: async (id, name) => {
    const copy = await window.api.profiles.duplicate(id, name)
    await get().refreshProfiles()
    set({ activeProfileId: copy.id })
    return copy
  },

  start: async () => {
    const id = get().activeProfileId
    if (!id) throw new Error('Выберите профиль')
    const s = await window.api.run.start(id)
    set({ runState: s })
  },

  stop: async () => {
    const s = await window.api.run.stop()
    set({ runState: s })
  },

  clearLogs: async () => {
    await window.api.log.clear()
    set({ logs: [] })
  },

  setSettings: async (patch) => {
    const settings = await window.api.settings.set(patch)
    set({ settings })
  },

  download$Start: async (path) => {
    await window.api.install.download(path)
    const settings = await window.api.settings.set({ installPath: path })
    set({ settings })
  },

  refreshServiceStatus: async () => {
    try {
      set({ serviceStatus: await window.api.service.status() })
    } catch {
      /* ignore */
    }
  },

  appendLog: (e) => set({ logs: [...get().logs, e] }),
  setRunState: (s) => set({ runState: s }),
  setDownload: (p) => set({ download: p }),

  checkUpdates: async (force = false) => {
    set({ updateChecking: true })
    try {
      const info = await window.api.updates.check(force)
      if (info) set({ updatePrompt: info })
      return info
    } finally {
      set({ updateChecking: false })
    }
  },

  dismissUpdate: () => set({ updatePrompt: null }),

  remindLater: async (hours = 24) => {
    await window.api.updates.remindLater(hours)
    set({ updatePrompt: null })
  },

  skipCurrentUpdate: async () => {
    const p = get().updatePrompt
    if (!p) return
    await window.api.updates.skip(p.latestTag)
    set({ updatePrompt: null })
  },

  installUpdate: async () => {
    const settings = get().settings
    if (!settings?.installPath) return
    set({ updateInstalling: true, updatePrompt: null })
    try {
      await window.api.install.download(settings.installPath)
      const fresh = await window.api.settings.get()
      set({ settings: fresh })
    } finally {
      set({ updateInstalling: false })
    }
  }
}))
