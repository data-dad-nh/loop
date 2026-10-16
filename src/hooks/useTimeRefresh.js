import { useEffect, useState } from 'react'

// Screens that sort tasks by "today / overdue / upcoming" depend on the clock,
// not just on the task data. If the app sits open or suspended overnight, no
// data changes, so nothing would re-run those calculations and the screen
// would keep showing yesterday's answer. This returns a number that changes
// when the app comes back into view and when the calendar day rolls over;
// use it as a dependency of any memoized time-based list.
//
// It deliberately does NOT change every minute: re-sorting while you look at
// a card could swap it out from under your thumb.
export function useTimeRefresh() {
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let day = new Date().toDateString()
    const bump = () => setVersion((v) => v + 1)

    const onReturn = () => {
      if (document.visibilityState === 'hidden') return
      day = new Date().toDateString()
      bump()
    }
    const onTick = () => {
      const today = new Date().toDateString()
      if (today !== day) {
        day = today
        bump()
      }
    }

    const id = setInterval(onTick, 30_000)
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    window.addEventListener('pageshow', onReturn)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
      window.removeEventListener('pageshow', onReturn)
    }
  }, [])

  return version
}
