import { useState } from 'react'
import { Download, FolderOpen, ShieldAlert, Check, AlertTriangle } from 'lucide-react'
import { useApp } from '../store'

export default function SetupPage(): JSX.Element {
  const { setSettings, setRoute, download, isAdmin } = useApp()
  const [mode, setMode] = useState<'download' | 'existing'>('download')
  const [path, setPath] = useState<string>('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validated, setValidated] = useState<{ ok: boolean; reason?: string } | null>(null)

  const pick = async (): Promise<void> => {
    const r = await window.api.install.pickFolder(
      mode === 'download' ? 'Куда установить zapret' : 'Укажите папку с установленным zapret'
    )
    if (r) {
      setPath(r)
      if (mode === 'existing') setValidated(await window.api.install.validate(r))
      else setValidated(null)
    }
  }

  const proceed = async (): Promise<void> => {
    setError(null)
    setBusy(true)
    try {
      if (mode === 'download') {
        await window.api.install.download(path)
        await setSettings({ installPath: path })
      } else {
        const v = await window.api.install.validate(path)
        if (!v.ok) throw new Error(v.reason ?? 'Папка не подходит')
        await setSettings({ installPath: path })
      }
      setRoute('home')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center p-8">
      <div className="card w-full max-w-2xl p-8">
        <div className="mb-1 text-[11px] uppercase tracking-wider text-accent">Первый запуск</div>
        <h1 className="mb-2 text-2xl font-semibold">Настройка установки Zapret</h1>
        <p className="mb-6 max-w-prose text-sm text-fg-muted">
          Приложение — удобная оболочка поверх{' '}
          <span className="text-fg">zapret-discord-youtube</span> от Flowseal. Для работы нужны{' '}
          <code className="text-fg">winws.exe</code> и папка <code className="text-fg">lists/</code>{' '}
          из официального релиза.
        </p>

        <div className="mb-5 grid grid-cols-2 gap-3">
          <ModeCard
            selected={mode === 'download'}
            onClick={() => setMode('download')}
            title="Скачать с GitHub"
            desc="Последний релиз Flowseal, автоматически."
            Icon={Download}
          />
          <ModeCard
            selected={mode === 'existing'}
            onClick={() => setMode('existing')}
            title="Указать установленный"
            desc="У меня уже есть папка с winws.exe."
            Icon={FolderOpen}
          />
        </div>

        <label className="mb-2 block text-sm font-medium text-fg-muted">
          {mode === 'download' ? 'Папка для установки' : 'Папка с уже установленным zapret'}
        </label>
        <div className="mb-4 flex gap-2">
          <input
            className="input"
            placeholder="C:\Programs\zapret"
            value={path}
            onChange={(e) => setPath(e.target.value)}
          />
          <button type="button" className="btn" onClick={pick}>
            <FolderOpen className="h-4 w-4" />
            Обзор
          </button>
        </div>

        {mode === 'existing' && validated && (
          <div
            className={`mb-4 flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
              validated.ok
                ? 'border-success/40 bg-success/5 text-success'
                : 'border-warning/40 bg-warning/5 text-warning'
            }`}
          >
            {validated.ok ? <Check className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            {validated.ok ? 'Установка валидна.' : validated.reason ?? 'Проверка не прошла'}
          </div>
        )}

        {mode === 'download' && download.phase !== 'idle' && (
          <div className="mb-4 rounded-md border border-border bg-bg-subtle p-3">
            <div className="mb-2 text-sm text-fg">{download.message}</div>
            <ProgressBar value={download.bytesDone} max={download.bytesTotal} />
          </div>
        )}

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!isAdmin && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            <ShieldAlert className="h-4 w-4" />
            Запустите приложение от имени администратора — иначе WinDivert не получит доступ к сетевому трафику.
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={!path || busy || (mode === 'existing' && !!validated && !validated.ok)}
            onClick={proceed}
          >
            {busy ? 'Подождите…' : mode === 'download' ? 'Скачать и установить' : 'Продолжить'}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModeCard({
  selected,
  onClick,
  title,
  desc,
  Icon
}: {
  selected: boolean
  onClick: () => void
  title: string
  desc: string
  Icon: typeof Download
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-2 rounded-lg border px-4 py-4 text-left transition-colors ${
        selected ? 'border-accent bg-accent/10' : 'border-border bg-bg-raised hover:border-border-strong'
      }`}
    >
      <Icon className={`h-5 w-5 ${selected ? 'text-accent' : 'text-fg-muted'}`} />
      <div className="text-sm font-semibold">{title}</div>
      <div className="text-xs text-fg-muted">{desc}</div>
    </button>
  )
}

function ProgressBar({ value, max }: { value: number; max: number }): JSX.Element {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-bg-hover">
      <div className="h-full bg-accent transition-[width] duration-200" style={{ width: `${pct}%` }} />
    </div>
  )
}
