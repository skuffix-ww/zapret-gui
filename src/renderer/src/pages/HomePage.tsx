import { useMemo, useState } from 'react'
import {
  Play,
  Square,
  Copy,
  Pencil,
  Trash2,
  FileDown,
  FileUp,
  Plus,
  Star,
  Search,
  Terminal
} from 'lucide-react'
import { useApp } from '../store'
import { cn } from '../lib/cn'
import LogPanel from '../components/LogPanel'

export default function HomePage(): JSX.Element {
  const {
    profiles,
    activeProfileId,
    setActive,
    runState,
    start,
    stop,
    deleteProfile,
    duplicateProfile,
    openEditor,
    refreshProfiles
  } = useApp()
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const filtered = useMemo(
    () => profiles.filter((p) => p.name.toLowerCase().includes(query.toLowerCase())),
    [profiles, query]
  )

  const active = profiles.find((p) => p.id === activeProfileId) ?? null
  const isRunning = runState.status === 'running' || runState.status === 'starting'

  const handleStartStop = async (): Promise<void> => {
    setError(null)
    try {
      if (isRunning) await stop()
      else await start()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleImport = async (): Promise<void> => {
    setError(null)
    try {
      const p = await window.api.profiles.importBat()
      if (p) {
        await refreshProfiles()
        setActive(p.id)
      }
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleExport = async (): Promise<void> => {
    if (!active) return
    try {
      const r = await window.api.profiles.exportBat(active)
      if (r) await window.api.system.openPath(r.replace(/[\\/][^\\/]+$/, ''))
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleNew = async (): Promise<void> => {
    const now = Date.now()
    const blank = {
      id: '',
      name: 'Новый профиль',
      builtin: false,
      description: '',
      globalArgs: [
        { name: 'wf-tcp', value: '80,443' },
        { name: 'wf-udp', value: '443' }
      ],
      sections: [
        {
          label: 'TCP 443 → fake',
          args: [
            { name: 'filter-tcp', value: '443' },
            { name: 'dpi-desync', value: 'fake' },
            { name: 'dpi-desync-repeats', value: '6' }
          ]
        }
      ],
      updatedAt: now
    }
    const saved = await window.api.profiles.save(blank)
    await refreshProfiles()
    setActive(saved.id)
    openEditor(saved.id)
  }

  return (
    <div className="flex h-full">
      {/* Profile list */}
      <div className="flex w-80 flex-col border-r border-border">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
            <input
              className="input pl-7"
              placeholder="Поиск профиля…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button type="button" className="btn btn-icon" title="Импорт .bat" onClick={handleImport}>
            <FileUp className="h-4 w-4" />
          </button>
          <button type="button" className="btn btn-icon btn-primary" title="Новый профиль" onClick={handleNew}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-2">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-sm text-fg-subtle">Ничего не найдено</div>
          )}
          {filtered.map((p) => {
            const selected = p.id === activeProfileId
            return (
              <button
                type="button"
                key={p.id}
                onClick={() => setActive(p.id)}
                className={cn(
                  'group mb-1 flex w-full items-center gap-2 rounded-md border px-2.5 py-2 text-left transition-colors',
                  selected
                    ? 'border-accent/60 bg-accent/10'
                    : 'border-transparent hover:border-border hover:bg-bg-hover/60'
                )}
              >
                {p.builtin ? (
                  <Star className="h-3.5 w-3.5 shrink-0 text-warning" />
                ) : (
                  <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                )}
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm', selected ? 'font-semibold' : 'font-medium')}>
                    {p.name}
                  </div>
                  <div className="truncate text-[11px] text-fg-subtle">
                    {p.builtin ? 'встроенный · ' : ''}
                    {p.sections.length} {plural(p.sections.length, 'секция', 'секции', 'секций')}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col">
        {active ? (
          <>
            <div className="flex items-start justify-between gap-4 border-b border-border p-5">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <h2 className="truncate text-xl font-semibold">{active.name}</h2>
                  {active.builtin && (
                    <span className="chip">
                      <Star className="h-3 w-3 text-warning" />
                      Встроенный
                    </span>
                  )}
                </div>
                {active.description && (
                  <div className="text-sm text-fg-muted">{active.description}</div>
                )}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="chip">{active.sections.length} секций</span>
                  <span className="chip">{active.globalArgs.length} глобальных флагов</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={handleStartStop}
                  className={cn(
                    'btn gap-2 text-base px-5 py-2.5',
                    isRunning ? 'btn-danger' : 'btn-primary'
                  )}
                >
                  {isRunning ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  {isRunning ? 'Остановить' : 'Запустить'}
                </button>
                <div className="flex gap-1">
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Редактировать"
                    onClick={() => openEditor(active.id)}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Дублировать"
                    onClick={async () => {
                      try {
                        await duplicateProfile(active.id)
                      } catch (e) {
                        setError((e as Error).message)
                      }
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Экспорт в .bat"
                    onClick={handleExport}
                  >
                    <FileDown className="h-4 w-4" />
                  </button>
                  {!active.builtin && (
                    <button
                      type="button"
                      className="btn btn-icon"
                      title="Удалить"
                      onClick={() => {
                        if (confirm(`Удалить «${active.name}»?`)) void deleteProfile(active.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {error && (
              <div className="border-b border-danger/40 bg-danger/10 px-5 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 overflow-auto p-5">
                <div className="mb-2 flex items-center justify-between">
                  <div className="section-title">Секции стратегии</div>
                  <button
                    type="button"
                    className="btn btn-ghost text-xs"
                    onClick={() => openEditor(active.id)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Открыть редактор
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {active.sections.map((s, i) => (
                    <div
                      key={i}
                      className={cn(
                        'card p-3 text-sm',
                        s.disabled && 'opacity-50'
                      )}
                    >
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="text-xs text-fg-subtle">Секция #{i + 1}</div>
                        {s.disabled && <span className="chip">отключена</span>}
                      </div>
                      <div className="font-medium">{s.label}</div>
                      <div className="mt-1.5 text-[11px] leading-snug text-fg-subtle">
                        {s.args.length} флагов
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="h-64 shrink-0 border-t border-border">
                <div className="flex items-center gap-2 border-b border-border px-4 py-1.5 text-xs text-fg-subtle">
                  <Terminal className="h-3.5 w-3.5" />
                  Логи winws.exe
                </div>
                <LogPanel />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-fg-muted">
            Выберите профиль слева
          </div>
        )}
      </div>
    </div>
  )
}

function plural(n: number, one: string, few: string, many: string): string {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return one
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few
  return many
}
