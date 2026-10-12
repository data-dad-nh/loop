import { useState } from 'react'
import Nav from './components/Nav'
import RightNow from './components/RightNow'
import TaskList from './components/TaskList'
import FocusTimer from './components/FocusTimer'
import CommLog from './components/CommLog'
import { useAppData } from './context/AppDataContext'
import { useTaskNudges } from './hooks/useTaskNudges'
import { useAppBadge } from './hooks/useAppBadge'
import { firebaseEnabled } from './firebase'

const SCREENS = {
  now: RightNow,
  tasks: TaskList,
  focus: FocusTimer,
  log: CommLog,
}

export default function App() {
  const [tab, setTab] = useState('now')
  const { tasks } = useAppData()
  useTaskNudges(tasks)
  const badge = useAppBadge(tasks)

  const Screen = SCREENS[tab]

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__logo">Loop</span>
        {!firebaseEnabled && <span className="app__badge">This device only</span>}
      </header>
      {badge.needsPermission && (
        <div className="badge-optin">
          <span>Show your due-today and overdue count on the app icon?</span>
          <button className="chip chip--active" onClick={badge.enable}>Turn on</button>
        </div>
      )}
      {badge.blocked && (
        <div className="badge-optin">
          <span>To show the count on the icon, allow notifications for this app in iPhone Settings.</span>
        </div>
      )}
      <main className="app__main">
        <Screen />
      </main>
      <Nav active={tab} onChange={setTab} />
    </div>
  )
}
