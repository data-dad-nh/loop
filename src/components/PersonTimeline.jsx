import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import CommEntryRow from './CommEntryRow'

// Loading context back in is the point — tapping a name should feel like
// "oh right, here's where we left off" rather than a fresh search.
export default function PersonTimeline({ personId, onBack }) {
  const { people, commLog, tasks, updatePerson, removePerson } = useAppData()
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [renameError, setRenameError] = useState('')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const person = people.find((p) => p.id === personId)
  const entries = commLog
    .filter((e) => e.personId === personId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const linkedTasks = tasks.filter((t) => t.linkedPersonId === personId && !t.completed)
  const taskCount = tasks.filter((t) => t.linkedPersonId === personId).length

  if (!person) return null

  function startRename() {
    setNameDraft(person.name)
    setRenameError('')
    setRenaming(true)
  }

  function saveRename(e) {
    e.preventDefault()
    const trimmed = nameDraft.trim()
    if (!trimmed) return
    const clash = people.some((p) => p.id !== person.id && p.name.toLowerCase() === trimmed.toLowerCase())
    if (clash) {
      setRenameError('Someone with that name already exists.')
      return
    }
    updatePerson(person.id, { name: trimmed })
    setRenaming(false)
  }

  const entryLabel = (n) => `${n} log ${n === 1 ? 'entry' : 'entries'}`
  const kept = [
    ...(entries.length ? [entryLabel(entries.length)] : []),
    ...(taskCount ? [`${taskCount} ${taskCount === 1 ? 'task' : 'tasks'}`] : []),
  ]

  function confirmDelete(deleteEntries) {
    removePerson(person.id, { deleteEntries })
    onBack()
  }

  return (
    <div>
      <button className="btn btn--ghost" onClick={onBack}>← Back</button>

      {renaming ? (
        <form className="rename" onSubmit={saveRename}>
          <input type="text" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          <button type="submit" className="btn btn--primary" disabled={!nameDraft.trim()}>Save</button>
          <button type="button" className="btn btn--ghost" onClick={() => setRenaming(false)}>Cancel</button>
        </form>
      ) : (
        <div className="person-timeline__head">
          <h2 className="person-timeline__name">{person.name}</h2>
          <div className="person-timeline__actions">
            <button className="btn btn--ghost" onClick={startRename}>Rename</button>
            <button className="btn btn--ghost person-timeline__delete" onClick={() => setConfirmingDelete(true)}>Delete</button>
          </div>
        </div>
      )}

      {confirmingDelete && (
        <div className="delete-panel" role="group" aria-label={`Delete ${person.name}`}>
          <p className="delete-panel__title">Delete {person.name}?</p>
          <p className="delete-panel__text">
            {kept.length ? `Their ${kept.join(' and ')} will stay, but won't be linked to anyone.` : 'Nothing is linked to them.'}
          </p>
          <div className="delete-panel__actions">
            <button className="btn btn--warm" onClick={() => confirmDelete(false)}>Delete person</button>
            {entries.length > 0 && (
              <button className="btn btn--warm" onClick={() => confirmDelete(true)}>
                Delete person and {entryLabel(entries.length)}
              </button>
            )}
            <button className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </div>
        </div>
      )}
      {renameError && <p className="capture__error">{renameError}</p>}

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
          <CommEntryRow key={entry.id} entry={entry} personName={person.name} />
        ))}
      </ul>
    </div>
  )
}
