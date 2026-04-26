import { Home, SlidersHorizontal, ListTree, Settings, Activity, Heart, ExternalLink } from 'lucide-react'
import { useApp } from '../store'
import { cn } from '../lib/cn'
import Logo from './Logo'

const APP_VERSION = '0.1.2'

const NAV: Array<{
  id: 'home' | 'editor' | 'lists' | 'diagnostics' | 'settings'
  label: string
  icon: typeof Home
}> = [
  { id: 'home', label: 'Главная', icon: Home },
  { id: 'editor', label: 'Редактор', icon: SlidersHorizontal },
  { id: 'lists', label: 'Списки', icon: ListTree },
  { id: 'diagnostics', label: 'Диагностика', icon: Activity },
  { id: 'settings', label: 'Настройки', icon: Settings }
]

export default function Sidebar(): JSX.Element {
  const { route, setRoute, editingProfileId, activeProfileId } = useApp()
  return (
    <aside className="flex w-56 flex-col border-r border-border bg-bg-subtle/60 px-2 py-3">
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => {
          const Icon = n.icon
          const active = route === n.id
          return (
            <button
              key={n.id}
              onClick={() => {
                if (n.id === 'editor' && !editingProfileId && activeProfileId) {
                  useApp.setState({ editingProfileId: activeProfileId })
                }
                setRoute(n.id)
              }}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active ? 'bg-bg-hover text-fg' : 'text-fg-muted hover:bg-bg-hover/60 hover:text-fg'
              )}
            >
              <Icon className={cn('h-4 w-4', active && 'text-accent')} />
              {n.label}
            </button>
          )
        })}
      </nav>
      <div className="mt-auto space-y-2">
        <div className="rounded-lg border border-border bg-bg-raised/60 p-3 text-[11px] leading-snug">
          <div className="mb-2 flex items-center gap-2">
            <Logo className="h-5 w-5 rounded" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold text-fg">UnLimit</div>
              <div className="text-[10px] text-fg-subtle">v{APP_VERSION}</div>
            </div>
          </div>
          <div className="text-fg-subtle">
            Privacy &amp; freedom toolkit. Обход блокировок поверх{' '}
            <span className="text-fg-muted">Flowseal / zapret-discord-youtube</span>.
          </div>
        </div>

        <a
          href="https://eblanchik.ru"
          target="_blank"
          rel="noreferrer noopener"
          className="group flex items-center gap-2 rounded-lg border border-border bg-gradient-to-br from-accent/10 via-bg-raised/60 to-bg-raised/60 px-3 py-2 text-[11px] text-fg-muted transition-colors hover:border-accent/40 hover:text-fg"
          title="eblanchik.ru"
        >
          <Heart className="h-3.5 w-3.5 shrink-0 text-accent transition-transform group-hover:scale-110" fill="currentColor" />
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-fg-subtle">made by</div>
            <div className="truncate font-semibold text-fg">eblanchik.studios</div>
          </div>
          <ExternalLink className="h-3 w-3 shrink-0 text-fg-subtle transition-colors group-hover:text-accent" />
        </a>
      </div>
    </aside>
  )
}
