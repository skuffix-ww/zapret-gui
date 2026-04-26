import Store from 'electron-store'
import type { AppSettings } from '@shared/types'

const DEFAULTS: AppSettings = {
  installPath: null,
  activeProfileId: null,
  serviceName: 'unlimit',
  autoStart: false,
  accent: '#6d8aff',
  minimizeToTray: false,
  // These mirror Flowseal's service.bat load_game_filter defaults.
  gameFilterTcp: '1024-65535',
  gameFilterUdp: '1024-65535',
  installedReleaseTag: null,
  updateRemindAt: null,
  updateSkippedTag: null,
  autoCheckUpdates: true
}

const store = new Store<AppSettings>({
  name: 'settings',
  defaults: DEFAULTS
})

export function getSettings(): AppSettings {
  return { ...DEFAULTS, ...store.store }
}

export function updateSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch }
  store.set(next as unknown as Record<string, unknown>)
  return next
}
