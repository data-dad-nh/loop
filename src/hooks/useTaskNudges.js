import { useEffect, useRef } from 'react'

// Fires a browser notification ~5 minutes before a dated task is due.
// This only works while the app is open in a tab (or installed and the
// OS keeps the service worker alive) — it is a helpful nudge, not a
// guaranteed alarm. See README for the Firebase Cloud Messaging path if
// you want delivery even when the app is fully closed.
export function useTaskNudges(tasks) {
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    const id = setInterval(() => {
      if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
      const now = Date.now()
      for (const task of tasks) {
        if (task.completed || !task.dueAt) continue
        const dueMs = new Date(task.dueAt).getTime()
        const minsAway = (dueMs - now) / 60000
        if (minsAway <= 5 && minsAway > 0 && !notifiedRef.current.has(task.id)) {
          notifiedRef.current.add(task.id)
          new Notification('Coming up', { body: `${task.title} — in about ${Math.round(minsAway)} min` })
        }
      }
    }, 30_000)
    return () => clearInterval(id)
  }, [tasks])
}
