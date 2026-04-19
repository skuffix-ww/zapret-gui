import { Download } from 'lucide-react'
import { useApp } from '../store'

export default function UpdateProgressToast(): JSX.Element | null {
  const { download, updateInstalling } = useApp()
  if (!updateInstalling && download.phase !== 'downloading' && download.phase !== 'extracting') return null
  const pct =
    download.bytesTotal > 0 ? Math.min(100, Math.round((download.bytesDone / download.bytesTotal) * 100)) : null
  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 rounded-lg border border-border bg-bg-raised p-3 shadow-card">
      <div className="mb-1.5 flex items-center gap-2 text-sm font-medium">
        <Download className="h-4 w-4 text-accent" />
        Обновление zapret
      </div>
      <div className="mb-2 text-xs text-fg-muted truncate">{download.message || 'Подготовка…'}</div>
      <div className="h-1.5 w-full overflow-hidden rounded bg-bg-hover">
        <div
          className={`h-full bg-accent transition-[width] duration-200 ${
            pct === null ? 'animate-pulseDot w-1/3' : ''
          }`}
          style={pct !== null ? { width: `${pct}%` } : undefined}
        />
      </div>
    </div>
  )
}
