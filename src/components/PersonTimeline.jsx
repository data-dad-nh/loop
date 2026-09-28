import { useAppData } from '../context/AppDataContext'
import { relativeFromNow } from '../utils/time'

// Loading context back in is the point — tapping a name should feel like
// "oh right, here's where we left off" rather than a fresh search.
export default function PersonTimeline({ personId, onBack }) {
  const { people, commLog, tasks } = useAppData()
  const person = people.find((p) => p.id === personId)
  const entries = commLog
    .filter((e) => e.personId === personId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const linkedTasks = tasks.filter((t) => t.linkedPersonId === personId && !t.completed)

  if (!person) return null

  return (
    <div>
      <button className="btn btn--ghost" onClick={onBack}>← Back</button>
      <h2 className="person-timeline__name">{person.name}</h2>

      {linkedTasks.length > 0 && (
        <div className="person-timeline__tasks">
          <p className="task-section__heading">Open tasks</p>
          <ul>
            {linkedTasks.map((t) => (
              <li key={t.id}>{t.title}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="task-section__heading">History</p>
      {entries.length === 0 && <p className="empty-state__sub">Nothing logged with {person.name} yet.</p>}
      <ul className="comm-list">
        {entries.map((entry) => (
          <li className="comm-row" key={entry.id}>
            <div className="comm-row__head">
              <span className="comm-row__type">{entry.type}</span>
              <span className="comm-row__time">{relativeFromNow(entry.createdAt)}</span>
            </div>
            <p className="comm-row__summary">{entry.summary}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
