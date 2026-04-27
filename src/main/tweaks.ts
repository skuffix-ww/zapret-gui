import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { logger } from './logger'

export type RegHive = 'HKLM' | 'HKCU'
export type RegType = 'REG_DWORD' | 'REG_SZ'

export interface RegOp {
  hive: RegHive
  key: string
  name: string
  type: RegType
  data: string
}

export interface Tweak {
  id: string
  label: string
  description: string
  category: 'telemetry' | 'ads' | 'search' | 'system' | 'edge'
  /** Soft warning shown in UI before apply (e.g. "may break Cortana"). */
  warning?: string
  /** If true, requires sign-out / reboot to fully take effect. */
  requiresRestart?: boolean
  ops: RegOp[]
}

export const TWEAKS: Tweak[] = [
  {
    id: 'telemetry',
    label: 'Отключить телеметрию Windows',
    description:
      'AllowTelemetry=0 в политиках. Уменьшает объём данных, отправляемых Microsoft в фоне.',
    category: 'telemetry',
    requiresRestart: true,
    ops: [
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Windows\\DataCollection',
        name: 'AllowTelemetry',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'advertising-id',
    label: 'Отключить рекламный ID',
    description: 'Запрещает приложениям использовать персональный Advertising ID.',
    category: 'ads',
    ops: [
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\AdvertisingInfo',
        name: 'Enabled',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'start-menu-ads',
    label: 'Убрать рекламу в меню «Пуск»',
    description: 'Отключает «предложения» и «советы» — sponsored apps в Start menu и Settings.',
    category: 'ads',
    ops: [
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'SubscribedContent-338388Enabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'SubscribedContent-338389Enabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'SilentInstalledAppsEnabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'OemPreInstalledAppsEnabled',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'lock-screen-ads',
    label: 'Убрать рекламу с экрана блокировки',
    description: 'RotatingLockScreenOverlayEnabled=0 — никаких подсказок и баннеров на лок-скрине.',
    category: 'ads',
    ops: [
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'RotatingLockScreenOverlayEnabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\ContentDeliveryManager',
        name: 'SubscribedContent-338387Enabled',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'bing-search',
    label: 'Отключить Bing-поиск в «Пуске»',
    description: 'Поиск Win+S больше не лезет в интернет — только локальные файлы и приложения.',
    category: 'search',
    ops: [
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\Search',
        name: 'BingSearchEnabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\Search',
        name: 'CortanaConsent',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKCU',
        key: 'Software\\Policies\\Microsoft\\Windows\\Explorer',
        name: 'DisableSearchBoxSuggestions',
        type: 'REG_DWORD',
        data: '1'
      }
    ]
  },
  {
    id: 'cortana',
    label: 'Отключить Cortana',
    description: 'AllowCortana=0 в политиках. Полностью гасит голосового помощника.',
    category: 'search',
    warning: 'Может сломать поиск в некоторых приложениях',
    ops: [
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Windows\\Windows Search',
        name: 'AllowCortana',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'edge-telemetry',
    label: 'Отключить телеметрию Edge',
    description: 'MetricsReporting + UserFeedback в политиках Edge.',
    category: 'edge',
    ops: [
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Edge',
        name: 'MetricsReportingEnabled',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Edge',
        name: 'UserFeedbackAllowed',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Edge',
        name: 'PersonalizationReportingEnabled',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'activity-history',
    label: 'Отключить Activity History / Timeline',
    description: 'Windows перестанет логировать ваши действия и отправлять их в облако.',
    category: 'telemetry',
    ops: [
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        name: 'EnableActivityFeed',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        name: 'PublishUserActivities',
        type: 'REG_DWORD',
        data: '0'
      },
      {
        hive: 'HKLM',
        key: 'SOFTWARE\\Policies\\Microsoft\\Windows\\System',
        name: 'UploadUserActivities',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  },
  {
    id: 'app-launch-tracking',
    label: 'Не отслеживать запуски приложений',
    description: 'Start_TrackProgs=0 — Windows не строит «персонализированный» список часто-используемых.',
    category: 'telemetry',
    ops: [
      {
        hive: 'HKCU',
        key: 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\Advanced',
        name: 'Start_TrackProgs',
        type: 'REG_DWORD',
        data: '0'
      }
    ]
  }
]

interface RegBackup {
  /** null means the value did not exist before apply — revert should delete it. */
  type: RegType | null
  data: string | null
}

interface TweakRecord {
  applied: boolean
  appliedAt: number
  /** Pre-apply backup for each op, in same order as `tweak.ops`. */
  backups: RegBackup[]
}

type StateMap = Record<string, TweakRecord>

let stateFileCached: string | null = null
function stateFile(): string {
  if (stateFileCached) return stateFileCached
  stateFileCached = join(app.getPath('userData'), 'tweaks-state.json')
  return stateFileCached
}

function readState(): StateMap {
  const f = stateFile()
  if (!existsSync(f)) return {}
  try {
    return JSON.parse(readFileSync(f, 'utf8')) as StateMap
  } catch {
    return {}
  }
}

function writeState(state: StateMap): void {
  writeFileSync(stateFile(), JSON.stringify(state, null, 2), 'utf8')
}

function regPath(op: RegOp): string {
  return `${op.hive}\\${op.key}`
}

function execReg(args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile('reg.exe', args, { windowsHide: true }, (err, stdout, stderr) => {
      const code =
        err && typeof (err as { code?: number }).code === 'number'
          ? (err as { code: number }).code
          : err
            ? 1
            : 0
      resolve({ stdout: stdout || '', stderr: stderr || '', code })
    })
  })
}

async function regQuery(op: RegOp): Promise<RegBackup> {
  const r = await execReg(['query', regPath(op), '/v', op.name])
  if (r.code !== 0) return { type: null, data: null }
  // Output line we want looks like: "    Name    REG_DWORD    0x0".
  const lines = r.stdout.split(/\r?\n/)
  for (const line of lines) {
    const m = line.match(/^\s+(\S+)\s+(REG_\w+)\s+(.*)$/)
    if (m && m[1] === op.name) {
      const type = m[2] as RegType
      const data = m[3].trim()
      return { type, data }
    }
  }
  return { type: null, data: null }
}

async function regSet(op: RegOp): Promise<void> {
  const r = await execReg([
    'add',
    regPath(op),
    '/v',
    op.name,
    '/t',
    op.type,
    '/d',
    op.data,
    '/f'
  ])
  if (r.code !== 0) {
    throw new Error(`reg add failed (${r.code}): ${r.stderr.trim() || r.stdout.trim()}`)
  }
}

async function regDelete(op: RegOp): Promise<void> {
  const r = await execReg(['delete', regPath(op), '/v', op.name, '/f'])
  // Code 1 + "Не удалось найти" / "unable to find" — acceptable, the value is already gone.
  if (r.code !== 0 && !/cannot find|не удал/i.test(`${r.stdout} ${r.stderr}`)) {
    throw new Error(`reg delete failed (${r.code}): ${r.stderr.trim() || r.stdout.trim()}`)
  }
}

async function regRestore(op: RegOp, backup: RegBackup): Promise<void> {
  if (backup.type && backup.data !== null) {
    await regSet({ ...op, type: backup.type, data: dataForRestore(backup.type, backup.data) })
  } else {
    await regDelete(op)
  }
}

function dataForRestore(type: RegType, raw: string): string {
  // For DWORD reg query prints "0x..." but reg add expects a decimal or hex.
  // reg add accepts "0x..." for REG_DWORD just fine, so pass raw through.
  if (type === 'REG_DWORD') return raw
  return raw
}

function findTweak(id: string): Tweak {
  const t = TWEAKS.find((x) => x.id === id)
  if (!t) throw new Error(`Неизвестный твик: ${id}`)
  return t
}

export interface TweakStateEntry {
  id: string
  applied: boolean
  appliedAt: number | null
}

export function listTweaksWithState(): TweakStateEntry[] {
  const state = readState()
  return TWEAKS.map((t) => ({
    id: t.id,
    applied: state[t.id]?.applied ?? false,
    appliedAt: state[t.id]?.appliedAt ?? null
  }))
}

export function getCatalog(): Tweak[] {
  return TWEAKS
}

export async function applyTweak(id: string): Promise<TweakStateEntry> {
  const tweak = findTweak(id)
  const state = readState()
  if (state[id]?.applied) {
    return { id, applied: true, appliedAt: state[id].appliedAt }
  }
  const backups: RegBackup[] = []
  for (const op of tweak.ops) {
    backups.push(await regQuery(op))
  }
  // Apply ops in order; if any fails, attempt to roll back already-applied ones.
  const applied: number[] = []
  try {
    for (let i = 0; i < tweak.ops.length; i++) {
      await regSet(tweak.ops[i])
      applied.push(i)
    }
  } catch (e) {
    logger.error(`[tweaks] ${id} apply failed: ${(e as Error).message}; rolling back`)
    for (const idx of applied.reverse()) {
      try {
        await regRestore(tweak.ops[idx], backups[idx])
      } catch (rbErr) {
        logger.error(`[tweaks] rollback failed for op ${idx}: ${(rbErr as Error).message}`)
      }
    }
    throw e
  }
  const record: TweakRecord = { applied: true, appliedAt: Date.now(), backups }
  state[id] = record
  writeState(state)
  logger.info(`[tweaks] applied ${id}`)
  return { id, applied: true, appliedAt: record.appliedAt }
}

export async function revertTweak(id: string): Promise<TweakStateEntry> {
  const tweak = findTweak(id)
  const state = readState()
  const rec = state[id]
  if (!rec?.applied) {
    return { id, applied: false, appliedAt: null }
  }
  for (let i = 0; i < tweak.ops.length; i++) {
    const op = tweak.ops[i]
    const backup = rec.backups[i] ?? { type: null, data: null }
    try {
      await regRestore(op, backup)
    } catch (e) {
      logger.warn(`[tweaks] revert op ${i} of ${id} failed: ${(e as Error).message}`)
    }
  }
  delete state[id]
  writeState(state)
  logger.info(`[tweaks] reverted ${id}`)
  return { id, applied: false, appliedAt: null }
}
