import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { defaultProfilesFile, profilesFile } from './paths'
import { parseBat } from '@shared/bat-parser'
import type { Profile } from '@shared/types'
import { logger } from './logger'

interface Store {
  profiles: Profile[]
}

let cache: Store | null = null

function loadDefaults(): Profile[] {
  try {
    const raw = readFileSync(defaultProfilesFile(), 'utf8')
    const parsed = JSON.parse(raw) as { profiles: Profile[] }
    return parsed.profiles.map((p) => ({ ...p, builtin: true, updatedAt: 0 }))
  } catch (e) {
    logger.error(`Не удалось прочитать встроенные профили: ${(e as Error).message}`)
    return []
  }
}

function load(): Store {
  if (cache) return cache
  const defaults = loadDefaults()
  if (!existsSync(profilesFile())) {
    cache = { profiles: [] }
    return cache
  }
  try {
    const raw = readFileSync(profilesFile(), 'utf8')
    const parsed = JSON.parse(raw) as Store
    cache = { profiles: parsed.profiles ?? [] }
  } catch (e) {
    logger.error(`profiles.json повреждён: ${(e as Error).message}`)
    cache = { profiles: [] }
  }
  return cache
}

function persist(): void {
  if (!cache) return
  writeFileSync(profilesFile(), JSON.stringify(cache, null, 2), 'utf8')
}

export function listProfiles(): Profile[] {
  const defaults = loadDefaults()
  const user = load().profiles
  return [...defaults, ...user]
}

export function saveProfile(profile: Profile): Profile {
  const store = load()
  if (profile.builtin) {
    throw new Error('Встроенные профили нельзя редактировать. Продублируйте его.')
  }
  const next: Profile = { ...profile, updatedAt: Date.now() }
  if (!next.id || next.id.startsWith('builtin:')) next.id = generateId()
  const idx = store.profiles.findIndex((p) => p.id === next.id)
  if (idx >= 0) store.profiles[idx] = next
  else store.profiles.push(next)
  persist()
  return next
}

export function deleteProfile(id: string): void {
  const store = load()
  store.profiles = store.profiles.filter((p) => p.id !== id)
  persist()
}

export function duplicateProfile(sourceId: string, newName?: string): Profile {
  const all = listProfiles()
  const src = all.find((p) => p.id === sourceId)
  if (!src) throw new Error('Профиль не найден')
  const copy: Profile = {
    ...src,
    id: generateId(),
    name: newName || `${src.name} (копия)`,
    builtin: false,
    updatedAt: Date.now(),
    globalArgs: src.globalArgs.map((a) => ({ ...a })),
    sections: src.sections.map((s) => ({
      label: s.label,
      args: s.args.map((a) => ({ ...a })),
      disabled: s.disabled
    }))
  }
  const store = load()
  store.profiles.push(copy)
  persist()
  return copy
}

export function importFromBat(raw: string, suggestedName?: string): Profile {
  const parsed = parseBat(raw, suggestedName ?? 'Импортированный')
  const profile: Profile = {
    id: generateId(),
    name: parsed.name,
    builtin: false,
    description: parsed.notRecommended ? 'НЕ РЕКОМЕНДУЕТСЯ' : '',
    globalArgs: parsed.globalArgs,
    sections: parsed.sections,
    updatedAt: Date.now()
  }
  const store = load()
  store.profiles.push(profile)
  persist()
  return profile
}

function generateId(): string {
  return 'user:' + randomBytes(6).toString('hex')
}
