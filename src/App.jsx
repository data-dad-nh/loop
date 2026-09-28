import { useState } from 'react'
import Nav from './components/Nav'
import RightNow from './components/RightNow'
import TaskList from './components/TaskList'
import FocusTimer from './components/FocusTimer'
import CommLog from './components/CommLog'
import { useAppData } from './context/AppDataContext'
import { useTaskNudges } from './hooks/useTaskNudges'
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

  const Screen = SCREENS[tab]

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__logo">Loop</span>
        {!firebaseEnabled && <span className="app__badge">This device only</span>}
      </header>
      <main className="app__main">
        <Screen />
      </main>
      <Nav active={tab} onChange={setTab} />
    </div>
  )
}
