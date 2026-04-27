import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Code2,
  Download,
  ExternalLink,
  Film,
  Gamepad2,
  Globe,
  Loader2,
  Lock,
  Package,
  Search,
  Shield,
  Sparkles,
  Wrench,
  type LucideIcon
} from 'lucide-react'
import type { ChocoJobState, ChocoStatus, Recommendation, RecommendationCategory } from '@shared/types'
import { cn } from '../lib/cn'

const ICON_MAP: Record<string, LucideIcon> = {
  Globe,
  Shield,
  Lock,
  Wrench,
  Gamepad2,
  Film,
  Code2,
  AlertTriangle,
  Sparkles,
  Package
}

export default function RecommendationsPage(): JSX.Element {
  const [categories, setCategories] = useState<RecommendationCategory[]>([])
  const [icons, setIcons] = useState<Record<string, string>>({})
  const [iconsLoading, setIconsLoading] = useState(false)
  const [chocoState, setChocoState] = useState<ChocoStatus | null>(null)
  const [job, setJob] = useState<ChocoJobState | null>(null)
  const [query, setQuery] = useState('')
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null)

  useEffect(() => {
    void window.api.recommendations.list().then((cats) => {
      setCategories(cats)
      setActiveCategoryId(cats[0]?.id ?? null)
    })
    void window.api.choco.status().then(setChocoState)
    const unsub = window.api.choco.onJob((s) => {
      setJob(s)
      if (s.phase === 'done' || s.phase === 'error') {
        void window.api.choco.status().then(setChocoState)
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!categories.length) return
    const urls = categories.flatMap((c) => c.items.map((i) => i.url))
    setIconsLoading(true)
    void window.api.recommendations
      .icons(urls)
      .then((map) => setIcons(map))
      .finally(() => setIconsLoading(false))
  }, [categories])

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map((c) => ({
        ...c,
        items: c.items.filter(
          (i) =>
            i.name.toLowerCase().includes(q) ||
            i.description.toLowerCase().includes(q) ||
            i.url.toLowerCase().includes(q)
        )
      }))
      .filter((c) => c.items.length > 0)
  }, [categories, query])

  const visibleCategories = useMemo(() => {
    if (query.trim()) return filteredCategories
    if (!activeCategoryId) return filteredCategories
    return filteredCategories.filter((c) => c.id === activeCategoryId)
  }, [filteredCategories, activeCategoryId, query])

  const totalItems = useMemo(
    () => filteredCategories.reduce((sum, c) => sum + c.items.length, 0),
    [filteredCategories]
  )

  const installChoco = async (): Promise<void> => {
    try {
      await window.api.choco.installChoco()
    } catch (e) {
      alert(`Не удалось установить Chocolatey: ${(e as Error).message}`)
    }
  }

  const installPackage = async (rec: Recommendation): Promise<void> => {
    if (!rec.chocoId) return
    if (!chocoState?.installed) {
      alert('Сначала установите Chocolatey (кнопка в шапке).')
      return
    }
    try {
      await window.api.choco.install(rec.chocoId)
    } catch (e) {
      alert(`Ошибка установки: ${(e as Error).message}`)
    }
  }

  const openExternal = (url: string): void => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h2 className="text-xl font-semibold">Рекомендации</h2>
            </div>
            <div className="text-sm text-fg-muted">
              Privacy &amp; freedom софт для Windows. Многое ставится одной кнопкой через Chocolatey.
            </div>
          </div>
          <ChocoBadge state={chocoState} job={job} onInstall={installChoco} />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Поиск по названию, описанию, домену…"
              className="input pl-9"
            />
          </div>
          <div className="text-xs text-fg-subtle whitespace-nowrap">
            {totalItems} {wordForms(totalItems, ['элемент', 'элемента', 'элементов'])}
            {iconsLoading && <span className="ml-2 text-fg-muted">· иконки загружаются…</span>}
          </div>
        </div>

        {!query.trim() && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {filteredCategories.map((c) => {
              const Icon = ICON_MAP[c.icon] ?? Package
              const active = c.id === activeCategoryId
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveCategoryId(c.id)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors',
                    active
                      ? 'border-accent/50 bg-accent/15 text-fg'
                      : 'border-border bg-bg-subtle text-fg-muted hover:border-border-strong hover:text-fg'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {c.label}
                  <span className="text-fg-subtle">{c.items.length}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {visibleCategories.length === 0 && (
          <div className="flex h-full items-center justify-center text-sm text-fg-subtle">
            Ничего не найдено
          </div>
        )}
        <div className="space-y-6">
          {visibleCategories.map((c) => (
            <CategoryBlock
              key={c.id}
              category={c}
              icons={icons}
              chocoInstalled={chocoState?.installed ?? false}
              activeJob={job}
              onInstall={installPackage}
              onOpen={openExternal}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryBlock({
  category,
  icons,
  chocoInstalled,
  activeJob,
  onInstall,
  onOpen
}: {
  category: RecommendationCategory
  icons: Record<string, string>
  chocoInstalled: boolean
  activeJob: ChocoJobState | null
  onInstall: (rec: Recommendation) => void
  onOpen: (url: string) => void
}): JSX.Element {
  const Icon = ICON_MAP[category.icon] ?? Package
  return (
    <section>
      <div className="mb-3 flex items-baseline gap-2">
        <Icon className="h-4 w-4 text-accent" />
        <h3 className="text-base font-semibold text-fg">{category.label}</h3>
        {category.description && (
          <span className="text-xs text-fg-subtle">— {category.description}</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {category.items.map((rec) => (
          <RecCard
            key={rec.id}
            rec={rec}
            iconUrl={icons[rec.url]}
            chocoInstalled={chocoInstalled}
            activeJob={activeJob}
            onInstall={() => onInstall(rec)}
            onOpen={() => onOpen(rec.url)}
          />
        ))}
      </div>
    </section>
  )
}

function RecCard({
  rec,
  iconUrl,
  chocoInstalled,
  activeJob,
  onInstall,
  onOpen
}: {
  rec: Recommendation
  iconUrl: string | undefined
  chocoInstalled: boolean
  activeJob: ChocoJobState | null
  onInstall: () => void
  onOpen: () => void
}): JSX.Element {
  const jobActive =
    activeJob !== null && activeJob.jobId !== null && activeJob.phase !== 'done' && activeJob.phase !== 'error'
  const isThisInstalling = jobActive && activeJob !== null && activeJob.jobId === rec.chocoId
  const someoneElseInstalling = jobActive && activeJob !== null && activeJob.jobId !== rec.chocoId
  return (
    <div
      className={cn(
        'card card-hover relative flex flex-col p-4 transition-colors',
        rec.warning && 'border-warning/40'
      )}
    >
      {rec.warning && (
        <div className="mb-2 flex items-center gap-1.5 text-[11px] text-warning">
          <AlertTriangle className="h-3.5 w-3.5" />
          {rec.warning}
        </div>
      )}
      <div className="mb-2 flex items-start gap-3">
        <FaviconBox url={iconUrl} alt={rec.name} />
        <div className="min-w-0 flex-1">
          <div className="font-medium leading-tight">{rec.name}</div>
          <div className="truncate text-[11px] text-fg-subtle">{prettyHost(rec.url)}</div>
        </div>
      </div>
      <p className="mb-3 line-clamp-3 text-[12.5px] leading-snug text-fg-muted">{rec.description}</p>
      <div className="mt-auto flex items-center gap-2">
        <button type="button" className="btn btn-ghost gap-1.5 text-xs flex-1" onClick={onOpen}>
          <ExternalLink className="h-3.5 w-3.5" />
          Сайт
        </button>
        {rec.chocoId && (
          <button
            type="button"
            className={cn('btn btn-primary gap-1.5 text-xs flex-1', !chocoInstalled && 'opacity-50')}
            onClick={onInstall}
            disabled={isThisInstalling || someoneElseInstalling}
            title={chocoInstalled ? `choco install ${rec.chocoId}` : 'Установите Chocolatey сверху'}
          >
            {isThisInstalling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {isThisInstalling ? 'Ставится…' : 'Установить'}
          </button>
        )}
      </div>
    </div>
  )
}

function FaviconBox({ url, alt }: { url: string | undefined; alt: string }): JSX.Element {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-bg-subtle">
      {url ? (
        <img src={url} alt={alt} className="h-6 w-6 object-contain" draggable={false} />
      ) : (
        <Package className="h-4 w-4 text-fg-subtle" />
      )}
    </div>
  )
}

function ChocoBadge({
  state,
  job,
  onInstall
}: {
  state: ChocoStatus | null
  job: ChocoJobState | null
  onInstall: () => void
}): JSX.Element {
  const bootstrapping = job?.jobId === '__bootstrap__' && job.phase !== 'done' && job.phase !== 'error'

  if (state === null) {
    return (
      <div className="chip text-fg-subtle">
        <Loader2 className="h-3 w-3 animate-spin" />
        Проверка Chocolatey…
      </div>
    )
  }
  if (state.installed) {
    return (
      <div className="chip border-success/40 bg-success/10 text-success">
        <Package className="h-3 w-3" />
        Chocolatey {state.version ?? ''}
      </div>
    )
  }
  return (
    <button type="button" className="btn btn-primary text-xs gap-1.5" onClick={onInstall} disabled={bootstrapping}>
      {bootstrapping ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      {bootstrapping ? 'Ставим Chocolatey…' : 'Установить Chocolatey'}
    </button>
  )
}

function prettyHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function wordForms(n: number, [one, few, many]: [string, string, string]): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}
