import { Minus, Square, X, ShieldCheck } from 'lucide-react'
import type { RunState } from '@shared/types'
import { useApp } from '../store'

export default function Titlebar({ showNav = true }: { showNav?: boolean }): JSX.Element {
  const isAdmin = useApp((s) => s.isAdmin)
  const runState = useApp((s) => s.runState)

  return (
    <div className="drag-region flex h-9 select-none items-center border-b border-border bg-bg-subtle px-3 text-[12px]">
      <div className="flex items-center gap-2 text-fg-muted">
        <img src="/icon.ico" className="h-4 w-4" alt="" />
        <span className="font-semibold text-fg">Zapret GUI</span>
        <span className="text-fg-subtle">·</span>
        <span>Flowseal / zapret-discord-youtube</span>
      </div>
      <div className="flex-1" />
      {showNav && (
        <div className="no-drag flex items-center gap-3 pr-2">
          <StatusPill state={runState} />
          <div className="flex items-center gap-1.5 text-fg-muted">
            <ShieldCheck className={`h-3.5 w-3.5 ${isAdmin ? 'text-success' : 'text-warning'}`} />
            <span>{isAdmin ? 'Admin' : 'Без прав'}</span>
          </div>
        </div>
      )}
      <div className="no-drag flex items-center">
        <WinBtn onClick={() => window.api.window.minimize()} aria-label="Свернуть">
          <Minus className="h-3.5 w-3.5" />
        </WinBtn>
        <WinBtn onClick={() => window.api.window.maximize()} aria-label="Развернуть">
          <Square className="h-3.5 w-3.5" />
        </WinBtn>
        <WinBtn onClick={() => window.api.window.close()} aria-label="Закрыть" variant="close">
          <X className="h-3.5 w-3.5" />
        </WinBtn>
      </div>
    </div>
  )
}

function WinBtn({
  children,
  onClick,
  variant,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'close' }): JSX.Element {
  return (
    <button
      {...rest}
      onClick={onClick}
      className={`flex h-9 w-11 items-center justify-center text-fg-muted hover:text-fg ${
        variant === 'close' ? 'hover:bg-danger hover:text-white' : 'hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  )
}

function StatusPill({ state }: { state: RunState }): JSX.Element {
  const dot =
    state.status === 'running'
      ? 'bg-success animate-pulseDot'
      : state.status === 'crashed'
        ? 'bg-danger'
        : state.status === 'starting' || state.status === 'stopping'
          ? 'bg-warning animate-pulseDot'
          : 'bg-fg-subtle'
  const label =
    state.status === 'running'
      ? 'Работает'
      : state.status === 'starting'
        ? 'Запуск…'
        : state.status === 'stopping'
          ? 'Остановка…'
          : state.status === 'crashed'
            ? 'Ошибка'
            : 'Остановлено'
  return (
    <div className="flex items-center gap-2 text-fg-muted">
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      <span>{label}</span>
    </div>
  )
}
