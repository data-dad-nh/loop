import { useEffect, useMemo, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { fold, searchAll } from '../utils/search'
import { makeId } from '../utils/id'
import { formatDayLabel, relativeFromNow } from '../utils/time'
import CommEntryRow from './CommEntryRow'
import Highlight from './Highlight'
import PersonTimeline from './PersonTimeline'
import TaskEditor from './TaskEditor'

// Full-screen search over calls/emails, people, and tasks (including finished
// ones). Calls and emails are listed first, since finding what was said is the
// main reason to search.
export default function SearchOverlay({ onClose }) {
  const { tasks, commLog, people, addTask } = useAppData()
  const [query, setQuery] = useState('')
  const [personId, setPersonId] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [expanded, setExpanded] = useState(null)
  const [added, setAdded] = useState(() => new Set())

  const results = useMemo(() => searchAll({ tasks, commLog, people }, query), [tasks, commLog, people, query])
  const nameOf = (id) => people.find((p) => p.id === id)?.name
  const entryCount = (id) => commLog.filter((e) => e.personId === id).length
  const { terms, totals } = results
  const anything = totals.entries + totals.people + totals.tasks > 0

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !editingTask) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editingTask, onClose])

  function addAgain(task) {
    const id = makeId()
    addTask({
      id,
      title: task.title,
      notes: task.notes ?? '',
      dueAt: null,
      estimatedMinutes: task.estimatedMinutes ?? null,
      completed: false,
      completedAt: null,
      linkedPersonId: task.linkedPersonId ?? null,
      steps: (task.steps ?? []).map((s, i) => ({ id: `${id}-s${i}`, text: s.text, done: false })),
    })
    setAdded((set) => new Set(set).add(task.id))
  }

  const heading = (label, shown, total) => (
    <h2 className="task-section__heading">
      {label} <span className="task-section__count">{total}</span>
      {total > shown && <span className="search__more">showing first {shown}</span>}
    </h2>
  )

  return (
    <div className="search" role="dialog" aria-label="Search">
      <div className="search__bar">
        <input
          className="search__input"
          type="search"
          placeholder="Search calls, emails, people, tasks"
          value={query}
          autoFocus
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          onChange={(e) => {
            setQuery(e.target.value)
            setPersonId(null)
            setExpanded(null)
          }}
        />
        <button className="btn btn--ghost" onClick={onClose}>Close</button>
      </div>

      <div className="search__body">
        {personId ? (
          <PersonTimeline personId={personId} onBack={() => setPersonId(null)} />
        ) : !terms.length ? (
          <div className="empty-state">
            <p>Search everything you've logged.</p>
            <p className="empty-state__sub">Words can be in any order, and capitals and accents don't matter.</p>
          </div>
        ) : !anything ? (
          <div className="empty-state">
            <p>Nothing matches "{query.trim()}".</p>
            <p className="empty-state__sub">Try fewer or shorter words. Every word has to match.</p>
          </div>
        ) : (
          <>
            {results.entries.length > 0 && (
              <section>
                {heading('Calls & emails', results.entries.length, totals.entries)}
                <ul className="comm-list">
                  {results.entries.map((entry) =>
                    expanded === entry.id ? (
                      <li key={entry.id} className="search__collapse-row">
                        <button className="chip" onClick={() => setExpanded(null)}>Show less</button>
                        <ul className="comm-list">
                          <CommEntryRow entry={entry} personName={nameOf(entry.personId)} />
                        </ul>
                      </li>
                    ) : (
                      <li key={entry.id}>
                        <button className="comm-row search__result" onClick={() => setExpanded(entry.id)}>
                          <span className="comm-row__head">
                            <span className="comm-row__type">{entry.type}</span>
                            {nameOf(entry.personId) && (
                              <span className="comm-row__person"><Highlight text={nameOf(entry.personId)} terms={terms} /></span>
                            )}
                            <span className="comm-row__time">{relativeFromNow(entry.createdAt)}</span>
                          </span>
                          <span className="comm-row__summary search__snippet">
                            <Highlight text={entry.summary} terms={terms} maxLen={220} />
                          </span>
                          {(entry.actionItems ?? [])
                            .filter((i) => terms.some((t) => fold(i.text).includes(t)))
                            .map((i) => (
                              <span key={i.id} className="search__action">
                                Action item: <Highlight text={i.text} terms={terms} />
                              </span>
                            ))}
                        </button>
                      </li>
                    )
                  )}
                </ul>
              </section>
            )}

            {results.people.length > 0 && (
              <section>
                {heading('People', results.people.length, totals.people)}
                <ul className="people-list">
                  {results.people.map((p) => (
                    <li key={p.id}>
                      <button className="people-row" onClick={() => setPersonId(p.id)}>
                        <span className="people-row__name"><Highlight text={p.name} terms={terms} /></span>
                        <span className="people-row__count">{entryCount(p.id)} logged</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {results.tasks.length > 0 && (
              <section>
                {heading('Tasks', results.tasks.length, totals.tasks)}
                <ul className="task-list">
                  {results.tasks.map((t) => (
                    <li className="task-row" key={t.id}>
                      {t.completed ? (
                        <>
                          <div className="task-row__body">
                            <span className="task-row__title search__done"><Highlight text={t.title} terms={terms} /></span>
                            <span className="task-row__meta">
                              <span>{t.skipped ? 'Skipped' : 'Done'} {relativeFromNow(t.completedAt)}</span>
                              {nameOf(t.linkedPersonId) && <span>{nameOf(t.linkedPersonId)}</span>}
                            </span>
                          </div>
                          <button className="comm-row__addtask" disabled={added.has(t.id)} onClick={() => addAgain(t)}>
                            {added.has(t.id) ? 'Added' : 'Add again'}
                          </button>
                        </>
                      ) : (
                        <button className="task-row__body task-row__body--button" onClick={() => setEditingTask(t)} aria-label={`Edit ${t.title}`}>
                          <span className="task-row__title"><Highlight text={t.title} terms={terms} /></span>
                          <span className="task-row__meta">
                            {t.dueAt && <span>{formatDayLabel(t.dueAt)}</span>}
                            {nameOf(t.linkedPersonId) && <span>{nameOf(t.linkedPersonId)}</span>}
                          </span>
                          {t.notes && (
                            <span className="task-row__notes"><Highlight text={t.notes} terms={terms} maxLen={160} /></span>
                          )}
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>

      {editingTask && <TaskEditor task={editingTask} onClose={() => setEditingTask(null)} />}
    </div>
  )
}
