import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'
import { existsSync } from 'node:fs'
import { Notification, BrowserWindow, app } from 'electron'
import { logger } from './logger'
import { getSettings } from './settings'

const execFileP = promisify(execFile)

interface GameDef {
  id: string
  name: string
  /** Process basenames, lowercase. Match if any one is found in tasklist. */
  exe: string[]
  message: string
  hint: string
}

const TRACKED_GAMES: GameDef[] = [
  {
    id: 'sbox',
    name: 's&box',
    exe: ['sbox.exe'],
    message: 'Лагает s&box? Не можешь зайти на серверы?',
    hint: 'Попробуй наш универсальный обход!'
  },
  {
    id: 'rust',
    name: 'Rust',
    exe: ['rustclient.exe'],
    message: 'Не подключается к серверам Rust?',
    hint: 'Включи UnLimit — поможет с Cloudflare-блокировкой.'
  },
  {
    id: 'arc-raiders',
    name: 'ARC Raiders',
    exe: ['arc-win64-shipping.exe', 'arc.exe'],
    message: 'Долго грузится ARC Raiders?',
    hint: 'Запусти UnLimit — может ускорить подключение к серверам.'
  },
  {
    id: 'apex',
    name: 'Apex Legends',
    exe: ['r5apex.exe'],
    message: 'Долгий поиск матча в Apex?',
    hint: 'Включи Game mode + UnLimit — обходит провайдерские шейпы.'
  },
  {
    id: 'cs2',
    name: 'Counter-Strike 2',
    exe: ['cs2.exe'],
    message: 'Лаги в CS2?',
    hint: 'UnLimit может помочь, если провайдер режет matchmaking.'
  }
]

const POLL_INTERVAL_MS = 6000
const COOLDOWN_MS = 5 * 60 * 1000

let timer: NodeJS.Timeout | null = null
let mainWindowRef: BrowserWindow | null = null
const knownPids = new Map<string, Set<number>>()
const lastNotifiedAt = new Map<string, number>()

interface TaskRow {
  name: string
  pid: number
}

async function listProcesses(): Promise<TaskRow[]> {
  try {
    const { stdout } = await execFileP('tasklist.exe', ['/fo', 'csv', '/nh'], {
      windowsHide: true,
      maxBuffer: 8 * 1024 * 1024
    })
    const rows: TaskRow[] = []
    for (const line of stdout.split(/\r?\n/)) {
      if (!line) continue
      const fields = parseCsvLine(line)
      if (fields.length < 2) continue
      const name = fields[0]?.toLowerCase() ?? ''
      const pid = Number(fields[1])
      if (!name || !Number.isFinite(pid)) continue
      rows.push({ name, pid })
    }
    return rows
  } catch (e) {
    logger.warn(`gameWatcher: tasklist failed — ${(e as Error).message}`)
    return []
  }
}

function parseCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQ = !inQ
      continue
    }
    if (c === ',' && !inQ) {
      out.push(cur)
      cur = ''
      continue
    }
    cur += c
  }
  out.push(cur)
  return out
}

function focusMainWindow(): void {
  const win = mainWindowRef
  if (!win || win.isDestroyed()) return
  if (win.isMinimized()) win.restore()
  if (!win.isVisible()) win.show()
  win.focus()
}

function resolveIconPath(): string | undefined {
  const candidates = [
    join(__dirname, '../../icon.ico'),
    join(app.getAppPath(), 'icon.ico'),
    join(process.resourcesPath, 'icon.ico')
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return undefined
}

async function tick(): Promise<void> {
  const settings = getSettings()
  if (!settings.notifyGameLaunch) return
  if (!Notification.isSupported()) return

  const procs = await listProcesses()
  if (procs.length === 0) return

  for (const game of TRACKED_GAMES) {
    const matchedPids = new Set<number>()
    for (const p of procs) {
      if (game.exe.includes(p.name)) matchedPids.add(p.pid)
    }
    const prevPids = knownPids.get(game.id) ?? new Set<number>()
    const newPids = [...matchedPids].filter((pid) => !prevPids.has(pid))
    knownPids.set(game.id, matchedPids)

    if (newPids.length === 0) continue
    const last = lastNotifiedAt.get(game.id) ?? 0
    if (Date.now() - last < COOLDOWN_MS) continue

    lastNotifiedAt.set(game.id, Date.now())
    showNotification(game)
  }
}

function showNotification(game: GameDef): void {
  try {
    const n = new Notification({
      title: `UnLimit · ${game.name}`,
      body: `${game.message}\n${game.hint}`,
      icon: resolveIconPath(),
      silent: false
    })
    n.on('click', () => focusMainWindow())
    n.show()
    logger.info(`gameWatcher: уведомление по ${game.name} показано`)
  } catch (e) {
    logger.warn(`gameWatcher: не удалось показать уведомление — ${(e as Error).message}`)
  }
}

export function startGameWatcher(win: BrowserWindow): void {
  mainWindowRef = win
  if (timer) return
  timer = setInterval(() => {
    void tick()
  }, POLL_INTERVAL_MS)
  // Prime knownPids на старте, чтобы не выстрелить уведомлением в уже запущенную игру
  void (async () => {
    const procs = await listProcesses()
    for (const game of TRACKED_GAMES) {
      const pids = new Set<number>()
      for (const p of procs) if (game.exe.includes(p.name)) pids.add(p.pid)
      knownPids.set(game.id, pids)
    }
  })()
}

export function stopGameWatcher(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  mainWindowRef = null
}

export function listTrackedGames(): Array<{ id: string; name: string; exe: string[] }> {
  return TRACKED_GAMES.map((g) => ({ id: g.id, name: g.name, exe: g.exe }))
}
