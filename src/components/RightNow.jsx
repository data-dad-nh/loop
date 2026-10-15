import { useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { geminiEnabled, breakDownTask } from '../gemini'
import { formatDayLabel, isOverdue, isToday } from '../utils/time'
import { describeRepeat } from '../utils/recurrence'
import TaskCapture from './TaskCapture'
import TaskEditor from './TaskEditor'

// The antidote to a wall of 40 tasks: show exactly one thing. Only tasks that
// are overdue, due today, or have no date are candidates; anything dated for a
// later day stays out of sight here (it is still in the Tasks tab) until its
// day arrives. "Not now" just moves to the next candidate for this session. It
// never reorders or penalizes anything, because a skipped task is not a failed
// task.
function prioritize(tasks) {
  const open = tasks.filter((t) => !t.completed)
  const overdue = open.filter((t) => t.dueAt && isOverdue(t.dueAt)).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
  const dueToday = open.filter((t) => t.dueAt && !isOverdue(t.dueAt) && isToday(t.dueAt)).sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
  const noDate = open.filter((t) => !t.dueAt).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  return [...overdue, ...dueToday, ...noDate]
}

export default function RightNow() {
  const { tasks, updateTask, completeTask } = useAppData()
  const [skip, setSkip] = useState(0)
  const [breaking, setBreaking] = useState(false)
  const [breakError, setBreakError] = useState('')
  const [editing, setEditing] = useState(false)

  const queue = useMemo(() => prioritize(tasks), [tasks])
  const hasUpcoming = tasks.some((t) => !t.completed && t.dueAt && !isOverdue(t.dueAt) && !isToday(t.dueAt))
  const index = skip % Math.max(queue.length, 1)
  const current = queue[index]
  const upNext = queue[index + 1]

  async function handleBreakDown() {
    if (!current) return
    setBreaking(true)
    setBreakError('')
    try {
      const steps = await breakDownTask(current.title, current.notes)
      updateTask(current.id, { steps: steps.map((text, i) => ({ id: `${current.id}-${i}`, text, done: false })) })
    } catch (err) {
      setBreakError(err.message)
    } finally {
      setBreaking(false)
    }
  }

  function toggleStep(stepId) {
    const steps = current.steps.map((s) => (s.id === stepId ? { ...s, done: !s.done } : s))
    updateTask(current.id, { steps })
  }

  function complete() {
    completeTask(current.id)
    setSkip(0)
  }

  function skipOccurrence() {
    completeTask(current.id, { skipped: true })
    setSkip(0)
  }

  return (
    <div className="screen">
      <TaskCapture />

      {!current && (
        <div className="empty-state">
          {hasUpcoming ? (
            <>
              <p>Nothing due today.</p>
              <p className="empty-state__sub">Your upcoming tasks are waiting in the Tasks tab.</p>
            </>
          ) : (
            <>
              <p>Nothing queued up.</p>
              <p className="empty-state__sub">Add something above, or take a breath — an empty list is a fine place to be.</p>
            </>
          )}
        </div>
      )}

      {current && (
        <div className="right-now">
          <div className="right-now__card">
            <p className="right-now__eyebrow">Right now</p>
            <h1 className="right-now__title">{current.title}</h1>
            {current.notes && <p className="right-now__notes">{current.notes}</p>}
            <div className="right-now__meta">
              {current.dueAt && (
                <span className={isOverdue(current.dueAt) ? 'meta-pill meta-pill--overdue' : 'meta-pill'}>
                  {formatDayLabel(current.dueAt)}
                </span>
              )}
              {current.estimatedMinutes && <span className="meta-pill">~{current.estimatedMinutes} min</span>}
              {current.repeat && <span className="meta-pill">↻ {describeRepeat(current.repeat)}</span>}
            </div>

            {current.steps?.length > 0 && (
              <ul className="steps">
                {current.steps.map((step) => (
                  <li key={step.id}>
                    <label>
                      <input type="checkbox" checked={step.done} onChange={() => toggleStep(step.id)} />
                      <span className={step.done ? 'steps__done' : ''}>{step.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}

            <div className="right-now__actions">
              <button className="btn btn--primary" onClick={complete}>Done</button>
              <button className="btn" onClick={() => setSkip((s) => s + 1)}>Not now</button>
              <button className="btn btn--ghost" onClick={() => setEditing(true)}>Edit</button>
              {current.repeat && (
                <button className="btn btn--ghost" onClick={skipOccurrence}>Skip this one</button>
              )}
              {geminiEnabled && !current.steps?.length && (
                <button className="btn btn--ghost" onClick={handleBreakDown} disabled={breaking}>
                  {breaking ? 'Breaking it down…' : '✦ Break it down'}
                </button>
              )}
            </div>
            {breakError && <p className="capture__error">{breakError}</p>}
          </div>

          {upNext && (
            <p className="right-now__upnext">Up next: {upNext.title}</p>
          )}
        </div>
      )}

      {editing && current && <TaskEditor task={current} onClose={() => setEditing(false)} />}
    </div>
  )
}
