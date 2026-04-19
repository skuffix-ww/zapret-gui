import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import type { DomainList } from '@shared/types'
import { listsDir } from './paths'
import { getSettings } from './settings'

/**
 * Flowseal maintains paired lists: official (read-only) + `-user` overrides (editable).
 * We expose only the user-editable ones for writing, but show all for reading so the UI
 * can let users see what's already blocked before adding overrides.
 */
const CATALOG: Array<{ file: string; label: string; editable: boolean }> = [
  { file: 'list-general.txt', label: 'Домены (общий список)', editable: false },
  { file: 'list-general-user.txt', label: 'Домены — мои добавления', editable: true },
  { file: 'list-exclude.txt', label: 'Исключения (общий)', editable: false },
  { file: 'list-exclude-user.txt', label: 'Исключения — мои', editable: true },
  { file: 'list-google.txt', label: 'Google-домены', editable: false },
  { file: 'ipset-all.txt', label: 'IP-адреса (общий)', editable: false },
  { file: 'ipset-exclude.txt', label: 'IP-исключения (общий)', editable: false },
  { file: 'ipset-exclude-user.txt', label: 'IP-исключения — мои', editable: true }
]

export function catalog(): Array<Omit<DomainList, 'content'>> {
  return CATALOG.map((c) => ({ file: c.file, label: c.label, editable: c.editable }))
}

export function read(file: string): DomainList {
  const meta = CATALOG.find((c) => c.file === file)
  if (!meta) throw new Error(`Неизвестный список: ${file}`)
  const settings = getSettings()
  if (!settings.installPath) throw new Error('Путь установки не выбран')
  const full = join(listsDir(settings.installPath), file)
  const content = existsSync(full) ? readFileSync(full, 'utf8') : ''
  return { ...meta, content }
}

export function write(file: string, content: string): void {
  const meta = CATALOG.find((c) => c.file === file)
  if (!meta) throw new Error(`Неизвестный список: ${file}`)
  if (!meta.editable) throw new Error('Этот список перезаписывается обновлениями. Используйте -user версию.')
  const settings = getSettings()
  if (!settings.installPath) throw new Error('Путь установки не выбран')
  const full = join(listsDir(settings.installPath), file)
  writeFileSync(full, content.endsWith('\n') ? content : content + '\n', 'utf8')
}
