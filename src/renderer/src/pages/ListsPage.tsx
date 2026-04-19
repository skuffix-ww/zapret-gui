import { useEffect, useState } from 'react'
import { FileText, Lock, Save, Undo2 } from 'lucide-react'
import type { DomainList } from '@shared/types'
import { useApp } from '../store'
import { cn } from '../lib/cn'

export default function ListsPage(): JSX.Element {
  const { listsCatalog, settings } = useApp()
  const [current, setCurrent] = useState<string>(listsCatalog[0]?.file ?? '')
  const [loaded, setLoaded] = useState<DomainList | null>(null)
  const [draft, setDraft] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [savedTick, setSavedTick] = useState(0)

  useEffect(() => {
    if (!listsCatalog.length) return
    if (!current) setCurrent(listsCatalog[0]!.file)
  }, [listsCatalog, current])

  useEffect(() => {
    if (!current || !settings?.installPath) {
      setLoaded(null)
      setDraft('')
      return
    }
    let cancelled = false
    window.api.lists
      .read(current)
      .then((l) => {
        if (cancelled) return
        setLoaded(l)
        setDraft(l.content)
        setError(null)
      })
      .catch((e) => {
        if (cancelled) return
        setError((e as Error).message)
        setLoaded(null)
      })
    return () => {
      cancelled = true
    }
  }, [current, settings?.installPath, savedTick])

  const dirty = loaded && loaded.content !== draft
  const editable = loaded?.editable ?? false

  if (!settings?.installPath) {
    return (
      <div className="p-8 text-fg-muted">
        Сначала выберите папку установки в{' '}
        <button type="button" className="underline" onClick={() => useApp.setState({ route: 'settings' })}>
          настройках
        </button>
        .
      </div>
    )
  }

  const save = async (): Promise<void> => {
    try {
      await window.api.lists.write(current, draft)
      setSavedTick((x) => x + 1)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="flex h-full">
      <aside className="w-72 shrink-0 border-r border-border overflow-auto">
        <div className="border-b border-border px-4 py-3 text-xs text-fg-subtle">Списки доменов и IP</div>
        <div className="p-2">
          {listsCatalog.map((l) => {
            const active = current === l.file
            return (
              <button
                type="button"
                key={l.file}
                onClick={() => setCurrent(l.file)}
                className={cn(
                  'mb-1 flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm',
                  active ? 'bg-accent/10 text-fg' : 'text-fg-muted hover:bg-bg-hover/60 hover:text-fg'
                )}
              >
                {l.editable ? (
                  <FileText className="h-3.5 w-3.5 text-accent" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-fg-subtle" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{l.label}</div>
                  <div className="truncate text-[11px] text-fg-subtle">{l.file}</div>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{loaded?.label ?? '—'}</span>
              {loaded && (
                <span className="chip">
                  {editable ? 'Редактируемый' : 'Read-only (обновляется автоматически)'}
                </span>
              )}
            </div>
            <div className="text-xs text-fg-subtle">{loaded?.file}</div>
          </div>
          {editable && (
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                disabled={!dirty}
                onClick={() => loaded && setDraft(loaded.content)}
              >
                <Undo2 className="h-4 w-4" />
                Отменить
              </button>
              <button type="button" className="btn btn-primary" disabled={!dirty} onClick={save}>
                <Save className="h-4 w-4" />
                Сохранить
              </button>
            </div>
          )}
        </div>

        {error && <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>}

        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          readOnly={!editable}
          spellCheck={false}
          className="textarea flex-1 rounded-none border-none bg-bg px-4 py-3"
          placeholder={editable ? '# по одному домену / подсети на строку' : ''}
        />
      </div>
    </div>
  )
}
