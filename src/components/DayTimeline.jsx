import { useEffect, useState } from 'react'
import { isToday } from '../utils/time'

const DAY_START_HOUR = 6
const DAY_END_HOUR = 23
const SPAN_HOURS = DAY_END_HOUR - DAY_START_HOUR

function percentForHour(hourFloat) {
  return Math.min(100, Math.max(0, ((hourFloat - DAY_START_HOUR) / SPAN_HOURS) * 100))
}

// Time blindness isn't "doesn't know what time it is" — it's "a number
// doesn't feel like a physical quantity." A horizontal strip where today's
// tasks sit at their actual position, with a moving "now" line, makes
// elapsed and remaining time visible rather than abstract.
export default function DayTimeline({ tasks }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  const todays = tasks.filter((t) => t.dueAt && isToday(t.dueAt) && !t.completed)
  const nowHour = now.getHours() + now.getMinutes() / 60
  const nowPercent = percentForHour(nowHour)

  const hourMarks = []
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h += 3) hourMarks.push(h)

  return (
    <div className="timeline">
      <div className="timeline__track">
        {hourMarks.map((h) => (
          <div key={h} className="timeline__tick" style={{ left: `${percentForHour(h)}%` }}>
            <span>{h % 12 === 0 ? 12 : h % 12}{h < 12 ? 'a' : 'p'}</span>
          </div>
        ))}
        {todays.map((t) => {
          const d = new Date(t.dueAt)
          const hourFloat = d.getHours() + d.getMinutes() / 60
          return (
            <div
              key={t.id}
              className="timeline__task"
              style={{ left: `${percentForHour(hourFloat)}%` }}
              title={t.title}
            />
          )
        })}
        <div className="timeline__now" style={{ left: `${nowPercent}%` }} />
      </div>
      {todays.length === 0 && <p className="timeline__empty">Nothing time-bound today</p>}
    </div>
  )
}
