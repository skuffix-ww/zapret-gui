import { useEffect, useMemo, useState } from 'react'
import { Activity, Globe, Loader2, Play, Trophy } from 'lucide-react'
import type { PingResult, PingTarget } from '@shared/types'
import { cn } from '../lib/cn'
import { useApp } from '../store'

interface ProbeDef {
  target: PingTarget
  category: string
  color: string
  /** Domain used for favicon resolution. */
  faviconDomain: string
}

const PROBES: ProbeDef[] = [
  // Discord
  { target: { id: 'discord', label: 'Discord', host: 'discord.com', port: 443 }, category: 'Discord', color: '#5865F2', faviconDomain: 'discord.com' },
  { target: { id: 'discord-gateway', label: 'Discord Gateway', host: 'gateway.discord.gg', port: 443 }, category: 'Discord', color: '#5865F2', faviconDomain: 'discord.com' },
  { target: { id: 'discord-cdn', label: 'Discord CDN', host: 'cdn.discordapp.com', port: 443 }, category: 'Discord', color: '#5865F2', faviconDomain: 'discord.com' },
  { target: { id: 'discord-media', label: 'Discord Media', host: 'media.discordapp.net', port: 443 }, category: 'Discord', color: '#5865F2', faviconDomain: 'discord.com' },
  // YouTube
  { target: { id: 'youtube', label: 'YouTube', host: 'www.youtube.com', port: 443 }, category: 'YouTube', color: '#FF0000', faviconDomain: 'youtube.com' },
  { target: { id: 'youtube-api', label: 'YouTube API', host: 'youtubei.googleapis.com', port: 443 }, category: 'YouTube', color: '#FF0000', faviconDomain: 'youtube.com' },
  { target: { id: 'googlevideo', label: 'GoogleVideo CDN', host: 'rr5---sn-q4f7snes.googlevideo.com', port: 443 }, category: 'YouTube', color: '#FF0000', faviconDomain: 'youtube.com' },
  // Cloudflare / прочее
  { target: { id: 'cloudflare', label: 'Cloudflare DNS', host: '1.1.1.1', port: 443 }, category: 'Прочее', color: '#F38020', faviconDomain: 'cloudflare.com' },
  { target: { id: 'github', label: 'GitHub', host: 'github.com', port: 443 }, category: 'Прочее', color: '#a0a4a8', faviconDomain: 'github.com' },
  { target: { id: 'twitch', label: 'Twitch', host: 'www.twitch.tv', port: 443 }, category: 'Прочее', color: '#9146FF', faviconDomain: 'twitch.tv' },
  { target: { id: 'steam', label: 'Steam Store', host: 'store.steampowered.com', port: 443 }, category: 'Прочее', color: '#1B2838', faviconDomain: 'store.steampowered.com' },
  { target: { id: 'telegram', label: 'Telegram Web', host: 'web.telegram.org', port: 443 }, category: 'Прочее', color: '#26A5E4', faviconDomain: 'telegram.org' },
  { target: { id: 'reddit', label: 'Reddit', host: 'www.reddit.com', port: 443 }, category: 'Прочее', color: '#FF4500', faviconDomain: 'reddit.com' },
  { target: { id: 'twitter', label: 'X (Twitter)', host: 'x.com', port: 443 }, category: 'Прочее', color: '#a0a4a8', faviconDomain: 'x.com' },
  { target: { id: 'spotify', label: 'Spotify', host: 'open.spotify.com', port: 443 }, category: 'Прочее', color: '#1DB954', faviconDomain: 'spotify.com' },
  { target: { id: 'sbox', label: 's&box (Facepunch)', host: 'sbox.facepunch.com', port: 443 }, category: 'Игры', color: '#3F8EFC', faviconDomain: 'sbox.game' },
  { target: { id: 'rust-facepunch', label: 'Rust (Facepunch)', host: 'companion-rust.facepunch.com', port: 443 }, category: 'Игры', color: '#CD412B', faviconDomain: 'rust.facepunch.com' },
  { target: { id: 'epic', label: 'Epic Games', host: 'store.epicgames.com', port: 443 }, category: 'Игры', color: '#a0a4a8', faviconDomain: 'epicgames.com' }
]

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
}

function Favicon({
  domain,
  color,
  className,
  size = 'h-5 w-5'
}: {
  domain: string
  color: string
  className?: string
  size?: string
}): JSX.Element {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <Globe className={cn(size, 'shrink-0', className)} style={{ color }} />
  }
  return (
    <img
      src={faviconUrl(domain)}
      alt=""
      onError={() => setFailed(true)}
      className={cn(size, 'shrink-0 rounded-sm object-contain', className)}
    />
  )
}

const DEFAULT_ATTEMPTS = 5
const DEFAULT_TIMEOUT = 5000

export default function DiagnosticsPage(): JSX.Element {
  const [results, setResults] = useState<Record<string, PingResult | 'running'>>({})
  const [busy, setBusy] = useState(false)
  const [attempts, setAttempts] = useState(DEFAULT_ATTEMPTS)
  const [timeoutSec, setTimeoutSec] = useState(DEFAULT_TIMEOUT / 1000)
  const { pendingDiagnosticsRun, consumePendingDiagnostics } = useApp()

  const runOne = async (probe: ProbeDef): Promise<void> => {
    setResults((r) => ({ ...r, [probe.target.id]: 'running' }))
    try {
      const res = await window.api.diag.ping(probe.target, {
        attempts,
        timeoutMs: Math.round(timeoutSec * 1000)
      })
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
    setResults({})
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

  const categories = useMemo(() => {
    const m = new Map<string, ProbeDef[]>()
    for (const p of PROBES) {
      const list = m.get(p.category) ?? []
      list.push(p)
      m.set(p.category, list)
    }
    return [...m.entries()]
  }, [])

  const top = useMemo(() => {
    const finished: Array<{ probe: ProbeDef; res: PingResult }> = []
    for (const probe of PROBES) {
      const v = results[probe.target.id]
      if (v && v !== 'running' && v.successRate > 0 && v.avg !== null) {
        finished.push({ probe, res: v })
      }
    }
    finished.sort((a, b) => (a.res.avg ?? Infinity) - (b.res.avg ?? Infinity))
    return finished.slice(0, 5)
  }, [results])

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Activity className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Диагностика</h2>
          </div>
          <div className="text-sm text-fg-muted">
            Время TLS-рукопожатия до популярных сервисов. Запускай до и после включения UnLimit, чтобы увидеть разницу.
          </div>
        </div>
        <div className="flex items-center gap-3">
          <NumField label="Замеров" min={1} max={10} value={attempts} onChange={setAttempts} disabled={busy} />
          <NumField label="Таймаут, с" min={1} max={15} value={timeoutSec} onChange={setTimeoutSec} disabled={busy} step={0.5} />
          <button type="button" className="btn btn-primary gap-2" onClick={runAll} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Запустить все
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5 space-y-6">
        {top.length > 0 && (
          <section>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg">
              <Trophy className="h-4 w-4 text-warning" />
              Топ серверов по avg-пингу
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
              {top.map(({ probe, res }, i) => (
                <div key={probe.target.id} className="card flex items-center gap-3 p-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-bg-raised text-xs font-mono text-fg-subtle">
                    {i + 1}
                  </div>
                  <Favicon domain={probe.faviconDomain} color={probe.color} size="h-5 w-5" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{probe.target.label}</div>
                    <div className={cn('font-mono text-sm', toneClass(toneForMs(res.avg)))}>{formatMs(res.avg)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {categories.map(([cat, probes]) => (
          <section key={cat}>
            <div className="mb-2 text-sm font-semibold text-fg">{cat}</div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {probes.map((probe) => (
                <ProbeCard
                  key={probe.target.id}
                  probe={probe}
                  state={results[probe.target.id] ?? null}
                  onRun={() => runOne(probe)}
                  disabled={busy}
                  attempts={attempts}
                  timeoutSec={timeoutSec}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function NumField({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  disabled
}: {
  label: string
  min: number
  max: number
  step?: number
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}): JSX.Element {
  return (
    <label className="flex items-center gap-1.5 text-xs text-fg-muted">
      {label}
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const v = Number(e.target.value)
          if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)))
        }}
        disabled={disabled}
        className="input h-7 w-16 px-2 text-sm tabular-nums"
      />
    </label>
  )
}

function ProbeCard({
  probe,
  state,
  onRun,
  disabled,
  attempts,
  timeoutSec
}: {
  probe: ProbeDef
  state: PingResult | 'running' | null
  onRun: () => void
  disabled: boolean
  attempts: number
  timeoutSec: number
}): JSX.Element {
  const running = state === 'running'
  const result = state && state !== 'running' ? state : null
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Favicon domain={probe.faviconDomain} color={probe.color} size="h-7 w-7" />
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
          {attempts} замеров, таймаут {timeoutSec}с
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
      <div className={cn('font-mono text-sm font-medium', toneClass(tone))}>{value}</div>
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

function toneClass(tone?: 'ok' | 'warn' | 'bad'): string | undefined {
  if (tone === 'ok') return 'text-success'
  if (tone === 'warn') return 'text-warning'
  if (tone === 'bad') return 'text-danger'
  return undefined
}
