import { useEffect, useRef } from 'react'
import { Eraser } from 'lucide-react'
import { useApp } from '../store'

const LEVEL_STYLE: Record<string, string> = {
  info: 'text-fg-muted',
  warn: 'text-warning',
  error: 'text-danger',
  debug: 'text-fg-subtle',
  stdout: 'text-fg',
  stderr: 'text-warning'
}

export default function LogPanel(): JSX.Element {
  const { logs, clearLogs } = useApp()
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottom = useRef(true)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    if (stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [logs])

  const onScroll = (e: React.UIEvent<HTMLDivElement>): void => {
    const el = e.currentTarget
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex-1 overflow-auto bg-bg px-4 py-2 font-mono text-[11.5px] leading-relaxed"
      >
        {logs.length === 0 && (
          <div className="py-4 text-fg-subtle">Журнал пуст. Запустите профиль, чтобы увидеть вывод winws.exe.</div>
        )}
        {logs.map((e) => (
          <div key={e.id} className="flex gap-2">
            <span className="shrink-0 text-fg-subtle">{formatTs(e.ts)}</span>
            <span className={`shrink-0 w-12 ${LEVEL_STYLE[e.level] ?? 'text-fg-muted'}`}>
              {e.level.toUpperCase()}
            </span>
            <span className={`whitespace-pre-wrap break-all ${LEVEL_STYLE[e.level] ?? 'text-fg'}`}>
              {e.message}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-border bg-bg-subtle/60 px-3 py-1.5 text-xs text-fg-subtle">
        <div>{logs.length} записей</div>
        <button type="button" className="btn btn-ghost text-xs" onClick={clearLogs}>
          <Eraser className="h-3.5 w-3.5" />
          Очистить
        </button>
      </div>
    </div>
  )
}

function formatTs(ts: number): string {
  const d = new Date(ts)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}
