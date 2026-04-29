import { useMemo } from 'react'
import { Loader2, Play, Square, Trophy, Zap } from 'lucide-react'
import { useApp } from '../store'
import { cn } from '../lib/cn'
import type { ProfileBenchResult } from '@shared/types'

const TOP_N = 10

export default function ProfileBenchPage(): JSX.Element {
  const {
    profiles,
    settings,
    setActive,
    benchRunning,
    benchProgress,
    benchResults,
    benchDoneInfo,
    startBench,
    cancelBench
  } = useApp()

  const builtinProfiles = useMemo(() => profiles.filter((p) => p.builtin), [profiles])

  const start = async (mode: 'all' | 'builtin'): Promise<void> => {
    if (benchRunning) return
    if (!settings?.installPath) {
      alert('Сначала укажите путь установки в Настройках')
      return
    }
    const list = mode === 'builtin' ? builtinProfiles : profiles
    if (list.length === 0) {
      alert('Нет профилей для теста')
      return
    }
    try {
      await startBench(list.map((p) => p.id))
    } catch (e) {
      alert(`Не удалось запустить: ${(e as Error).message}`)
    }
  }

  const sorted = useMemo(() => {
    return [...benchResults].sort((a, b) => {
      if (a.avgMs === null && b.avgMs === null) return b.successRate - a.successRate
      if (a.avgMs === null) return 1
      if (b.avgMs === null) return -1
      return a.avgMs - b.avgMs
    })
  }, [benchResults])

  const top = sorted.slice(0, TOP_N)
  const winner = top[0]
  const total = benchProgress?.total ?? 0
  const done = benchProgress?.done ?? 0
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Тест альтов и стратегий</h2>
          </div>
          <div className="text-sm text-fg-muted">
            Запускает каждый профиль по очереди, прогревает, замеряет ping до Discord/YouTube/Twitch и показывает топ.
            <br />
            <span className="text-fg-subtle">Прогон одного профиля ≈ 4–6 секунд.</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!benchRunning ? (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost text-xs"
                onClick={() => start('builtin')}
                disabled={builtinProfiles.length === 0}
                title={`Прогнать только встроенные альты (${builtinProfiles.length})`}
              >
                <Zap className="h-3.5 w-3.5" />
                Только альты ({builtinProfiles.length})
              </button>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={() => start('all')}
                disabled={profiles.length === 0}
              >
                <Play className="h-3.5 w-3.5" />
                Прогнать все ({profiles.length})
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn-ghost text-xs" onClick={cancelBench}>
              <Square className="h-3.5 w-3.5" />
              Остановить
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-5">
        {benchProgress && (
          <div className="card p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                {benchRunning && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
                <span className="font-medium">{benchProgress.message}</span>
              </div>
              <span className="text-fg-subtle text-xs">
                {done} / {total} ({pct}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-bg-subtle">
              <div
                className="h-full bg-accent transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            {benchProgress.currentProfileName && (
              <div className="mt-2 text-[12px] text-fg-muted">
                Сейчас: <span className="text-fg">{benchProgress.currentProfileName}</span>
              </div>
            )}
          </div>
        )}

        {benchDoneInfo?.error && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            Ошибка теста: {benchDoneInfo.error}
          </div>
        )}

        {winner && !benchRunning && (
          <div className="rounded-lg border border-success/40 bg-gradient-to-br from-success/15 to-bg-raised/40 p-4">
            <div className="mb-1 flex items-center gap-2 text-success">
              <Trophy className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wider">Лучший профиль</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{winner.profileName}</div>
                <div className="text-xs text-fg-muted">
                  avg {formatMs(winner.avgMs)}, {Math.round(winner.successRate * 100)}% успешных пингов,
                  {' '}{winner.okTargets}/{winner.totalTargets} таргетов
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary text-xs"
                onClick={() => setActive(winner.profileId)}
              >
                Сделать активным
              </button>
            </div>
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-fg-muted uppercase tracking-wide">
              Топ {TOP_N} по avg-пингу
            </h3>
            <span className="text-xs text-fg-subtle">{benchResults.length} профилей протестировано</span>
          </div>
          {top.length === 0 ? (
            <div className="text-sm text-fg-subtle">
              {benchRunning ? 'Идёт замер…' : 'Запустите тест, чтобы увидеть топ.'}
            </div>
          ) : (
            <div className="space-y-1.5">
              {top.map((r, i) => (
                <ResultRow key={r.profileId} result={r} rank={i + 1} onActivate={() => setActive(r.profileId)} />
              ))}
            </div>
          )}
        </div>

        {benchResults.length > TOP_N && (
          <details className="card p-3">
            <summary className="cursor-pointer text-sm font-medium text-fg-muted">
              Остальные ({benchResults.length - TOP_N})
            </summary>
            <div className="mt-3 space-y-1.5">
              {sorted.slice(TOP_N).map((r, i) => (
                <ResultRow
                  key={r.profileId}
                  result={r}
                  rank={TOP_N + i + 1}
                  onActivate={() => setActive(r.profileId)}
                />
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

function ResultRow({
  result,
  rank,
  onActivate
}: {
  result: ProfileBenchResult
  rank: number
  onActivate: () => void
}): JSX.Element {
  const dead = result.avgMs === null
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-md border border-border bg-bg-raised/40 px-3 py-2 transition-colors hover:bg-bg-hover/40',
        rank === 1 && 'border-success/40 bg-success/5',
        dead && 'opacity-60'
      )}
    >
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold',
          rank === 1
            ? 'bg-success/20 text-success'
            : rank <= 3
              ? 'bg-accent/15 text-accent'
              : 'bg-bg-subtle text-fg-subtle'
        )}
      >
        {rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{result.profileName}</div>
        <div className="text-[11px] text-fg-subtle">
          {result.okTargets}/{result.totalTargets} таргетов
          {' · '}
          {Math.round(result.successRate * 100)}% успех
          {result.error && <span className="text-danger"> · {result.error}</span>}
        </div>
      </div>
      <div className="text-right">
        <div className={cn('text-sm font-mono font-semibold', dead ? 'text-fg-subtle' : 'text-fg')}>
          {formatMs(result.avgMs)}
        </div>
      </div>
      <button
        type="button"
        className="btn btn-ghost text-[11px] py-1 px-2"
        onClick={onActivate}
        title="Сделать активным"
      >
        Выбрать
      </button>
    </div>
  )
}

function formatMs(ms: number | null): string {
  if (ms === null) return '— ms'
  return `${ms} ms`
}
