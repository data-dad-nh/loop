import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { makeId } from '../utils/id'
import { relativeFromNow } from '../utils/time'
import NoteAssist from './NoteAssist'

export const TYPES = [
  { id: 'call', label: 'Call' },
  { id: 'text', label: 'Text' },
  { id: 'email', label: 'Email' },
  { id: 'other', label: 'Other' },
]

// One communication log entry, used in both the main log and a person's
// timeline. Tapping "Edit" swaps the row for an inline form.
export default function CommEntryRow({ entry, personName }) {
  const { updateCommEntry, removeCommEntry, addTask, findOrCreatePerson } = useAppData()
  const [editing, setEditing] = useState(false)
  const [type, setType] = useState(entry.type)
  const [name, setName] = useState('')
  const [summary, setSummary] = useState('')
  const [items, setItems] = useState([])

  function startEdit() {
    setType(entry.type)
    setName(personName ?? '')
    setSummary(entry.summary)
    setItems(entry.actionItems ?? [])
    setEditing(true)
  }

  function save(e) {
    e.preventDefault()
    if (!summary.trim()) return
    const person = name.trim() ? findOrCreatePerson(name.trim()) : null
    updateCommEntry(entry.id, {
      type,
      personId: person?.id ?? null,
      summary: summary.trim(),
      actionItems: items.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text),
    })
    setEditing(false)
  }

  function toggleItem(itemId) {
    const actionItems = entry.actionItems.map((i) => (i.id === itemId ? { ...i, done: !i.done } : i))
    updateCommEntry(entry.id, { actionItems })
  }

  function addItemAsTask(item) {
    const task = addTask({
      title: item.text,
      notes: `From a ${entry.type} with ${personName || 'someone'}`,
      dueAt: null,
      estimatedMinutes: null,
      completed: false,
      completedAt: null,
      linkedPersonId: entry.personId,
      steps: [],
    })
    const actionItems = entry.actionItems.map((i) => (i.id === item.id ? { ...i, taskId: task.id } : i))
    updateCommEntry(entry.id, { actionItems })
  }

  if (editing) {
    return (
      <li className="comm-row">
        <form className="comm-form comm-form--inline" onSubmit={save}>
          <div className="comm-form__types">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chip${type === t.id ? ' chip--active' : ''}`}
                onClick={() => setType(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="comm-form__person"
            type="text"
            placeholder="Who was it with?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <textarea
            className="comm-form__summary"
            rows={4}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <NoteAssist value={summary} onApply={setSummary} />

          {items.length > 0 && (
            <ul className="edit-items">
              {items.map((item) => (
                <li key={item.id}>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => setItems((list) => list.map((i) => (i.id === item.id ? { ...i, text: e.target.value } : i)))}
                  />
                  <button
                    type="button"
                    className="task-row__delete"
                    aria-label="Remove action item"
                    onClick={() => setItems((list) => list.filter((i) => i.id !== item.id))}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="chip"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => setItems((list) => [...list, { id: makeId(), text: '', done: false, taskId: null }])}
          >
            + Action item
          </button>

          <div className="sheet__actions">
            <button type="button" className="btn btn--ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={!summary.trim()}>Save</button>
          </div>
        </form>
      </li>
    )
  }

  return (
    <li className="comm-row">
      <div className="comm-row__head">
        <span className="comm-row__type">{entry.type}</span>
        {personName && <span className="comm-row__person">{personName}</span>}
        <span className="comm-row__time">{relativeFromNow(entry.createdAt)}</span>
        <button className="comm-row__edit" onClick={startEdit}>Edit</button>
        <button className="task-row__delete" onClick={() => removeCommEntry(entry.id)} aria-label="Delete entry">×</button>
      </div>
      <p className="comm-row__summary">{entry.summary}</p>
      {entry.actionItems?.length > 0 && (
        <ul className="comm-row__items">
          {entry.actionItems.map((item) => (
            <li key={item.id}>
              <label>
                <input type="checkbox" checked={item.done} onChange={() => toggleItem(item.id)} />
                <span className={item.done ? 'steps__done' : ''}>{item.text}</span>
              </label>
              {!item.taskId && (
                <button className="comm-row__addtask" onClick={() => addItemAsTask(item)}>+ task</button>
              )}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}
