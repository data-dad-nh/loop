import { endOfDay } from './time'

// A task's `repeat` is null (doesn't repeat) or:
//   { type: 'fixed' | 'after', unit: 'day' | 'week' | 'month', interval: N,
//     weekdays?: [0-6, Sunday = 0]   // fixed + week
//     monthDay?: 1-31 }              // fixed + month
//
//  fixed  = "on a schedule": every Monday, the 1st of the month. Dates don't
//           move based on when you actually finish.
//  after  = "N units after I finish it": watering plants, calling someone.
//           The clock restarts at completion.

export function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n) // calendar math in local time, so DST can't shift the clock time
  return d
}

// Same time of day, `n` months later, on `dayOfMonth` (or the last day of that
// month if it is shorter: the 31st becomes the 28th, then back to the 31st).
function addMonthsClamped(date, n, dayOfMonth) {
  const d = new Date(date)
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1, d.getHours(), d.getMinutes(), 0, 0)
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(dayOfMonth, lastDay))
  return target
}

function stepFixed(from, repeat) {
  const n = repeat.interval ?? 1
  if (repeat.unit === 'day') return addDays(from, n)
  if (repeat.unit === 'week') {
    const days = repeat.weekdays?.length ? [...repeat.weekdays].sort((a, b) => a - b) : [from.getDay()]
    const dow = from.getDay()
    const later = days.find((d) => d > dow)
    if (later !== undefined) return addDays(from, later - dow)
    const weekStart = addDays(from, -dow) // the Sunday of this week
    return addDays(weekStart, n * 7 + days[0])
  }
  return addMonthsClamped(from, n, repeat.monthDay ?? from.getDate())
}

// When the next occurrence of `task` should be due, given that it is being
// completed (or skipped) at `now`.
export function nextDueDate(task, now = new Date()) {
  const { repeat } = task
  const due = task.dueAt ? new Date(task.dueAt) : new Date(now)
  const n = repeat.interval ?? 1

  if (repeat.type === 'after') {
    const base = new Date(now)
    base.setHours(due.getHours(), due.getMinutes(), 0, 0) // keep the original time of day
    if (repeat.unit === 'day') return addDays(base, n)
    if (repeat.unit === 'week') return addDays(base, n * 7)
    return addMonthsClamped(base, n, base.getDate())
  }

  // Fixed schedule: step forward from the due date until the result is on a
  // later day than today. Missed occurrences are skipped, never queued up.
  const endToday = endOfDay(now)
  let next = stepFixed(due, repeat)
  for (let guard = 0; next <= endToday && guard < 2000; guard++) next = stepFixed(next, repeat)
  return next
}

// Normalize what the picker holds into what gets stored on the task.
export function finalizeRepeat(repeat, dueDateStr) {
  if (!repeat) return null
  const interval = Math.max(1, parseInt(repeat.interval, 10) || 1)
  const due = dueDateStr ? new Date(`${dueDateStr}T12:00`) : new Date()
  const out = { type: repeat.type, unit: repeat.unit, interval }
  if (repeat.type === 'fixed' && repeat.unit === 'week') {
    out.weekdays = repeat.weekdays?.length ? [...repeat.weekdays].sort((a, b) => a - b) : [due.getDay()]
  }
  if (repeat.type === 'fixed' && repeat.unit === 'month') out.monthDay = due.getDate()
  return out
}

const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function ordinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th'}`
}

export function describeRepeat(repeat) {
  if (!repeat) return ''
  const n = repeat.interval ?? 1
  const plural = (word) => (n === 1 ? word : `${word}s`)

  if (repeat.type === 'after') return `${n} ${plural(repeat.unit)} after done`
  if (repeat.unit === 'day') return n === 1 ? 'Daily' : `Every ${n} days`
  if (repeat.unit === 'week') {
    const names = (repeat.weekdays ?? []).map((d) => WEEKDAY_NAMES[d]).join(', ')
    return n === 1 ? `Every ${names}` : `Every ${n} weeks on ${names}`
  }
  const day = ordinal(repeat.monthDay ?? 1)
  return n === 1 ? `Monthly on the ${day}` : `Every ${n} months on the ${day}`
}
