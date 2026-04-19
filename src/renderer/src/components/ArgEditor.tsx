import { Plus, Trash2 } from 'lucide-react'
import type { ArgEntry } from '@shared/types'

interface Props {
  args: ArgEntry[]
  onChange: (args: ArgEntry[]) => void
  readOnly?: boolean
  hintNames?: string[]
}

// A reasonable subset of winws flags with hints, extracted from Flowseal's strategies.
const SUGGESTIONS = [
  'wf-tcp',
  'wf-udp',
  'filter-tcp',
  'filter-udp',
  'filter-l7',
  'filter-l3',
  'hostlist',
  'hostlist-exclude',
  'hostlist-domains',
  'ipset',
  'ipset-exclude',
  'ip-id',
  'dpi-desync',
  'dpi-desync-repeats',
  'dpi-desync-split-seqovl',
  'dpi-desync-split-seqovl-pattern',
  'dpi-desync-split-pos',
  'dpi-desync-fake-quic',
  'dpi-desync-fake-tls',
  'dpi-desync-fake-tls-mod',
  'dpi-desync-fake-http',
  'dpi-desync-fake-unknown-udp',
  'dpi-desync-fooling',
  'dpi-desync-badseq-increment',
  'dpi-desync-any-protocol',
  'dpi-desync-cutoff',
  'dpi-desync-hostfakesplit-mod',
  'dpi-desync-fakedsplit-pattern'
]

export default function ArgEditor({ args, onChange, readOnly, hintNames }: Props): JSX.Element {
  const update = (i: number, patch: Partial<ArgEntry>): void => {
    onChange(args.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }
  const remove = (i: number): void => onChange(args.filter((_, idx) => idx !== i))
  const add = (): void => onChange([...args, { name: hintNames?.[0] ?? 'filter-tcp', value: '' }])
  const move = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= args.length) return
    const next = [...args]
    ;[next[i], next[j]] = [next[j]!, next[i]!]
    onChange(next)
  }

  return (
    <div className="flex flex-col gap-1.5">
      {args.length === 0 && (
        <div className="rounded-md border border-dashed border-border py-4 text-center text-xs text-fg-subtle">
          Нет аргументов
        </div>
      )}
      {args.map((a, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="select-none pl-1 text-fg-subtle">--</span>
          <input
            className="input input-sm w-56 font-mono"
            list="zapret-arg-suggestions"
            value={a.name}
            onChange={(e) => update(i, { name: e.target.value.replace(/^--/, '') })}
            placeholder="flag-name"
            disabled={readOnly}
          />
          <span className="text-fg-subtle">=</span>
          <input
            className="input input-sm flex-1 font-mono"
            value={a.value}
            onChange={(e) => update(i, { value: e.target.value })}
            placeholder="значение (пусто = boolean-флаг)"
            disabled={readOnly}
          />
          {!readOnly && (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                title="Вверх"
                onClick={() => move(i, -1)}
              >
                ↑
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                title="Вниз"
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                title="Удалить"
                onClick={() => remove(i)}
              >
                <Trash2 className="h-3.5 w-3.5 text-danger" />
              </button>
            </>
          )}
        </div>
      ))}
      {!readOnly && (
        <button type="button" className="btn btn-ghost self-start text-xs" onClick={add}>
          <Plus className="h-3.5 w-3.5" />
          Добавить аргумент
        </button>
      )}
      <datalist id="zapret-arg-suggestions">
        {SUGGESTIONS.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  )
}
