import { Download, Clock, X, ExternalLink, Sparkles } from 'lucide-react'
import { useApp } from '../store'

export default function UpdatePrompt(): JSX.Element | null {
  const { updatePrompt, dismissUpdate, remindLater, skipCurrentUpdate, installUpdate } = useApp()
  if (!updatePrompt || !updatePrompt.hasUpdate) return null
  const { latestTag, currentTag, publishedAt, htmlUrl, body } = updatePrompt

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="card relative w-[min(560px,92vw)] p-6">
        <button
          type="button"
          onClick={dismissUpdate}
          className="absolute right-3 top-3 text-fg-subtle hover:text-fg"
          title="Закрыть"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-accent">Flowseal / zapret</div>
            <h2 className="text-lg font-semibold">Вышла новая версия {latestTag}</h2>
            <div className="mt-0.5 text-xs text-fg-muted">
              Текущая установлена: {currentTag ?? '—'}
              {publishedAt ? ` · опубликована ${formatDate(publishedAt)}` : ''}
            </div>
          </div>
        </div>

        {body && (
          <div className="mb-4 max-h-40 overflow-auto rounded-md border border-border bg-bg-subtle p-3 text-xs leading-relaxed text-fg-muted whitespace-pre-wrap">
            {truncate(body, 800)}
          </div>
        )}

        <p className="mb-5 text-sm text-fg-muted">Хотите скачать и установить обновление сейчас?</p>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {htmlUrl && (
            <a
              href={htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost mr-auto text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Что нового
            </a>
          )}
          <button type="button" className="btn" onClick={() => void skipCurrentUpdate()}>
            Нет
          </button>
          <button type="button" className="btn" onClick={() => void remindLater(24)}>
            <Clock className="h-4 w-4" />
            Напомнить позже
          </button>
          <button type="button" className="btn btn-primary" onClick={() => void installUpdate()}>
            <Download className="h-4 w-4" />
            Да, скачать
          </button>
        </div>
      </div>
    </div>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return iso
  }
}
function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '…' : s
}
