import { useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { formatDayLabel, formatTime } from '../utils/time'
import { describeRepeat } from '../utils/recurrence'
import { groupTasks } from '../utils/taskGroups'
import { useTimeRefresh } from '../hooks/useTimeRefresh'
import TaskCapture from './TaskCapture'
import DayTimeline from './DayTimeline'
import TaskEditor from './TaskEditor'

// The main view is this calendar week (Sunday to Saturday), plus anything
// overdue. Tasks dated after this Saturday wait in "Later" and move into the
// main view when their week starts, with nothing to do by hand.
export default function TaskList() {
  const { tasks, completeTask, removeTask, people } = useAppData()
  const [view, setView] = useState('week')
  const [editingTask, setEditingTask] = useState(null)
  const timeVersion = useTimeRefresh() // regroup when the app returns to view or the day changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const groups = useMemo(() => groupTasks(tasks), [tasks, timeVersion])
  const personName = (id) => people.find((p) => p.id === id)?.name

  const weekCount = groups.overdue.length + groups.days.reduce((n, g) => n + g.items.length, 0) + groups.noDate.length

  // `timeOnly` drops the date from the row when a day heading already says it.
  const row = (t, timeOnly = false) => (
    <li className="task-row" key={t.id}>
      <label className="task-row__check">
        <input type="checkbox" checked={false} aria-label={`Complete ${t.title}`} onChange={() => completeTask(t.id)} />
      </label>
      <button className="task-row__body task-row__body--button" onClick={() => setEditingTask(t)} aria-label={`Edit ${t.title}`}>
        <span className="task-row__title">{t.title}</span>
        <span className="task-row__meta">
          {t.dueAt && <span>{timeOnly ? formatTime(t.dueAt) : formatDayLabel(t.dueAt)}</span>}
          {t.estimatedMinutes && <span>~{t.estimatedMinutes}m</span>}
          {t.repeat && <span>↻ {describeRepeat(t.repeat)}</span>}
          {personName(t.linkedPersonId) && <span>{personName(t.linkedPersonId)}</span>}
        </span>
        {t.notes && <span className="task-row__notes">{t.notes}</span>}
      </button>
      <button className="task-row__delete" onClick={() => removeTask(t.id)} aria-label="Delete task">×</button>
    </li>
  )

  const section = (key, label, items, { timeOnly = false, tone } = {}) => (
    <div className="task-section" key={key}>
      <h2 className={`task-section__heading${tone === 'overdue' ? ' task-section__heading--overdue' : ''}`}>
        {label} <span className="task-section__count">{items.length}</span>
      </h2>
      <ul className="task-list">{items.map((t) => row(t, timeOnly))}</ul>
    </div>
  )

  return (
    <div className="screen">
      <TaskCapture />

      <div className="comm-form__types" role="group" aria-label="Task view">
        <button className={`chip${view === 'week' ? ' chip--active' : ''}`} aria-pressed={view === 'week'} onClick={() => setView('week')}>
          This week
        </button>
        <button className={`chip${view === 'later' ? ' chip--active' : ''}`} aria-pressed={view === 'later'} onClick={() => setView('later')}>
          {groups.laterCount > 0 ? `Later (${groups.laterCount})` : 'Later'}
        </button>
      </div>

      {view === 'week' && (
        <>
          <DayTimeline tasks={tasks} />
          {groups.overdue.length > 0 && section('overdue', 'Overdue', groups.overdue, { tone: 'overdue' })}
          {groups.days.map((g) => section(g.key, g.label, g.items, { timeOnly: true }))}
          {groups.noDate.length > 0 && section('noDate', 'No date', groups.noDate)}

          {weekCount === 0 && (
            <div className="empty-state">
              <p>{groups.laterCount > 0 ? 'Nothing scheduled this week.' : 'All clear.'}</p>
              {groups.laterCount > 0 && (
                <p className="empty-state__sub">
                  {groups.laterCount} {groups.laterCount === 1 ? 'task is' : 'tasks are'} scheduled for later. They appear here when their week starts.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {view === 'later' && (
        <>
          {groups.later.map((g) => section(g.key, g.label, g.items))}
          {groups.laterCount === 0 && (
            <div className="empty-state">
              <p>Nothing scheduled beyond this week.</p>
              <p className="empty-state__sub">Tasks dated after Saturday wait here until their week starts.</p>
            </div>
          )}
        </>
      )}

      {editingTask && <TaskEditor task={editingTask} onClose={() => setEditingTask(null)} />}
    </div>
  )
}
