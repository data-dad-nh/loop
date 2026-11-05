import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { formatTime } from '../utils/time'
import { canRestore, describeRepeat } from '../utils/recurrence'
import { groupCompleted } from '../utils/taskGroups'
import { useTimeRefresh } from '../hooks/useTimeRefresh'

const PAGE_SIZE = 30

// Everything you've finished or skipped, newest first, grouped by the day it
// was done. Unchecking a task puts it back where it was. A task's "×" deletes
// it for good, and "Clear all" empties the list (with a second tap to confirm).
export default function CompletedTasks() {
  const { tasks, people, restoreTask, removeTask } = useAppData()
  const timeVersion = useTimeRefresh() // "Today" and "Yesterday" move on at midnight
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    if (!confirmClear) return
    const id = setTimeout(() => setConfirmClear(false), 4000)
    return () => clearTimeout(id)
  }, [confirmClear])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const { groups, total } = useMemo(() => groupCompleted(tasks, new Date(), limit), [tasks, limit, timeVersion])
  const byId = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])
  const personName = (id) => people.find((p) => p.id === id)?.name

  function clearAll() {
    if (!confirmClear) {
      setConfirmClear(true)
      return
    }
    tasks.filter((t) => t.completed).forEach((t) => removeTask(t.id))
    setConfirmClear(false)
  }

  if (total === 0) {
    return (
      <div className="empty-state">
        <p>Nothing done yet.</p>
        <p className="empty-state__sub">Finished tasks land here. Tap a checked box to put a task back.</p>
      </div>
    )
  }

  return (
    <>
      {groups.map((g) => (
        <div className="task-section" key={g.key}>
          <h2 className="task-section__heading">
            {g.label} <span className="task-section__count">{g.items.length}</span>
          </h2>
          <ul className="task-list">
            {g.items.map((t) => {
              const restorable = canRestore(t, (id) => byId.get(id))
              return (
                <li className="task-row" key={t.id}>
                  <label className="task-row__check">
                    <input
                      type="checkbox"
                      checked
                      disabled={!restorable}
                      aria-label={`Mark not done: ${t.title}`}
                      onChange={() => restoreTask(t.id)}
                    />
                  </label>
                  <div className="task-row__body">
                    <span className="task-row__title steps__done">{t.title}</span>
                    <span className="task-row__meta">
                      <span>
                        {t.skipped ? 'Skipped' : 'Done'}
                        {t.completedAt ? ` ${formatTime(t.completedAt)}` : ''}
                      </span>
                      {t.repeat && <span>↻ {describeRepeat(t.repeat)}</span>}
                      {personName(t.linkedPersonId) && <span>{personName(t.linkedPersonId)}</span>}
                    </span>
                    {!restorable && (
                      <span className="task-row__notes">The next one in this series is already done, so this one can't be put back.</span>
                    )}
                  </div>
                  <button className="task-row__delete" onClick={() => removeTask(t.id)} aria-label={`Delete ${t.title}`}>×</button>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      {total > limit && (
        <button className="chip" style={{ alignSelf: 'flex-start' }} onClick={() => setLimit((n) => n + PAGE_SIZE)}>
          Show {Math.min(PAGE_SIZE, total - limit)} older
        </button>
      )}

      <button className="btn btn--ghost list-edit__delete" onClick={clearAll}>
        {confirmClear ? `Tap again to delete ${total} done ${total === 1 ? 'task' : 'tasks'}` : 'Clear all done tasks'}
      </button>
    </>
  )
}
