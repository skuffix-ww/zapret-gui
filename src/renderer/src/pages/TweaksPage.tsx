import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Check,
  Loader2,
  Megaphone,
  RotateCcw,
  Search,
  ShieldOff,
  Sparkles,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import type { TweakInfo, TweakState } from '@shared/types'
import { cn } from '../lib/cn'
import { useApp } from '../store'

type Category = TweakInfo['category']

const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon }> = {
  telemetry: { label: 'Телеметрия', icon: ShieldOff },
  ads: { label: 'Реклама', icon: Megaphone },
  search: { label: 'Поиск / Cortana', icon: Search },
  edge: { label: 'Microsoft Edge', icon: Sparkles },
  system: { label: 'Система', icon: Wrench }
}

const CATEGORY_ORDER: Category[] = ['telemetry', 'ads', 'search', 'edge', 'system']

export default function TweaksPage(): JSX.Element {
  const { isAdmin } = useApp()
  const [tweaks, setTweaks] = useState<TweakInfo[]>([])
  const [stateMap, setStateMap] = useState<Record<string, TweakState>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})

  useEffect(() => {
    void Promise.all([window.api.tweaks.list(), window.api.tweaks.state()]).then(
      ([list, state]) => {
        setTweaks(list)
        setStateMap(Object.fromEntries(state.map((s) => [s.id, s])))
      }
    )
  }, [])

  const grouped = useMemo(() => {
    const map: Record<Category, TweakInfo[]> = {
      telemetry: [],
      ads: [],
      search: [],
      edge: [],
      system: []
    }
    for (const t of tweaks) map[t.category].push(t)
    return map
  }, [tweaks])

  const appliedCount = useMemo(
    () => Object.values(stateMap).filter((s) => s.applied).length,
    [stateMap]
  )

  const toggle = async (tweak: TweakInfo): Promise<void> => {
    if (busy[tweak.id]) return
    setBusy((b) => ({ ...b, [tweak.id]: true }))
    try {
      const applied = stateMap[tweak.id]?.applied ?? false
      const next = applied
        ? await window.api.tweaks.revert(tweak.id)
        : await window.api.tweaks.apply(tweak.id)
      setStateMap((m) => ({ ...m, [tweak.id]: next }))
    } catch (e) {
      alert(`Не удалось ${stateMap[tweak.id]?.applied ? 'отменить' : 'применить'} твик: ${(e as Error).message}`)
    } finally {
      setBusy((b) => ({ ...b, [tweak.id]: false }))
    }
  }

  const applyAll = async (): Promise<void> => {
    if (!confirm('Применить все твики? Перед каждым применением сохраняется бэкап реестра.')) return
    for (const t of tweaks) {
      if (stateMap[t.id]?.applied) continue
      await toggle(t)
    }
  }

  const revertAll = async (): Promise<void> => {
    if (!confirm('Откатить все применённые твики?')) return
    for (const t of tweaks) {
      if (!stateMap[t.id]?.applied) continue
      await toggle(t)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <ShieldOff className="h-5 w-5 text-accent" />
            <h2 className="text-xl font-semibold">Твики приватности</h2>
          </div>
          <div className="text-sm text-fg-muted">
            Отключение телеметрии, рекламы и Cortana через политики реестра. Перед каждым применением
            UnLimit сохраняет старые значения и умеет откатывать обратно.
          </div>
          {!isAdmin && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Запустите UnLimit от администратора — твики HKLM не применятся
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="chip">
            <Check className="h-3 w-3" />
            Применено: {appliedCount} / {tweaks.length}
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-xs" onClick={revertAll} disabled={appliedCount === 0}>
              <RotateCcw className="h-3.5 w-3.5" />
              Откатить всё
            </button>
            <button type="button" className="btn btn-primary text-xs" onClick={applyAll} disabled={appliedCount === tweaks.length}>
              <Check className="h-3.5 w-3.5" />
              Применить всё
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-5">
        <div className="space-y-6">
          {CATEGORY_ORDER.filter((c) => grouped[c].length > 0).map((cat) => {
            const meta = CATEGORY_META[cat]
            const Icon = meta.icon
            return (
              <section key={cat}>
                <div className="mb-3 flex items-center gap-2">
                  <Icon className="h-4 w-4 text-accent" />
                  <h3 className="text-base font-semibold">{meta.label}</h3>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {grouped[cat].map((t) => (
                    <TweakCard
                      key={t.id}
                      tweak={t}
                      state={stateMap[t.id] ?? { id: t.id, applied: false, appliedAt: null }}
                      busy={!!busy[t.id]}
                      onToggle={() => toggle(t)}
                    />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function TweakCard({
  tweak,
  state,
  busy,
  onToggle
}: {
  tweak: TweakInfo
  state: TweakState
  busy: boolean
  onToggle: () => void
}): JSX.Element {
  return (
    <div className={cn('card card-hover p-4', state.applied && 'border-success/40')}>
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggle}
          disabled={busy}
          className={cn(
            'mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors',
            state.applied
              ? 'border-success/50 bg-success/30 justify-end'
              : 'border-border bg-bg-subtle justify-start',
            busy && 'opacity-50'
          )}
          title={state.applied ? 'Откатить' : 'Применить'}
        >
          <span
            className={cn(
              'mx-0.5 h-4 w-4 rounded-full transition-colors',
              busy ? 'bg-fg-subtle' : state.applied ? 'bg-success' : 'bg-fg-muted'
            )}
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin text-bg" />}
          </span>
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="font-medium leading-tight">{tweak.label}</div>
            {state.applied && (
              <span className="chip border-success/40 bg-success/10 text-success text-[10px]">
                <Check className="h-3 w-3" />
                включено
              </span>
            )}
            {tweak.requiresRestart && (
              <span className="chip text-[10px]">требуется перезагрузка</span>
            )}
          </div>
          <p className="mt-1 text-[12.5px] leading-snug text-fg-muted">{tweak.description}</p>
          {tweak.warning && (
            <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-warning">
              <AlertTriangle className="h-3 w-3" />
              {tweak.warning}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
