// How the Tasks screen sorts open tasks. The main view is the current calendar
// week (Sunday to Saturday) plus anything overdue; everything dated after this
// Saturday goes to "Later" and moves into the main view when its week begins.

const WEEK_MS = 7 * 86400000
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
export const startOfWeek = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()) // Sunday
// The Sunday that starts the following week (the exclusive end of this one).
export const startOfNextWeek = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay() + 7)

const byDue = (a, b) => new Date(a.dueAt) - new Date(b.dueAt) || new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0)

// "Nov 1–7", or "Oct 25–Nov 1" when the week spans two months.
function weekRange(sunday) {
  const sat = new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate() + 6)
  const left = `${MONTHS[sunday.getMonth()]} ${sunday.getDate()}`
  const right = sat.getMonth() === sunday.getMonth() ? `${sat.getDate()}` : `${MONTHS[sat.getMonth()]} ${sat.getDate()}`
  return `${left}–${right}`
}

export function groupTasks(tasks, now = new Date()) {
  const open = tasks.filter((t) => !t.completed)
  const weekEnd = startOfNextWeek(now)
  const thisWeekStart = startOfWeek(now)
  const today = dayStart(now)
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

  const dated = open.filter((t) => t.dueAt).sort(byDue)
  const overdue = dated.filter((t) => new Date(t.dueAt) < now)
  const thisWeek = dated.filter((t) => new Date(t.dueAt) >= now && new Date(t.dueAt) < weekEnd)
  const laterTasks = dated.filter((t) => new Date(t.dueAt) >= weekEnd)
  const noDate = open
    .filter((t) => !t.dueAt)
    .sort((a, b) => new Date(a.createdAt ?? 0) - new Date(b.createdAt ?? 0))

  // This week, one group per day that has something.
  const days = []
  for (const t of thisWeek) {
    const d = dayStart(new Date(t.dueAt))
    const key = d.toDateString()
    let group = days.find((g) => g.key === key)
    if (!group) {
      const label = d.getTime() === today.getTime() ? 'Today' : d.getTime() === tomorrow.getTime() ? 'Tomorrow' : WEEKDAYS[d.getDay()]
      group = { key, label, items: [] }
      days.push(group)
    }
    group.items.push(t)
  }

  // Later: next week, then week by week for a while, then by month.
  const later = []
  for (const t of laterTasks) {
    const due = new Date(t.dueAt)
    const sunday = startOfWeek(due)
    const weeksAhead = Math.round((sunday - thisWeekStart) / WEEK_MS)
    let key
    let label
    if (weeksAhead <= 5) {
      key = `w${weeksAhead}`
      label = weeksAhead === 1 ? `Next week · ${weekRange(sunday)}` : weekRange(sunday)
    } else {
      key = `m${due.getFullYear()}-${due.getMonth()}`
      label = due.getFullYear() === now.getFullYear() ? MONTH_NAMES[due.getMonth()] : `${MONTH_NAMES[due.getMonth()]} ${due.getFullYear()}`
    }
    let group = later.find((g) => g.key === key)
    if (!group) {
      group = { key, label, items: [] }
      later.push(group)
    }
    group.items.push(t)
  }

  return { overdue, days, noDate, later, laterCount: laterTasks.length }
}
