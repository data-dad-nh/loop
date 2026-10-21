import { useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { cleanValues } from '../utils/trackers'
import { toDateTimeInputValue } from '../utils/time'
import FieldInput from './FieldInput'

// Bottom sheet for fixing or deleting one logged entry.
export default function EntryEditor({ tracker, entry, onClose }) {
  const { updateTrackerEntry, removeTrackerEntry } = useAppData()
  const [values, setValues] = useState(entry.values ?? {})
  const [note, setNote] = useState(entry.note ?? '')
  const [at, setAt] = useState(toDateTimeInputValue(entry.at))
  const [confirmDelete, setConfirmDelete] = useState(false)

  function save(e) {
    e.preventDefault()
    updateTrackerEntry(entry.id, {
      at: at ? new Date(at).toISOString() : entry.at,
      values: cleanValues(tracker.fields, values),
      note: note.trim(),
    })
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" role="dialog" aria-modal="true" aria-label="Edit entry" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2 className="sheet__title">Edit entry</h2>

        <label className="field">
          <span>When</span>
          <input type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
        </label>

        {(tracker.fields ?? []).map((f) => (
          <div className="field" key={f.id}>
            <span>{f.label}</span>
            <FieldInput field={f} value={values[f.id]} onChange={(v) => setValues((cur) => ({ ...cur, [f.id]: v }))} />
          </div>
        ))}

        <label className="field">
          <span>Note</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className="sheet__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn--primary">Save</button>
        </div>

        <button
          type="button"
          className="btn btn--ghost list-edit__delete"
          onClick={() => {
            if (!confirmDelete) return setConfirmDelete(true)
            removeTrackerEntry(entry.id)
            onClose()
          }}
        >
          {confirmDelete ? 'Tap again to delete this entry' : 'Delete entry'}
        </button>
      </form>
    </div>
  )
}
