import { useEffect, useMemo, useState } from 'react'
import { Copy, Plus, Save, Trash2, EyeOff, Eye, Code2, ArrowUp, ArrowDown, Undo2, Star } from 'lucide-react'
import type { Profile, StrategySection } from '@shared/types'
import { labelForSection } from '@shared/bat-parser'
import { useApp } from '../store'
import { cn } from '../lib/cn'
import ArgEditor from '../components/ArgEditor'

export default function EditorPage(): JSX.Element {
  const { editingProfileId, profiles, saveProfile, setRoute, duplicateProfile, refreshProfiles, setActive } = useApp()
  const source = profiles.find((p) => p.id === editingProfileId) ?? null
  const [draft, setDraft] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  useEffect(() => {
    setDraft(source ? structuredClone(source) : null)
  }, [editingProfileId, source?.updatedAt])

  if (!draft || !source) {
    return <div className="p-8 text-fg-muted">Выберите профиль на главной.</div>
  }

  const dirty = JSON.stringify(source) !== JSON.stringify(draft)
  const isBuiltin = !!source.builtin

  const update = (partial: Partial<Profile>): void => setDraft({ ...draft, ...partial })
  const updateSection = (i: number, s: Partial<StrategySection>): void => {
    const sections = draft.sections.map((x, idx) => (idx === i ? { ...x, ...s } : x))
    setDraft({ ...draft, sections })
  }
  const relabel = (i: number): void => {
    const s = draft.sections[i]!
    updateSection(i, { label: labelForSection(s.args) })
  }

  const move = (i: number, dir: -1 | 1): void => {
    const j = i + dir
    if (j < 0 || j >= draft.sections.length) return
    const sections = [...draft.sections]
    ;[sections[i], sections[j]] = [sections[j]!, sections[i]!]
    setDraft({ ...draft, sections })
  }
  const remove = (i: number): void => setDraft({ ...draft, sections: draft.sections.filter((_, idx) => idx !== i) })
  const addSection = (): void =>
    setDraft({
      ...draft,
      sections: [
        ...draft.sections,
        {
          label: 'Новая секция',
          args: [
            { name: 'filter-tcp', value: '443' },
            { name: 'dpi-desync', value: 'fake' }
          ]
        }
      ]
    })

  const handleDuplicateToEdit = async (): Promise<void> => {
    try {
      const copy = await duplicateProfile(source.id, `${source.name} (правка)`)
      setActive(copy.id)
      useApp.setState({ editingProfileId: copy.id })
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const handleSave = async (): Promise<void> => {
    try {
      await saveProfile(draft)
      await refreshProfiles()
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border p-4">
        <div className="min-w-0 flex-1">
          <input
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            disabled={isBuiltin}
            className="input w-full text-lg font-semibold"
          />
          <input
            value={draft.description ?? ''}
            onChange={(e) => update({ description: e.target.value })}
            placeholder="Описание (необязательно)"
            disabled={isBuiltin}
            className="input mt-1.5 w-full text-xs"
          />
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {isBuiltin ? (
            <>
              <span className="chip">
                <Star className="h-3 w-3 text-warning" />
                Встроенный — только чтение
              </span>
              <button type="button" className="btn btn-primary" onClick={handleDuplicateToEdit}>
                <Copy className="h-4 w-4" />
                Дублировать для правки
              </button>
            </>
          ) : (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowPreview((v) => !v)}
                  title="Показать итоговую команду"
                >
                  <Code2 className="h-4 w-4" />
                  {showPreview ? 'Скрыть CLI' : 'Показать CLI'}
                </button>
                <button type="button" className="btn btn-primary" disabled={!dirty} onClick={handleSave}>
                  <Save className="h-4 w-4" />
                  Сохранить
                </button>
              </div>
              {dirty && (
                <button
                  type="button"
                  className="text-xs text-fg-muted hover:text-fg"
                  onClick={() => setDraft(structuredClone(source))}
                >
                  <Undo2 className="inline h-3 w-3" /> Отменить изменения
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="border-b border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {/* Global args */}
          <div className="section-title mb-2">Глобальные фильтры (до --new)</div>
          <div className="card mb-5 p-4">
            <ArgEditor
              args={draft.globalArgs}
              readOnly={isBuiltin}
              onChange={(args) => update({ globalArgs: args })}
              hintNames={['wf-tcp', 'wf-udp', 'wf-raw']}
            />
          </div>

          {/* Sections */}
          <div className="mb-2 flex items-center justify-between">
            <div className="section-title">Секции стратегии ({draft.sections.length})</div>
            {!isBuiltin && (
              <button type="button" className="btn text-xs" onClick={addSection}>
                <Plus className="h-4 w-4" />
                Добавить секцию
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3">
            {draft.sections.map((s, i) => (
              <div
                key={i}
                className={cn(
                  'card p-4',
                  s.disabled && 'opacity-60'
                )}
              >
                <div className="mb-3 flex items-center gap-2">
                  <div className="text-xs text-fg-subtle">#{i + 1}</div>
                  <input
                    value={s.label}
                    onChange={(e) => updateSection(i, { label: e.target.value })}
                    onBlur={() => !s.label && relabel(i)}
                    disabled={isBuiltin}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    className="btn btn-icon"
                    title="Пересоздать название из параметров"
                    onClick={() => relabel(i)}
                    disabled={isBuiltin}
                  >
                    ↻
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    title={s.disabled ? 'Включить' : 'Выключить'}
                    onClick={() => updateSection(i, { disabled: !s.disabled })}
                    disabled={isBuiltin}
                  >
                    {s.disabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => move(i, -1)}
                    disabled={isBuiltin || i === 0}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => move(i, 1)}
                    disabled={isBuiltin || i === draft.sections.length - 1}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-icon"
                    onClick={() => remove(i)}
                    disabled={isBuiltin}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </button>
                </div>
                <ArgEditor
                  args={s.args}
                  readOnly={isBuiltin}
                  onChange={(args) => updateSection(i, { args })}
                />
              </div>
            ))}
          </div>
        </div>

        {showPreview && (
          <div className="w-[460px] shrink-0 border-l border-border bg-bg-subtle">
            <CliPreview profile={draft} />
          </div>
        )}
      </div>
    </div>
  )
}

function CliPreview({ profile }: { profile: Profile }): JSX.Element {
  const argv = useMemo(() => {
    const lines: string[] = []
    const fmt = (a: { name: string; value: string }): string =>
      a.value === '' ? `--${a.name}` : `--${a.name}=${a.value}`
    lines.push(['winws.exe', ...profile.globalArgs.map(fmt)].join(' '))
    const enabled = profile.sections.filter((s) => !s.disabled)
    enabled.forEach((s, i) => {
      lines.push(`  --new  # секция #${i + 1}: ${s.label}`)
      lines.push('    ' + s.args.map(fmt).join(' \\\n    '))
    })
    return lines.join('\n')
  }, [profile])
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border px-4 py-2 text-xs text-fg-subtle">Итоговая команда</div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap break-all p-4 font-mono text-[11.5px] text-fg-muted">
        {argv}
      </pre>
    </div>
  )
}
