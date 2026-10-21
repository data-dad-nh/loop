import { useState } from 'react'
import Nav from './components/Nav'
import RightNow from './components/RightNow'
import TaskList from './components/TaskList'
import Lists from './components/Lists'
import Track from './components/Track'
import CommLog from './components/CommLog'
import SearchOverlay from './components/SearchOverlay'
import { useAppData } from './context/AppDataContext'
import { useTaskNudges } from './hooks/useTaskNudges'
import { useAppBadge } from './hooks/useAppBadge'
import { firebaseEnabled } from './firebase'

const SCREENS = {
  now: RightNow,
  tasks: TaskList,
  lists: Lists,
  track: Track,
  log: CommLog,
}

export default function App() {
  const [tab, setTab] = useState('now')
  const [searching, setSearching] = useState(false)
  const [openListId, setOpenListId] = useState(null)
  const [openTrackerId, setOpenTrackerId] = useState(null)
  const { tasks } = useAppData()
  useTaskNudges(tasks)
  const badge = useAppBadge(tasks)

  const Screen = SCREENS[tab]

  return (
    <div className="app">
      <header className="app__header" inert={searching}>
        <span className="app__logo">Loop</span>
        <div className="app__header-actions">
          {!firebaseEnabled && <span className="app__badge">This device only</span>}
          <button className="app__search" aria-label="Search" onClick={() => setSearching(true)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>
      {badge.needsPermission && (
        <div className="badge-optin" inert={searching}>
          <span>Show your due-today and overdue count on the app icon?</span>
          <button className="chip chip--active" onClick={badge.enable}>Turn on</button>
        </div>
      )}
      {badge.blocked && (
        <div className="badge-optin" inert={searching}>
          <span>To show the count on the icon, allow notifications for this app in iPhone Settings.</span>
        </div>
      )}
      <main className="app__main" inert={searching}>
        <Screen openListId={openListId} onOpenList={setOpenListId} openTrackerId={openTrackerId} onOpenTracker={setOpenTrackerId} />
      </main>
      <Nav active={tab} onChange={setTab} inert={searching} />
      {searching && (
        <SearchOverlay
          onClose={() => setSearching(false)}
          onOpenList={(id) => {
            setOpenListId(id)
            setTab('lists')
            setSearching(false)
          }}
          onOpenTracker={(id) => {
            setOpenTrackerId(id)
            setTab('track')
            setSearching(false)
          }}
        />
      )}
    </div>
  )
}
