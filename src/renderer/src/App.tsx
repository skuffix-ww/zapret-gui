import { useEffect } from 'react'
import { useApp } from './store'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import ListsPage from './pages/ListsPage'
import SettingsPage from './pages/SettingsPage'
import SetupPage from './pages/SetupPage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import UpdatePrompt from './components/UpdatePrompt'
import UpdateProgressToast from './components/UpdateProgressToast'

export default function App(): JSX.Element {
  const { route, settings, bootstrap } = useApp()

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  if (!settings) {
    return (
      <div className="flex h-full items-center justify-center text-fg-muted">
        <div className="flex flex-col items-center gap-3">
          <div className="h-3 w-3 animate-pulseDot rounded-full bg-accent" />
          <div className="text-sm">Загрузка…</div>
        </div>
      </div>
    )
  }

  if (route === 'setup') {
    return (
      <div className="flex h-full flex-col">
        <Titlebar showNav={false} />
        <SetupPage />
        <UpdatePrompt />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      <Titlebar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {route === 'home' && <HomePage />}
          {route === 'editor' && <EditorPage />}
          {route === 'lists' && <ListsPage />}
          {route === 'diagnostics' && <DiagnosticsPage />}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>
      <UpdatePrompt />
      <UpdateProgressToast />
    </div>
  )
}
