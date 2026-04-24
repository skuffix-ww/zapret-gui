import { Home, SlidersHorizontal, ListTree, Settings, Activity } from 'lucide-react'
import { useApp } from '../store'
import { cn } from '../lib/cn'

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
      <div className="mt-auto rounded-md border border-border bg-bg-raised/60 p-3 text-[11px] leading-snug text-fg-subtle">
        <div className="mb-1 text-fg-muted">Zapret GUI</div>
        Неофициальный GUI поверх <br />
        <span className="text-fg-muted">Flowseal / zapret-discord-youtube</span>.<br />
        winws.exe / WinDivert — из того же релиза.
      </div>
    </aside>
  )
}
