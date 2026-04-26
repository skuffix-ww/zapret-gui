import { app } from 'electron'
import { existsSync, readdirSync, copyFileSync, mkdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'

const LEGACY_DIRS = ['Zapret GUI', 'zapret-electron']

export function migrateLegacyUserData(): void {
  const current = app.getPath('userData')
  if (existsSync(join(current, 'settings.json'))) return

  const root = dirname(current)
  for (const name of LEGACY_DIRS) {
    const legacy = join(root, name)
    if (legacy === current) continue
    if (!existsSync(join(legacy, 'settings.json'))) continue
    copyDir(legacy, current)
    return
  }
}

function copyDir(src: string, dst: string): void {
  if (!existsSync(dst)) mkdirSync(dst, { recursive: true })
  for (const entry of readdirSync(src)) {
    const s = join(src, entry)
    const d = join(dst, entry)
    const st = statSync(s)
    if (st.isDirectory()) copyDir(s, d)
    else copyFileSync(s, d)
  }
}
