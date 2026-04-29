import { EventEmitter } from 'node:events'
import type {
  PingResult,
  PingTarget,
  Profile,
  ProfileBenchProgress,
  ProfileBenchResult
} from '@shared/types'
import { runner } from './runner'
import { ping } from './diagnostics'
import { logger } from './logger'

/**
 * Тестировка профилей: для каждого активного запускаем winws.exe, ждём прогрева,
 * пингуем заранее заданные таргеты, замеряем avg, останавливаем, переходим к следующему.
 *
 * Идея — найти среди 19 builtin-профилей те, что РЕАЛЬНО работают у юзера, и показать топ.
 */

const BENCH_TARGETS: PingTarget[] = [
  { id: 'discord', label: 'Discord', host: 'discord.com', port: 443 },
  { id: 'discord-gateway', label: 'Discord Gateway', host: 'gateway.discord.gg', port: 443 },
  { id: 'discord-cdn', label: 'Discord CDN', host: 'cdn.discordapp.com', port: 443 },
  { id: 'youtube', label: 'YouTube', host: 'www.youtube.com', port: 443 },
  { id: 'youtube-api', label: 'YouTube API', host: 'youtubei.googleapis.com', port: 443 },
  { id: 'twitch', label: 'Twitch', host: 'www.twitch.tv', port: 443 }
]

const PER_TARGET_ATTEMPTS = 3
const TARGET_TIMEOUT_MS = 4000
const WARMUP_MS = 2500
const COOLDOWN_MS = 600

class ProfileBench extends EventEmitter {
  private running = false
  private cancelRequested = false

  isRunning(): boolean {
    return this.running
  }

  cancel(): void {
    if (!this.running) return
    this.cancelRequested = true
    try {
      runner.stop()
    } catch {
      /* ignore */
    }
  }

  async run(profiles: Profile[]): Promise<void> {
    if (this.running) throw new Error('Тест уже идёт')
    if (profiles.length === 0) throw new Error('Нет профилей для теста')
    this.running = true
    this.cancelRequested = false
    const wasRunning = runner.isRunning()
    if (wasRunning) {
      try { runner.stop() } catch { /* ignore */ }
      await sleep(800)
    }

    const total = profiles.length
    this.emitProgress({
      phase: 'preparing',
      currentProfileId: null,
      currentProfileName: null,
      done: 0,
      total,
      message: 'Подготовка…'
    })

    try {
      let done = 0
      for (const profile of profiles) {
        if (this.cancelRequested) break
        const result = await this.benchOne(profile, done, total)
        this.emit('result', result)
        done++
      }
      this.emitProgress({
        phase: this.cancelRequested ? 'cancelled' : 'done',
        currentProfileId: null,
        currentProfileName: null,
        done,
        total,
        message: this.cancelRequested ? 'Отменено' : 'Готово'
      })
      this.emit('done', { cancelled: this.cancelRequested })
    } catch (e) {
      logger.error(`bench: ${(e as Error).message}`)
      this.emitProgress({
        phase: 'error',
        currentProfileId: null,
        currentProfileName: null,
        done: 0,
        total,
        message: (e as Error).message
      })
      this.emit('done', { cancelled: false, error: (e as Error).message })
    } finally {
      this.running = false
      this.cancelRequested = false
    }
  }

  private async benchOne(profile: Profile, doneSoFar: number, total: number): Promise<ProfileBenchResult> {
    this.emitProgress({
      phase: 'running',
      currentProfileId: profile.id,
      currentProfileName: profile.name,
      done: doneSoFar,
      total,
      message: `Запуск «${profile.name}»…`
    })

    let started = false
    try {
      runner.start(profile)
      started = true
    } catch (e) {
      logger.warn(`bench: не запустить «${profile.name}» — ${(e as Error).message}`)
      return {
        profileId: profile.id,
        profileName: profile.name,
        avgMs: null,
        successRate: 0,
        okTargets: 0,
        totalTargets: BENCH_TARGETS.length,
        perTarget: [],
        error: (e as Error).message
      }
    }

    await sleep(WARMUP_MS)
    if (this.cancelRequested) {
      try { runner.stop() } catch { /* ignore */ }
      return emptyResult(profile, 'Отменено')
    }

    this.emitProgress({
      phase: 'running',
      currentProfileId: profile.id,
      currentProfileName: profile.name,
      done: doneSoFar,
      total,
      message: `Замер «${profile.name}»…`
    })

    const perTarget: PingResult[] = []
    for (const target of BENCH_TARGETS) {
      if (this.cancelRequested) break
      try {
        const r = await ping(target, PER_TARGET_ATTEMPTS, TARGET_TIMEOUT_MS)
        perTarget.push(r)
      } catch (e) {
        perTarget.push({
          target,
          attempts: [{ ok: false, error: (e as Error).message }],
          min: null,
          max: null,
          avg: null,
          successRate: 0
        })
      }
    }

    if (started) {
      try { runner.stop() } catch { /* ignore */ }
    }
    await sleep(COOLDOWN_MS)

    const okResults = perTarget.filter((r) => r.avg !== null)
    const avg =
      okResults.length > 0
        ? Math.round(okResults.reduce((s, r) => s + (r.avg ?? 0), 0) / okResults.length)
        : null
    const totalAttempts = perTarget.reduce((s, r) => s + r.attempts.length, 0)
    const okAttempts = perTarget.reduce(
      (s, r) => s + r.attempts.filter((a) => a.ok).length,
      0
    )
    return {
      profileId: profile.id,
      profileName: profile.name,
      avgMs: avg,
      successRate: totalAttempts > 0 ? okAttempts / totalAttempts : 0,
      okTargets: okResults.length,
      totalTargets: perTarget.length,
      perTarget
    }
  }

  private emitProgress(p: ProfileBenchProgress): void {
    this.emit('progress', p)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function emptyResult(profile: Profile, error: string): ProfileBenchResult {
  return {
    profileId: profile.id,
    profileName: profile.name,
    avgMs: null,
    successRate: 0,
    okTargets: 0,
    totalTargets: BENCH_TARGETS.length,
    perTarget: [],
    error
  }
}

export const profileBench = new ProfileBench()
