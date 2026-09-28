import { useMemo } from 'react'
import { useAppData } from '../context/AppDataContext'
import { formatDayLabel, isOverdue, isToday } from '../utils/time'
import TaskCapture from './TaskCapture'
import DayTimeline from './DayTimeline'

function groupTasks(tasks) {
  const open = tasks.filter((t) => !t.completed)
  return {
    overdue: open.filter((t) => t.dueAt && isOverdue(t.dueAt)),
    today: open.filter((t) => t.dueAt && !isOverdue(t.dueAt) && isToday(t.dueAt)),
    upcoming: open.filter((t) => t.dueAt && !isOverdue(t.dueAt) && !isToday(t.dueAt)),
    noDate: open.filter((t) => !t.dueAt),
  }
}

export default function TaskList() {
  const { tasks, updateTask, removeTask, people } = useAppData()
  const groups = useMemo(() => groupTasks(tasks), [tasks])
  const personName = (id) => people.find((p) => p.id === id)?.name

  const sections = [
    { key: 'overdue', label: 'Overdue', items: groups.overdue, tone: 'overdue' },
    { key: 'today', label: 'Today', items: groups.today },
    { key: 'noDate', label: 'No date', items: groups.noDate },
    { key: 'upcoming', label: 'Upcoming', items: groups.upcoming },
  ]

  return (
    <div className="screen">
      <TaskCapture />
      <DayTimeline tasks={tasks} />

      {sections.map(
        (section) =>
          section.items.length > 0 && (
            <div className="task-section" key={section.key}>
              <h2 className={`task-section__heading${section.tone === 'overdue' ? ' task-section__heading--overdue' : ''}`}>
                {section.label} <span className="task-section__count">{section.items.length}</span>
              </h2>
              <ul className="task-list">
                {section.items.map((t) => (
                  <li className="task-row" key={t.id}>
                    <label className="task-row__check">
                      <input
                        type="checkbox"
                        checked={false}
                        onChange={() => updateTask(t.id, { completed: true, completedAt: new Date().toISOString() })}
                      />
                    </label>
                    <div className="task-row__body">
                      <p className="task-row__title">{t.title}</p>
                      <p className="task-row__meta">
                        {t.dueAt && <span>{formatDayLabel(t.dueAt)}</span>}
                        {t.estimatedMinutes && <span>~{t.estimatedMinutes}m</span>}
                        {personName(t.linkedPersonId) && <span>{personName(t.linkedPersonId)}</span>}
                      </p>
                    </div>
                    <button className="task-row__delete" onClick={() => removeTask(t.id)} aria-label="Delete task">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
      )}

      {tasks.filter((t) => !t.completed).length === 0 && (
        <div className="empty-state">
          <p>All clear.</p>
        </div>
      )}
    </div>
  )
}
