import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { useLocalStorage } from '../hooks/useLocalStorage'

const PRESETS = [10, 25, 45]

// The timer stores an absolute END TIME instead of counting seconds down.
// Browsers throttle or fully suspend JavaScript timers when a tab is in the
// background or a phone is locked, so a "subtract one every second" counter
// falls behind. With an end timestamp, the remaining time is recomputed from
// the real clock whenever the app wakes up, so it is always correct. The
// timer state is also persisted, so it survives the page being reloaded.
export default function FocusTimer() {
  const { tasks } = useAppData()
  const openTasks = tasks.filter((t) => !t.completed)
  const [log, setLog] = useLocalStorage('loop.focusLog', [])
  const [timer, setTimer] = useLocalStorage('loop.focusTimer', {
    minutes: 25,
    taskId: '',
    endAt: null, // ms timestamp while running, null when idle or paused
    remaining: 25 * 60, // seconds left while idle or paused
  })
  const [, setTick] = useState(0)
  const finishedRef = useRef(null)

  const { minutes, taskId, endAt } = timer
  const running = endAt !== null
  const secondsLeft = running ? Math.max(0, Math.ceil((endAt - Date.now()) / 1000)) : timer.remaining
  const idle = !running && timer.remaining === minutes * 60

  const finish = useCallback(
    (overshootMs) => {
      if (finishedRef.current === endAt) return
      finishedRef.current = endAt
      setLog((l) => [...l, { date: new Date(endAt).toISOString(), minutes, taskId: taskId || null }])
      setTimer((t) => ({ ...t, endAt: null, remaining: t.minutes * 60 }))
      // Only alert if it finished just now. If the app was asleep and is
      // only noticing after the fact, the person is already looking at it.
      if (overshootMs < 5000 && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        new Notification('Focus session complete', { body: `${minutes} minutes done. Nice.` })
      }
    },
    [endAt, minutes, taskId, setLog, setTimer]
  )

  // Re-check the clock on an interval AND whenever the app returns to the
  // foreground, which is when a throttled interval would have drifted.
  useEffect(() => {
    if (!running) return
    const check = () => {
      const msLeft = endAt - Date.now()
      if (msLeft <= 0) finish(-msLeft)
      else setTick((n) => n + 1)
    }
    check()
    const id = setInterval(check, 500)
    document.addEventListener('visibilitychange', check)
    window.addEventListener('pageshow', check)
    window.addEventListener('focus', check)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', check)
      window.removeEventListener('pageshow', check)
      window.removeEventListener('focus', check)
    }
  }, [running, endAt, finish])

  // Best effort: ask the phone to keep the screen on while a session runs,
  // so the app stays in the foreground. Not every browser supports this.
  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let lock = null
    let cancelled = false
    const acquire = async () => {
      try {
        const l = await navigator.wakeLock.request('screen')
        if (cancelled) l.release().catch(() => {})
        else lock = l
      } catch {
        // denied or unsupported: the timer still stays accurate
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      if (lock) lock.release().catch(() => {})
    }
  }, [running])

  function start() {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    setTimer((t) => ({ ...t, endAt: Date.now() + t.remaining * 1000 }))
  }

  function pause() {
    setTimer((t) => ({
      ...t,
      remaining: Math.max(1, Math.ceil((t.endAt - Date.now()) / 1000)),
      endAt: null,
    }))
  }

  function reset() {
    setTimer((t) => ({ ...t, endAt: null, remaining: t.minutes * 60 }))
  }

  function selectMinutes(m) {
    setTimer((t) => ({ ...t, minutes: m, remaining: m * 60 }))
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
              <select
                className="focus__task-select"
                value={taskId}
                onChange={(e) => setTimer((t) => ({ ...t, taskId: e.target.value }))}
              >
                <option value="">No specific task</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            )}
          </>
        )}

        <div className="focus__actions">
          {idle && <button className="btn btn--primary" onClick={start}>Start focus</button>}
          {running && <button className="btn" onClick={pause}>Pause</button>}
          {!running && !idle && <button className="btn btn--primary" onClick={start}>Resume</button>}
          {!idle && <button className="btn btn--ghost" onClick={reset}>Reset</button>}
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
