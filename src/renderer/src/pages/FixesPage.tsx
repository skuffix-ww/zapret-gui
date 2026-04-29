import { useEffect, useState } from 'react'
import { Check, Gamepad2, Loader2, RotateCcw } from 'lucide-react'
import type { FixState, GameFixInfo } from '@shared/types'
import { cn } from '../lib/cn'

type FixItem = GameFixInfo & FixState

const FAVICON_DOMAIN: Record<string, string> = {
  sbox: 'sbox.game',
  roblox: 'roblox.com',
  rust: 'rust.facepunch.com',
  apex: 'ea.com',
  cs2: 'store.steampowered.com',
  discord: 'discord.com',
  youtube: 'youtube.com',
  twitch: 'twitch.tv',
  spotify: 'spotify.com',
  chatgpt: 'chatgpt.com'
}

export default function FixesPage(): JSX.Element {
  const [fixes, setFixes] = useState<FixItem[]>([])
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  const load = async (): Promise<void> => {
    const list = await window.api.fixes.list()
    setFixes(list)
  }

  useEffect(() => {
    void load()
  }, [])

  const appliedCount = fixes.filter((f) => f.applied).length

  const toggle = async (fix: FixItem): Promise<void> => {
    if (busy[fix.id]) return
    setBusy((b) => ({ ...b, [fix.id]: true }))
    try {
      const next = fix.applied
        ? await window.api.fixes.revert(fix.id)
        : await window.api.fixes.apply(fix.id)
      setFixes((prev) =>
        prev.map((f) => (f.id === fix.id ? { ...f, ...next } : f))
      )
    } catch (e) {
      alert(`Ошибка: ${(e as Error).message}`)
    } finally {
      setBusy((b) => ({ ...b, [fix.id]: false }))
    }
  }

  const applyAll = async (): Promise<void> => {
    for (const f of fixes) {
      if (f.applied) continue
      await toggle(f)
    }
  }

  const revertAll = async (): Promise<void> => {
    for (const f of fixes) {
      if (!f.applied) continue
      await toggle(f)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Gamepad2 className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Фиксы для игр и сервисов</h2>
          </div>
          <div className="text-sm text-fg-muted">
            Добавляет домены в <span className="font-mono text-[12px] text-fg-subtle">list-general-user.txt</span>,
            чтобы winws применял стратегию к их трафику. Включайте нужные — перезапуск не требуется.
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="chip">
            <Check className="h-3 w-3" />
            Включено: {appliedCount} / {fixes.length}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-xs" onClick={revertAll} disabled={appliedCount === 0}>
              <RotateCcw className="h-3.5 w-3.5" />
              Сбросить всё
            </button>
            <button type="button" className="btn btn-primary text-xs" onClick={applyAll} disabled={appliedCount === fixes.length}>
              <Check className="h-3.5 w-3.5" />
              Включить всё
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {fixes.map((fix) => (
            <FixCard
              key={fix.id}
              fix={fix}
              busy={!!busy[fix.id]}
              onToggle={() => toggle(fix)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function FixCard({
  fix,
  busy,
  onToggle
}: {
  fix: FixItem
  busy: boolean
  onToggle: () => void
}): JSX.Element {
  const faviconDomain = FAVICON_DOMAIN[fix.id] ?? fix.domains[0]
  const faviconUrl = `https://www.google.com/s2/favicons?domain=${faviconDomain}&sz=64`

  return (
    <div className={cn('card card-hover p-4 transition-all', fix.applied && 'border-success/40')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={cn(
            'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
            fix.applied
              ? 'border-success/50 bg-success/30 justify-end'
              : 'border-border bg-bg-subtle justify-start',
            busy && 'opacity-50'
          )}
          title={fix.applied ? 'Отключить' : 'Включить'}
        >
          <span
            className={cn(
              'mx-0.5 h-4 w-4 rounded-full transition-colors',
              busy ? 'bg-fg-subtle' : fix.applied ? 'bg-success' : 'bg-fg-muted'
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin text-bg" />}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <img src={faviconUrl} alt={fix.label} className="h-4 w-4 rounded-sm" />
              <span className="font-medium leading-tight">{fix.label}</span>
            </div>
            {fix.applied && (
              <span className="chip border-success/40 bg-success/10 text-success text-[10px]">
                <Check className="h-3 w-3" />
                включено
              </span>
            )}
            {!fix.applied && fix.present > 0 && (
              <span className="chip text-[10px] border-warning/40 bg-warning/10 text-warning">
                частично ({fix.present}/{fix.total})
              </span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{fix.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {fix.domains.map((d) => (
              <span key={d} className="inline-block rounded bg-bg-subtle px-1.5 py-0.5 text-[10px] font-mono text-fg-subtle">
                {d}
              </span>
            ))}
          </div>
          {fix.ipsetsTotal !== undefined && fix.ipsetsTotal > 0 && (
            <div className="mt-2 text-[10px] text-fg-subtle">
              + {fix.ipsetsTotal} IP-сетей в <span className="font-mono">ipset-all.txt</span>
              {fix.ipsetsPresent !== undefined && fix.ipsetsPresent > 0 && fix.ipsetsPresent < fix.ipsetsTotal && (
                <span className="text-warning"> (применено {fix.ipsetsPresent})</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
