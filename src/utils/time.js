// Small helpers shared across views. Kept dependency-free on purpose —
// date-fns/dayjs would be reasonable additions if this grows.

export function startOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function endOfDay(date = new Date()) {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

export function isToday(isoString) {
  if (!isoString) return false
  const d = new Date(isoString)
  const today = new Date()
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  )
}

export function isOverdue(isoString) {
  if (!isoString) return false
  return new Date(isoString).getTime() < Date.now()
}

export function formatTime(isoString) {
  if (!isoString) return ''
  return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatDayLabel(isoString) {
  if (!isoString) return 'No date'
  const d = new Date(isoString)
  const today = startOfDay()
  const target = startOfDay(d)
  const diffDays = Math.round((target - today) / 86400000)
  if (diffDays === 0) return `Today, ${formatTime(isoString)}`
  if (diffDays === 1) return `Tomorrow, ${formatTime(isoString)}`
  if (diffDays === -1) return `Yesterday, ${formatTime(isoString)}`
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + `, ${formatTime(isoString)}`
}

export function relativeFromNow(isoString) {
  if (!isoString) return ''
  const diffMs = new Date(isoString).getTime() - Date.now()
  const diffMin = Math.round(diffMs / 60000)
  const abs = Math.abs(diffMin)
  if (abs < 1) return 'now'
  if (abs < 60) return diffMin > 0 ? `in ${abs}m` : `${abs}m ago`
  const diffHr = Math.round(diffMin / 60)
  if (Math.abs(diffHr) < 24) return diffMin > 0 ? `in ${diffHr}h` : `${Math.abs(diffHr)}h ago`
  const diffDay = Math.round(diffHr / 24)
  return diffMin > 0 ? `in ${diffDay}d` : `${Math.abs(diffDay)}d ago`
}

// Minutes elapsed in the day right now, and a 0-100% position, used by
// the day timeline visual (see DayTimeline.jsx) to fight time blindness
// by showing time as a physical strip rather than a number.
export function dayProgressPercent(date = new Date()) {
  const mins = date.getHours() * 60 + date.getMinutes()
  return (mins / 1440) * 100
}
