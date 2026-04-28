import { spawn, execFile, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { EventEmitter } from 'node:events'
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { buildArgv } from '@shared/bat-parser'
import type { Profile, RunState } from '@shared/types'
import { logger } from './logger'
import { binDir, listsDir, winwsExe } from './paths'
import { getSettings } from './settings'

type WinwsChild = ChildProcessByStdio<null, Readable, Readable>

class Runner extends EventEmitter {
  private child: WinwsChild | null = null
  private state: RunState = { status: 'stopped' }

  getState(): RunState {
    return this.state
  }

  private setState(s: RunState): void {
    this.state = s
    this.emit('state', s)
  }

  onState(cb: (s: RunState) => void): () => void {
    this.on('state', cb)
    return () => this.off('state', cb)
  }

  isRunning(): boolean {
    return this.state.status === 'running' || this.state.status === 'starting'
  }

  start(profile: Profile): void {
    if (this.isRunning()) throw new Error('Уже запущено')
    const settings = getSettings()
    if (!settings.installPath) throw new Error('Не выбран путь установки. Откройте «Настройки».')
    const exe = winwsExe(settings.installPath)
    if (!existsSync(exe)) throw new Error(`Не найден ${exe}. Установите zapret из официального релиза.`)

    const ldir = listsDir(settings.installPath)
    mkdirSync(ldir, { recursive: true })
    // service.bat → :load_user_lists заполняет user-файлы плейсхолдером, иначе winws падает на пустых hostlist'ах.
    const userDefaults: Record<string, string> = {
      'list-general-user.txt': 'domain.example.abc',
      'list-exclude-user.txt': 'domain.example.abc',
      'ipset-exclude-user.txt': '203.0.113.113/32'
    }
    for (const [f, def] of Object.entries(userDefaults)) {
      const p = join(ldir, f)
      if (!existsSync(p) || statSync(p).size === 0) writeFileSync(p, def + '\r\n', 'utf8')
    }
    // ipset-all.txt должен содержать хотя бы одну строку, иначе ipset-фильтры пустые → winws молча не цепляет ничего.
    const ipsetAll = join(ldir, 'ipset-all.txt')
    if (!existsSync(ipsetAll) || readFileSync(ipsetAll, 'utf8').replace(/\s/g, '').length === 0) {
      writeFileSync(ipsetAll, '0.0.0.0/0\r\n', 'utf8')
    }
    // Повторяем :tcp_enable из service.bat — без timestamps часть стратегий с split/disorder работает нестабильно.
    execFile('netsh.exe', ['interface', 'tcp', 'set', 'global', 'timestamps=enabled'], { windowsHide: true }, (err) => {
      if (err) logger.warn(`netsh tcp timestamps: ${err.message} (нужны права администратора?)`)
    })

    const gameFilter = settings.gameFilterTcp !== '12' ? settings.gameFilterTcp : settings.gameFilterUdp

    const argv = buildArgv(profile, binDir(settings.installPath), listsDir(settings.installPath))
      .map((a) =>
        a
          .replace(/%GameFilter%/gi, gameFilter)
          .replace(/%GameFilterTCP%/gi, settings.gameFilterTcp)
          .replace(/%GameFilterUDP%/gi, settings.gameFilterUdp)
      )

    logger.info(`Запуск: winws.exe (${argv.length} аргументов, профиль «${profile.name}»)`)
    logger.debug(argv.join(' '))

    this.setState({ status: 'starting' })
    try {
      const child = spawn(exe, argv, {
        cwd: binDir(settings.installPath),
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe']
      })
      this.child = child
      child.stdout.setEncoding('utf8')
      child.stderr.setEncoding('utf8')
      child.stdout.on('data', (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) if (line.trim()) logger.push('stdout', line)
      })
      child.stderr.on('data', (chunk: string) => {
        for (const line of chunk.split(/\r?\n/)) if (line.trim()) logger.push('stderr', line)
      })
      child.on('error', (err) => {
        logger.error(`winws.exe: ${err.message}`)
        this.setState({ status: 'crashed', code: null, at: Date.now() })
        this.child = null
      })
      child.on('exit', (code) => {
        this.child = null
        if (this.state.status === 'stopping') {
          logger.info('winws.exe остановлен пользователем')
          this.setState({ status: 'stopped' })
        } else if (code === 0) {
          logger.info('winws.exe завершился')
          this.setState({ status: 'stopped' })
        } else {
          logger.warn(`winws.exe упал (код ${code})`)
          this.setState({ status: 'crashed', code, at: Date.now() })
        }
      })
      const pid = child.pid ?? 0
      this.setState({ status: 'running', pid, since: Date.now() })
      logger.info(`winws.exe запущен (pid ${pid})`)
    } catch (e) {
      this.child = null
      this.setState({ status: 'crashed', code: null, at: Date.now() })
      throw e
    }
  }

  stop(): void {
    if (!this.child || !this.isRunning()) return
    this.setState({ status: 'stopping' })
    try {
      this.child.kill()
    } catch (e) {
      logger.error(`Остановка: ${(e as Error).message}`)
    }
  }
}

export const runner = new Runner()
