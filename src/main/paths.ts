import { app } from 'electron'
import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export function userDataDir(): string {
  return app.getPath('userData')
}

export function profilesFile(): string {
  return join(userDataDir(), 'profiles.json')
}

/** Location of the generated default profiles JSON — inside asar in prod, source in dev. */
export function defaultProfilesFile(): string {
  const prod = join(process.resourcesPath ?? '', 'default-profiles.json')
  if (existsSync(prod)) return prod
  // dev mode — loaded from project root
  return resolve(process.cwd(), 'resources', 'default-profiles.json')
}

export function binDir(installRoot: string): string {
  return join(installRoot, 'bin')
}

export function listsDir(installRoot: string): string {
  return join(installRoot, 'lists')
}

export function winwsExe(installRoot: string): string {
  return join(binDir(installRoot), 'winws.exe')
}
