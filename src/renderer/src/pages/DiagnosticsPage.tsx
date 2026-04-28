import { useEffect, useState } from 'react'
import { Activity, Loader2, Play } from 'lucide-react'
import type { PingResult, PingTarget } from '@shared/types'
import { cn } from '../lib/cn'
import { useApp } from '../store'
import { BRAND_COLORS, DiscordIcon, YouTubeIcon } from '../components/icons/SimpleIcons'

interface ProbeDef {
  target: PingTarget
  color: string
  Icon: (props: { className?: string; style?: React.CSSProperties }) => JSX.Element
}

const PROBES: ProbeDef[] = [
  {
    target: { id: 'discord', label: 'Discord', host: 'discord.com', port: 443 },
    color: BRAND_COLORS.discord,
    Icon: DiscordIcon
  },
  {
    target: { id: 'discord-gateway', label: 'Discord Gateway', host: 'gateway.discord.gg', port: 443 },
    color: BRAND_COLORS.discord,
    Icon: DiscordIcon
  },
  {
    target: { id: 'youtube', label: 'YouTube', host: 'www.youtube.com', port: 443 },
    color: BRAND_COLORS.youtube,
    Icon: YouTubeIcon
  },
  {
    target: { id: 'youtube-api', label: 'YouTube API', host: 'youtubei.googleapis.com', port: 443 },
    color: BRAND_COLORS.youtube,
    Icon: YouTubeIcon
  }
]

const ATTEMPTS = 5
const TIMEOUT_MS = 5000

export default function DiagnosticsPage(): JSX.Element {
  const [results, setResults] = useState<Record<string, PingResult | 'running'>>({})
  const [busy, setBusy] = useState(false)
  const { pendingDiagnosticsRun, consumePendingDiagnostics } = useApp()

  const runOne = async (probe: ProbeDef): Promise<void> => {
    setResults((r) => ({ ...r, [probe.target.id]: 'running' }))
    try {
      const res = await window.api.diag.ping(probe.target, { attempts: ATTEMPTS, timeoutMs: TIMEOUT_MS })
      setResults((r) => ({ ...r, [probe.target.id]: res }))
    } catch (e) {
      setResults((r) => ({
        ...r,
        [probe.target.id]: {
          target: probe.target,
          attempts: [{ ok: false, error: (e as Error).message }],
          min: null,
          max: null,
          avg: null,
          successRate: 0
        }
      }))
    }
  }

  const runAll = async (): Promise<void> => {
    if (busy) return
    setBusy(true)
    try {
      await Promise.all(PROBES.map(runOne))
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (pendingDiagnosticsRun) {
      consumePendingDiagnostics()
      void runAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDiagnosticsRun])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Диагностика</h2>
          </div>
          <div className="text-sm text-fg-muted">
            Измерение времени TLS-рукопожатия до Discord и YouTube. Запускайте до и после включения zapret,
            чтобы увидеть, помогает ли он.
          </div>
        </div>
        <button type="button" className="btn btn-primary gap-2" onClick={runAll} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Запустить все
        </button>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {PROBES.map((probe) => (
            <ProbeCard
              key={probe.target.id}
              probe={probe}
              state={results[probe.target.id] ?? null}
              onRun={() => runOne(probe)}
              disabled={busy}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ProbeCard({
  probe,
  state,
  onRun,
  disabled
}: {
  probe: ProbeDef
  state: PingResult | 'running' | null
  onRun: () => void
  disabled: boolean
}): JSX.Element {
  const running = state === 'running'
  const result = state && state !== 'running' ? state : null
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <probe.Icon className="h-7 w-7 shrink-0" style={{ color: probe.color }} />
          <div className="min-w-0">
            <div className="font-medium truncate">{probe.target.label}</div>
            <div className="text-[11px] text-fg-subtle truncate">
              {probe.target.host}:{probe.target.port}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={onRun}
          disabled={disabled || running}
        >
          {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
          {running ? 'Замер…' : 'Запустить'}
        </button>
      </div>

      {result && (
        <>
          <div className="mb-2 grid grid-cols-4 gap-2">
            <Stat label="min" value={formatMs(result.min)} />
            <Stat label="avg" value={formatMs(result.avg)} tone={toneForMs(result.avg)} />
            <Stat label="max" value={formatMs(result.max)} />
            <Stat
              label="ok"
              value={`${Math.round(result.successRate * 100)}%`}
              tone={result.successRate >= 1 ? 'ok' : result.successRate > 0 ? 'warn' : 'bad'}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {result.attempts.map((a, i) => (
              <span
                key={i}
                className={cn(
                  'rounded px-1.5 py-0.5 text-[11px] font-mono',
                  a.ok ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
                )}
                title={a.error ?? ''}
              >
                {a.ok ? `${a.ms}ms` : '×'}
              </span>
            ))}
          </div>
          {result.successRate === 0 && result.attempts[0]?.error && (
            <div className="mt-2 text-[11px] text-danger">{result.attempts[0].error}</div>
          )}
        </>
      )}
      {!result && !running && (
        <div className="text-xs text-fg-subtle">
          {ATTEMPTS} замеров, таймаут {TIMEOUT_MS / 1000}с
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone?: 'ok' | 'warn' | 'bad'
}): JSX.Element {
  return (
    <div className="rounded-md border border-border bg-bg-raised/50 p-2">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">{label}</div>
      <div
        className={cn(
          'font-mono text-sm font-medium',
          tone === 'ok' && 'text-success',
          tone === 'warn' && 'text-warning',
          tone === 'bad' && 'text-danger'
        )}
      >
        {value}
      </div>
    </div>
  )
}

function formatMs(v: number | null): string {
  return v === null ? '—' : `${v}ms`
}

function toneForMs(ms: number | null): 'ok' | 'warn' | 'bad' | undefined {
  if (ms === null) return 'bad'
  if (ms < 200) return 'ok'
  if (ms < 800) return 'warn'
  return 'bad'
}
