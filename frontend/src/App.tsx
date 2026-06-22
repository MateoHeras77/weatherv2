import Header from './components/Header'
import MapPage from './pages/MapPage'
import BriefingPage from './pages/BriefingPage'
import OutlookPage from './pages/OutlookPage'
import { useApp } from './lib/store'

export default function App() {
  const view = useApp((s) => s.view)

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <main className="relative flex-1">
        {/* The map stays mounted underneath so its state survives view switches. */}
        <MapPage />
        {view === 'briefing' && <BriefingPage />}
        {view === 'outlook' && <OutlookPage />}
      </main>
    </div>
  )
}
