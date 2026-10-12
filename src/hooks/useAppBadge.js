import { useEffect, useState } from 'react'
import { endOfDay } from '../utils/time'

// Open tasks that are due today (at any time) or already overdue. Tasks with
// no due date, tasks due after today, and completed tasks are not counted.
export function countDueOrOverdue(tasks) {
  const endOfToday = endOfDay().getTime()
  return tasks.filter((t) => !t.completed && t.dueAt && new Date(t.dueAt).getTime() <= endOfToday).length
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

// Shows "tasks due today or overdue" as a number on the app icon via the Badging API.
// Limits worth knowing:
//  - It only updates while the app is open. A closed app keeps whatever
//    number it last set; updating it in the background needs push messages.
//  - iPhone/iPad: works for apps installed to the Home Screen, and only
//    after notification permission has been granted.
//  - Android browsers don't show a number from this API.
export function useAppBadge(tasks) {
  const supported = typeof navigator !== 'undefined' && 'setAppBadge' in navigator
  const [permission, setPermission] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
  )
  const [, setTick] = useState(0)

  // Re-evaluate "today" every minute and whenever the app comes back to the
  // foreground, so the count stays right across midnight.
  useEffect(() => {
    const bump = () => setTick((n) => n + 1)
    const id = setInterval(bump, 60_000)
    document.addEventListener('visibilitychange', bump)
    window.addEventListener('focus', bump)
    window.addEventListener('pageshow', bump)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', bump)
      window.removeEventListener('focus', bump)
      window.removeEventListener('pageshow', bump)
    }
  }, [])

  const count = countDueOrOverdue(tasks)

  useEffect(() => {
    if (!supported) return
    try {
      if (count > 0) navigator.setAppBadge(count).catch(() => {})
      else if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(() => {})
    } catch {
      // badge unavailable on this device: nothing to do
    }
  }, [supported, count, permission])

  function enable() {
    if (typeof Notification === 'undefined') return
    Notification.requestPermission().then(setPermission)
  }

  return {
    supported,
    count,
    permission,
    enable,
    // On iPhone the badge stays invisible until notifications are allowed.
    needsPermission: supported && isIOS() && permission === 'default',
    blocked: supported && isIOS() && permission === 'denied',
  }
}
