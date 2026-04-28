import { useEffect, useState } from 'react'
import {
  Check,
  Download,
  FolderOpen,
  Play,
  RefreshCw,
  Square,
  Trash2,
  Wrench,
  Sparkles,
  CircleCheck,
  Gamepad2,
  Bell
} from 'lucide-react'
import { useApp } from '../store'
import { cn } from '../lib/cn'

export default function SettingsPage(): JSX.Element {
  const {
    settings,
    setSettings,
    serviceStatus,
    refreshServiceStatus,
    activeProfileId,
    profiles,
    download,
    isAdmin,
    checkUpdates,
    updateChecking
  } = useApp()
  const [updateNotice, setUpdateNotice] = useState<string | null>(null)
  const [pathDraft, setPathDraft] = useState<string>(settings?.installPath ?? '')
  const [busy, setBusy] = useState<null | string>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    setPathDraft(settings?.installPath ?? '')
  }, [settings?.installPath])

  useEffect(() => {
    void refreshServiceStatus()
  }, [refreshServiceStatus])

  if (!settings) return <></>

  const pick = async (): Promise<void> => {
    const r = await window.api.install.pickFolder('Выберите папку установки zapret')
    if (r) setPathDraft(r)
  }
  const applyPath = async (): Promise<void> => {
    setError(null)
    setNotice(null)
    const v = await window.api.install.validate(pathDraft)
    if (!v.ok) {
      setError(`Проверка не прошла: ${v.reason ?? 'unknown'}`)
      return
    }
    await setSettings({ installPath: pathDraft })
    setNotice('Путь обновлён.')
  }
  const redownload = async (): Promise<void> => {
    setError(null)
    setNotice(null)
    if (!pathDraft) {
      setError('Укажите путь.')
      return
    }
    setBusy('download')
    try {
      await window.api.install.download(pathDraft)
      await setSettings({ installPath: pathDraft })
      setNotice('Обновлено из последнего релиза Flowseal.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null

  const svc = async (fn: 'install' | 'uninstall' | 'start' | 'stop'): Promise<void> => {
    setError(null)
    setNotice(null)
    setBusy(`svc-${fn}`)
    try {
      if (fn === 'install') {
        if (!activeProfileId) throw new Error('Выберите профиль на главной')
        await window.api.service.install(activeProfileId)
        setNotice('Служба установлена и запущена.')
      }
      if (fn === 'uninstall') {
        await window.api.service.uninstall()
        setNotice('Служба удалена.')
      }
      if (fn === 'start') {
        await window.api.service.start()
        setNotice('Служба запущена.')
      }
      if (fn === 'stop') {
        await window.api.service.stop()
        setNotice('Служба остановлена.')
      }
      await refreshServiceStatus()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Настройки</h1>

      {error && (
        <div className="rounded-md border border-danger/40 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</div>
      )}
      {notice && (
        <div className="rounded-md border border-success/40 bg-success/10 px-4 py-2 text-sm text-success">
          <Check className="mr-1 inline h-4 w-4" />
          {notice}
        </div>
      )}

      {/* Install path */}
      <section className="card p-6">
        <div className="mb-1 text-lg font-semibold">Установка Zapret</div>
        <div className="mb-4 text-sm text-fg-muted">
          Папка с <code>bin/winws.exe</code> и <code>lists/</code>. Можно скачать заново или подключить существующую.
        </div>
        <div className="mb-2 flex gap-2">
          <input
            className="input"
            value={pathDraft}
            onChange={(e) => setPathDraft(e.target.value)}
            placeholder="C:\Programs\zapret"
          />
          <button type="button" className="btn" onClick={pick}>
            <FolderOpen className="h-4 w-4" />
            Обзор
          </button>
          <button type="button" className="btn" onClick={applyPath} disabled={!pathDraft}>
            <Check className="h-4 w-4" />
            Применить
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={redownload}
            disabled={!pathDraft || busy === 'download'}
          >
            <Download className="h-4 w-4" />
            {busy === 'download' ? 'Качаю…' : 'Обновить из релиза'}
          </button>
        </div>
        {download.phase !== 'idle' && download.phase !== 'done' && (
          <div className="mt-3 rounded-md border border-border bg-bg-subtle p-3 text-sm">
            <div className="mb-2 text-fg-muted">{download.message}</div>
            <div className="h-1.5 w-full overflow-hidden rounded bg-bg-hover">
              <div
                className="h-full bg-accent transition-[width] duration-200"
                style={{
                  width: `${download.bytesTotal ? Math.min(100, (download.bytesDone / download.bytesTotal) * 100) : 0}%`
                }}
              />
            </div>
          </div>
        )}
      </section>

      {/* Updates */}
      <section className="card p-6">
        <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-4 w-4 text-accent" />
          Обновления zapret
        </div>
        <div className="mb-4 text-sm text-fg-muted">
          Проверяет GitHub на новые релизы Flowseal. При наличии — покажется окошко с предложением обновиться.
        </div>
        <div className="mb-3 flex items-center gap-3 text-sm">
          <span className="chip">
            Установлено: <strong className="ml-1 text-fg">{settings.installedReleaseTag ?? '—'}</strong>
          </span>
          {settings.updateRemindAt && settings.updateRemindAt > Date.now() && (
            <span className="chip">
              Отложено до {new Date(settings.updateRemindAt).toLocaleString('ru-RU')}
            </span>
          )}
          {settings.updateSkippedTag && (
            <span className="chip">Пропущена: {settings.updateSkippedTag}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn btn-primary"
            disabled={updateChecking}
            onClick={async () => {
              setUpdateNotice(null)
              const info = await checkUpdates(true)
              if (!info) setUpdateNotice('Не удалось проверить. Проверьте интернет.')
              else if (!info.hasUpdate) setUpdateNotice(`У вас уже последняя версия: ${info.latestTag}`)
              // If there IS an update, the modal shows automatically via store.
            }}
          >
            <RefreshCw className={`h-4 w-4 ${updateChecking ? 'animate-spin' : ''}`} />
            {updateChecking ? 'Проверяю…' : 'Проверить обновления'}
          </button>
          <label className="ml-2 flex items-center gap-2 text-sm text-fg-muted">
            <input
              type="checkbox"
              className="h-4 w-4 accent-accent"
              checked={settings.autoCheckUpdates}
              onChange={(e) => void setSettings({ autoCheckUpdates: e.target.checked })}
            />
            Проверять автоматически при запуске
          </label>
        </div>
        {updateNotice && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm text-success">
            <CircleCheck className="h-4 w-4" />
            {updateNotice}
          </div>
        )}
      </section>

      {/* Game mode */}
      <section className="card p-6">
        <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Gamepad2 className="h-4 w-4 text-accent" />
          Игровой режим (Game mode)
        </div>
        <div className="mb-4 text-sm text-fg-muted">
          Тумблер из <code>service.bat</code> Flowseal. Включает обход DPI для игровых портов
          (Cloudflare, P2P-лобби и т.д.) — подставляется в <code>%GameFilterTCP%</code> /
          <code> %GameFilterUDP%</code> у встроенных профилей.
        </div>
        <GameModeToggle
          tcp={settings.gameFilterTcp}
          udp={settings.gameFilterUdp}
          onChange={(tcp, udp) => setSettings({ gameFilterTcp: tcp, gameFilterUdp: udp })}
        />
        <details className="mt-4 group">
          <summary className="cursor-pointer text-xs text-fg-subtle hover:text-fg-muted">
            Кастомные диапазоны портов
          </summary>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Field
              label="GameFilterTCP"
              value={settings.gameFilterTcp}
              onCommit={(v) => setSettings({ gameFilterTcp: v })}
            />
            <Field
              label="GameFilterUDP"
              value={settings.gameFilterUdp}
              onCommit={(v) => setSettings({ gameFilterUdp: v })}
            />
          </div>
        </details>
      </section>

      {/* Game-launch notifications */}
      <section className="card p-6">
        <div className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Bell className="h-4 w-4 text-accent" />
          Уведомления о запуске игр
        </div>
        <div className="mb-4 text-sm text-fg-muted">
          Когда ты запускаешь известную игру, UnLimit показывает системное уведомление с предложением включить обход.
          Полезно, если провайдер режет Cloudflare/voice/matchmaking.
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 accent-accent"
            checked={settings.notifyGameLaunch}
            onChange={(e) => void setSettings({ notifyGameLaunch: e.target.checked })}
          />
          Показывать уведомления при запуске игр
        </label>
        <div className="mt-3 text-[11px] text-fg-subtle">
          Покрытие: s&amp;box, Rust, ARC Raiders, Apex Legends, Counter-Strike 2.
          Кулдаун между уведомлениями для одной игры — 5 минут.
        </div>
      </section>

      {/* Windows service */}
      <section className="card p-6">
        <div className="mb-1 text-lg font-semibold">Служба Windows</div>
        <div className="mb-4 text-sm text-fg-muted">
          Установка winws.exe как системной службы для автозапуска без GUI.
          Требуются права администратора.
        </div>
        <div className="mb-3 grid grid-cols-3 gap-3">
          <Field
            label="Имя службы"
            value={settings.serviceName}
            onCommit={(v) => setSettings({ serviceName: v })}
          />
          <div className="col-span-2 flex items-end gap-2 text-sm">
            {serviceStatus?.exists ? (
              serviceStatus.running ? (
                <span className="chip text-success"><div className="h-1.5 w-1.5 rounded-full bg-success" /> Работает</span>
              ) : (
                <span className="chip"><div className="h-1.5 w-1.5 rounded-full bg-fg-subtle" /> Установлена, остановлена</span>
              )
            ) : (
              <span className="chip">Не установлена</span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              title="Обновить статус"
              onClick={() => void refreshServiceStatus()}
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => svc('install')}
            disabled={busy !== null || !isAdmin || !activeProfile}
            title={!isAdmin ? 'Запустите от имени администратора' : !activeProfile ? 'Выберите активный профиль' : undefined}
          >
            <Wrench className="h-4 w-4" />
            Установить (текущий профиль)
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => svc('start')}
            disabled={busy !== null || !serviceStatus?.exists || serviceStatus?.running}
          >
            <Play className="h-4 w-4" />
            Запустить
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => svc('stop')}
            disabled={busy !== null || !serviceStatus?.running}
          >
            <Square className="h-4 w-4" />
            Остановить
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => svc('uninstall')}
            disabled={busy !== null || !serviceStatus?.exists}
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </button>
        </div>
        {!isAdmin && (
          <div className="mt-3 text-xs text-warning">
            Приложение запущено без прав администратора — операции со службой работать не будут.
          </div>
        )}
      </section>
    </div>
  )
}

const GAME_MODE_PRESETS: Array<{ id: string; label: string; tcp: string; udp: string; hint: string }> = [
  {
    id: 'off',
    label: 'Выключен',
    tcp: '',
    udp: '',
    hint: 'Игровые порты не трогать'
  },
  {
    id: 'full',
    label: 'Все игровые порты',
    tcp: '1024-65535',
    udp: '1024-65535',
    hint: 'Дефолт Flowseal — 1024-65535. Покрывает Cloudflare, лобби, voice'
  },
  {
    id: 'cloudflare',
    label: 'Только Cloudflare',
    tcp: '2053,2083,2087,2096,8443',
    udp: '443',
    hint: 'Узкий пресет под игры на Cloudflare без P2P'
  }
]

function detectPreset(tcp: string, udp: string): string {
  for (const p of GAME_MODE_PRESETS) {
    if (p.tcp === tcp && p.udp === udp) return p.id
  }
  return 'custom'
}

function GameModeToggle({
  tcp,
  udp,
  onChange
}: {
  tcp: string
  udp: string
  onChange: (tcp: string, udp: string) => void
}): JSX.Element {
  const active = detectPreset(tcp, udp)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {GAME_MODE_PRESETS.map((p) => {
          const selected = active === p.id
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.tcp, p.udp)}
              className={cn(
                'rounded-md border px-3 py-2 text-left transition-colors',
                selected
                  ? 'border-accent/60 bg-accent/10'
                  : 'border-border bg-bg-subtle hover:border-border-strong'
              )}
            >
              <div className="flex items-center justify-between gap-1">
                <div className="text-sm font-medium">{p.label}</div>
                {selected && <Check className="h-3.5 w-3.5 text-accent" />}
              </div>
              <div className="mt-0.5 text-[11px] leading-snug text-fg-subtle">{p.hint}</div>
            </button>
          )
        })}
      </div>
      {active === 'custom' && (
        <div className="text-[11px] text-fg-subtle">
          Текущие значения не совпадают с пресетами — режим «Custom». Меняйте значения ниже.
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onCommit
}: {
  label: string
  value: string
  onCommit: (v: string) => void
}): JSX.Element {
  const [local, setLocal] = useState(value)
  useEffect(() => setLocal(value), [value])
  return (
    <label className="block text-sm">
      <div className="mb-1 text-fg-muted">{label}</div>
      <input
        className="input"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => local !== value && onCommit(local)}
      />
    </label>
  )
}
