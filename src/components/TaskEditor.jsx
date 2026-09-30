import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { toDateInputValue, toTimeInputValue } from '../utils/time'
import NoteAssist from './NoteAssist'

// Bottom sheet for editing an existing task. Clearing the date removes the
// due date entirely (the task moves to "No date"), which is how you
// un-schedule something without deleting it.
export default function TaskEditor({ task, onClose }) {
  const { updateTask, findOrCreatePerson, people } = useAppData()
  const [title, setTitle] = useState(task.title)
  const [notes, setNotes] = useState(task.notes ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueAt))
  const [dueTime, setDueTime] = useState(toTimeInputValue(task.dueAt))
  const [minutes, setMinutes] = useState(task.estimatedMinutes ?? '')
  const [personName, setPersonName] = useState(people.find((p) => p.id === task.linkedPersonId)?.name ?? '')

  function save(e) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    const dueAt = dueDate ? new Date(`${dueDate}T${dueTime || '09:00'}`).toISOString() : null
    const person = personName.trim() ? findOrCreatePerson(personName.trim()) : null
    updateTask(task.id, {
      title: trimmed,
      notes: notes.trim(),
      dueAt,
      estimatedMinutes: minutes ? Number(minutes) : null,
      linkedPersonId: person?.id ?? null,
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="sheet__title">Edit task</h2>

        <label className="field">
          <span>Title</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label className="field">
          <span>Notes</span>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <NoteAssist value={notes} onApply={setNotes} />

        <label className="field">
          <span>Due</span>
          <div className="field__row">
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            <input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </div>
        </label>
        {dueDate && (
          <button
            type="button"
            className="chip"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => {
              setDueDate('')
              setDueTime('')
            }}
          >
            Clear due date
          </button>
        )}

        <label className="field">
          <span>Takes about (min)</span>
          <input type="number" min="1" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </label>

        <label className="field">
          <span>Linked to</span>
          <input type="text" placeholder="Person's name" value={personName} onChange={(e) => setPersonName(e.target.value)} />
        </label>

        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={!title.trim()}>Save</button>
        </div>
      </form>
    </div>
  )
}
