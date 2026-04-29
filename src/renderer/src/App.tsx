import { useEffect, useState } from 'react'
import { useApp } from './store'
import Titlebar from './components/Titlebar'
import Sidebar from './components/Sidebar'
import HomePage from './pages/HomePage'
import EditorPage from './pages/EditorPage'
import ListsPage from './pages/ListsPage'
import SettingsPage from './pages/SettingsPage'
import SetupPage from './pages/SetupPage'
import DiagnosticsPage from './pages/DiagnosticsPage'
import RecommendationsPage from './pages/RecommendationsPage'
import TweaksPage from './pages/TweaksPage'
import FixesPage from './pages/FixesPage'
import ProfileBenchPage from './pages/ProfileBenchPage'
import UpdatePrompt from './components/UpdatePrompt'
import UpdateProgressToast from './components/UpdateProgressToast'
import IntroSplash from './components/IntroSplash'

export default function App(): JSX.Element {
  const { route, settings, bootstrap } = useApp()
  const [introDone, setIntroDone] = useState(false)

  useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  const intro = !introDone ? <IntroSplash onDone={() => setIntroDone(true)} /> : null

  if (!settings) {
    return (
      <>
        <div className="flex h-full items-center justify-center text-fg-muted">
          <div className="flex flex-col items-center gap-3">
            <div className="h-3 w-3 animate-pulseDot rounded-full bg-accent" />
            <div className="text-sm">Загрузка…</div>
          </div>
        </div>
        {intro}
      </>
    )
  }

  if (route === 'setup') {
    return (
      <div className="flex h-full flex-col">
        <Titlebar showNav={false} />
        <SetupPage />
        <UpdatePrompt />
        {intro}
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
          {route === 'recommendations' && <RecommendationsPage />}
          {route === 'tweaks' && <TweaksPage />}
          {route === 'fixes' && <FixesPage />}
          {route === 'bench' && <ProfileBenchPage />}
          {route === 'settings' && <SettingsPage />}
        </main>
      </div>
      <UpdatePrompt />
      <UpdateProgressToast />
      {intro}
    </div>
  )
}
