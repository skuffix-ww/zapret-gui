import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { existsSync } from 'node:fs'
import { buildArgv } from '@shared/bat-parser'
import type { Profile, ServiceStatus } from '@shared/types'
import { binDir, listsDir, winwsExe } from './paths'
import { getSettings } from './settings'
import { logger } from './logger'

const exec = promisify(execFile)

/**
 * Install winws.exe as a Windows service using sc.exe, replicating
 * Flowseal's service.bat install_winws logic. Requires admin privileges.
 */
export async function installService(profile: Profile): Promise<void> {
  const settings = getSettings()
  if (!settings.installPath) throw new Error('Путь установки не выбран')
  const exe = winwsExe(settings.installPath)
  if (!existsSync(exe)) throw new Error(`Не найден ${exe}`)
  const name = settings.serviceName
  await uninstallServiceIfExists(name)

  const argv = buildArgv(profile, binDir(settings.installPath), listsDir(settings.installPath)).map((a) =>
    a
      .replace(/%GameFilterTCP%/g, settings.gameFilterTcp)
      .replace(/%GameFilterUDP%/g, settings.gameFilterUdp)
  )
  const argsQuoted = argv.map(quoteSc).join(' ')
  const binPath = `"${exe}" ${argsQuoted}`

  logger.info(`Устанавливаю службу ${name}…`)
  await sc(['create', name, 'binPath=', binPath, 'start=', 'auto'])
  await sc(['description', name, `Zapret (GUI): профиль «${profile.name}»`])
  logger.info('Служба установлена. Запуск…')
  await sc(['start', name]).catch((e) => logger.warn(`sc start: ${(e as Error).message}`))
}

export async function uninstallService(): Promise<void> {
  const name = getSettings().serviceName
  await uninstallServiceIfExists(name)
}

async function uninstallServiceIfExists(name: string): Promise<void> {
  const s = await queryService(name)
  if (!s.exists) return
  logger.info(`Удаляю службу ${name}…`)
  if (s.running) await sc(['stop', name]).catch(() => {})
  await sc(['delete', name]).catch((e) => logger.warn(`sc delete: ${(e as Error).message}`))
}

export async function startService(): Promise<void> {
  const name = getSettings().serviceName
  await sc(['start', name])
}

export async function stopService(): Promise<void> {
  const name = getSettings().serviceName
  await sc(['stop', name])
}

export async function queryService(name?: string): Promise<ServiceStatus> {
  const svcName = name ?? getSettings().serviceName
  try {
    const { stdout } = await exec('sc.exe', ['query', svcName])
    return {
      exists: true,
      running: /STATE\s*:\s*\d+\s+RUNNING/i.test(stdout),
      raw: stdout
    }
  } catch (e) {
    const msg = (e as Error).message
    if (/1060|does not exist|не существует/i.test(msg)) {
      return { exists: false, running: false }
    }
    logger.debug(`sc query: ${msg}`)
    return { exists: false, running: false, raw: msg }
  }
}

async function sc(args: string[]): Promise<string> {
  const { stdout } = await exec('sc.exe', args, { windowsHide: true })
  return stdout
}

/** `sc.exe create` binPath quoting: embed double-quotes inside the value via backslash escaping. */
function quoteSc(arg: string): string {
  if (/[\s"]/.test(arg)) return `\\"${arg.replace(/"/g, '\\"')}\\"`
  return arg
}
