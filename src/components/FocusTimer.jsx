import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useLocalStorage } from '../hooks/useLocalStorage'

const PRESETS = [10, 25, 45]

// A solo focus timer with an ambient "presence" pulse rather than a flat
// countdown number — the pulse is what mimics the feeling of working
// alongside someone (body doubling), which a plain digit doesn't give you.
// Sessions log to a simple streak counter that never resets to zero on a
// missed day — it just shows the gap honestly instead of punishing it.
export default function FocusTimer() {
  const { tasks } = useAppData()
  const openTasks = tasks.filter((t) => !t.completed)
  const [minutes, setMinutes] = useState(25)
  const [taskId, setTaskId] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [log, setLog] = useLocalStorage('loop.focusLog', [])
  const intervalRef = useRef(null)

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current)
          setRunning(false)
          finishSession()
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function finishSession() {
    setLog((l) => [...l, { date: new Date().toISOString(), minutes, taskId: taskId || null }])
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification('Focus session complete', { body: `${minutes} minutes done. Nice.` })
    }
  }

  function start() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setSecondsLeft(minutes * 60)
    setRunning(true)
  }

  function pause() {
    setRunning(false)
  }

  function reset() {
    setRunning(false)
    setSecondsLeft(minutes * 60)
  }

  function selectMinutes(m) {
    setMinutes(m)
    setSecondsLeft(m * 60)
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')
  const progress = 1 - secondsLeft / (minutes * 60)

  const todayCount = useMemo(() => {
    const today = new Date().toDateString()
    return log.filter((s) => new Date(s.date).toDateString() === today).length
  }, [log])

  const lastSessionDate = log.length ? new Date(log[log.length - 1].date) : null
  const daysSinceLast = lastSessionDate ? Math.floor((Date.now() - lastSessionDate.getTime()) / 86400000) : null

  return (
    <div className="screen">
      <div className="focus">
        <div className={`focus__ring${running ? ' focus__ring--active' : ''}`} style={{ '--progress': progress }}>
          <span className="focus__time">{mm}:{ss}</span>
        </div>

        {!running && (
          <>
            <div className="focus__presets">
              {PRESETS.map((m) => (
                <button key={m} className={`chip${minutes === m ? ' chip--active' : ''}`} onClick={() => selectMinutes(m)}>
                  {m} min
                </button>
              ))}
            </div>

            {openTasks.length > 0 && (
              <select className="focus__task-select" value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">No specific task</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}
          </>
        )}

        <div className="focus__actions">
          {!running && secondsLeft === minutes * 60 && <button className="btn btn--primary" onClick={start}>Start focus</button>}
          {running && <button className="btn" onClick={pause}>Pause</button>}
          {!running && secondsLeft !== minutes * 60 && secondsLeft > 0 && <button className="btn btn--primary" onClick={() => setRunning(true)}>Resume</button>}
          {secondsLeft !== minutes * 60 && <button className="btn btn--ghost" onClick={reset}>Reset</button>}
        </div>

        <p className="focus__stat">
          {todayCount > 0
            ? `${todayCount} focus session${todayCount > 1 ? 's' : ''} today`
            : daysSinceLast === null
            ? 'Your first session starts the count'
            : daysSinceLast === 0
            ? 'Already showed up today'
            : `Last session ${daysSinceLast} day${daysSinceLast > 1 ? 's' : ''} ago — starting again counts the same as never stopping`}
        </p>
      </div>
    </div>
  )
}
