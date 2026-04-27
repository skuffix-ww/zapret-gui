import { execFile, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { EventEmitter } from 'node:events'
import type { ChocoJobState, ChocoStatus } from '@shared/types'
import { logger } from './logger'

const BOOTSTRAP_JOB_ID = '__bootstrap__'

function findChocoExe(): string | null {
  // Default install path; ChocolateyInstall env var overrides if set.
  const envPath = process.env['ChocolateyInstall']
  const candidates: string[] = []
  if (envPath) candidates.push(join(envPath, 'bin', 'choco.exe'))
  candidates.push('C:\\ProgramData\\chocolatey\\bin\\choco.exe')
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function runQuick(exe: string, args: string[]): Promise<{ stdout: string; code: number }> {
  return new Promise((resolve) => {
    execFile(exe, args, { windowsHide: true, timeout: 10000 }, (err, stdout) => {
      resolve({ stdout: stdout || '', code: err && typeof (err as { code?: number }).code === 'number' ? (err as { code: number }).code : err ? 1 : 0 })
    })
  })
}

export async function chocoStatus(): Promise<ChocoStatus> {
  const exe = findChocoExe()
  if (!exe) return { installed: false, version: null, exePath: null }
  const r = await runQuick(exe, ['--version'])
  const version = r.stdout.trim().split(/\r?\n/)[0] || null
  return { installed: true, version, exePath: exe }
}

class ChocoJobs extends EventEmitter {
  private state: ChocoJobState = { jobId: null, phase: 'done', message: '' }

  getState(): ChocoJobState {
    return this.state
  }

  private update(patch: Partial<ChocoJobState>): void {
    this.state = { ...this.state, ...patch }
    this.emit('state', this.state)
  }

  isBusy(): boolean {
    return this.state.jobId !== null && this.state.phase !== 'done' && this.state.phase !== 'error'
  }

  async installPackage(packageId: string): Promise<void> {
    if (this.isBusy()) throw new Error('Уже идёт установка — дождитесь окончания')
    const status = await chocoStatus()
    if (!status.installed || !status.exePath) {
      throw new Error('Chocolatey не установлен. Сначала установите его кнопкой выше.')
    }
    this.update({ jobId: packageId, phase: 'starting', message: `Установка ${packageId}…` })

    const child = spawn(
      status.exePath,
      ['install', packageId, '-y', '--no-progress', '--limit-output'],
      { windowsHide: true }
    )

    this.update({ phase: 'installing', message: `choco install ${packageId}` })

    const onChunk = (data: Buffer): void => {
      const text = data.toString('utf8')
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        logger.info(`[choco ${packageId}] ${trimmed}`)
        // Surface most recent meaningful line as job message.
        if (trimmed.length < 200) this.update({ message: trimmed })
      }
    }

    child.stdout?.on('data', onChunk)
    child.stderr?.on('data', onChunk)

    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        const exitCode = typeof code === 'number' ? code : -1
        if (exitCode === 0) {
          this.update({ phase: 'done', message: `Установлено: ${packageId}`, exitCode })
          logger.info(`[choco] ${packageId} installed (exit 0)`)
        } else {
          this.update({ phase: 'error', message: `Ошибка установки ${packageId} (код ${exitCode})`, exitCode })
          logger.error(`[choco] ${packageId} failed with exit ${exitCode}`)
        }
        resolve()
      })
      child.on('error', (e) => {
        this.update({ phase: 'error', message: e.message, exitCode: -1 })
        logger.error(`[choco] spawn error: ${e.message}`)
        resolve()
      })
    })
  }

  async installChocolatey(): Promise<void> {
    if (this.isBusy()) throw new Error('Уже идёт установка — дождитесь окончания')
    const existing = await chocoStatus()
    if (existing.installed) {
      this.update({ jobId: BOOTSTRAP_JOB_ID, phase: 'done', message: `Уже установлен (${existing.version})` })
      return
    }
    this.update({ jobId: BOOTSTRAP_JOB_ID, phase: 'installing-choco', message: 'Установка Chocolatey…' })

    // Standard chocolatey bootstrap (https://chocolatey.org/install).
    // We require the app to be running as admin already (it is — winws-runner needs it).
    const psScript = [
      'Set-ExecutionPolicy Bypass -Scope Process -Force;',
      "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072;",
      "iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    ].join(' ')

    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psScript],
      { windowsHide: true }
    )

    const onChunk = (data: Buffer): void => {
      const text = data.toString('utf8')
      for (const line of text.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed) continue
        logger.info(`[choco-bootstrap] ${trimmed}`)
        if (trimmed.length < 200) this.update({ message: trimmed })
      }
    }
    child.stdout?.on('data', onChunk)
    child.stderr?.on('data', onChunk)

    await new Promise<void>((resolve) => {
      child.on('close', (code) => {
        const exitCode = typeof code === 'number' ? code : -1
        if (exitCode === 0) {
          this.update({ phase: 'done', message: 'Chocolatey установлен', exitCode })
          logger.info('[choco-bootstrap] success')
        } else {
          this.update({ phase: 'error', message: `Не удалось установить Chocolatey (код ${exitCode})`, exitCode })
          logger.error(`[choco-bootstrap] failed with exit ${exitCode}`)
        }
        resolve()
      })
      child.on('error', (e) => {
        this.update({ phase: 'error', message: e.message, exitCode: -1 })
        logger.error(`[choco-bootstrap] spawn error: ${e.message}`)
        resolve()
      })
    })
  }
}

export const chocoJobs = new ChocoJobs()
