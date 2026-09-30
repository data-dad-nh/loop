import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import CommEntryRow from './CommEntryRow'

// Loading context back in is the point — tapping a name should feel like
// "oh right, here's where we left off" rather than a fresh search.
export default function PersonTimeline({ personId, onBack }) {
  const { people, commLog, tasks, updatePerson } = useAppData()
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [renameError, setRenameError] = useState('')

  const person = people.find((p) => p.id === personId)
  const entries = commLog
    .filter((e) => e.personId === personId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const linkedTasks = tasks.filter((t) => t.linkedPersonId === personId && !t.completed)

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
          <button className="btn btn--ghost" onClick={startRename}>Rename</button>
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
