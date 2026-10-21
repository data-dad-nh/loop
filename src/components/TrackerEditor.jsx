import { useState } from 'react'
import { makeId } from '../utils/id'
import { FIELD_TYPES, parseOptions } from '../utils/trackers'

// Creates or edits a tracker: its name and the details recorded each time.
// Whether it is private is chosen once, when it is created.
export default function TrackerEditor({ tracker, onSave, onCancel, onDelete }) {
  const [name, setName] = useState(tracker?.name ?? '')
  const [isPrivate, setIsPrivate] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [fields, setFields] = useState(() =>
    (tracker?.fields ?? []).map((f) => ({ ...f, existing: true, optionsText: (f.options ?? []).join(', ') }))
  )

  const setField = (id, patch) => setFields((cur) => cur.map((f) => (f.id === id ? { ...f, ...patch } : f)))

  function save(e) {
    e.preventDefault()
    const cleaned = fields
      .map((f) => ({
        id: f.id,
        label: f.label.trim(),
        type: f.type,
        ...(f.type === 'choice' ? { options: parseOptions(f.optionsText) } : {}),
      }))
      .filter((f) => f.label && (f.type !== 'choice' || f.options.length))
    onSave({ name: name.trim() || 'Untitled tracker', fields: cleaned, private: isPrivate })
  }

  return (
    <form className="list-editor" onSubmit={save}>
      <h2 className="sheet__title">{tracker ? 'Edit tracker' : 'New tracker'}</h2>

      <label className="field">
        <span>Name</span>
        <input type="text" value={name} placeholder="What are you tracking?" onChange={(e) => setName(e.target.value)} />
      </label>

      <div className="field">
        <span>Details to record each time (optional)</span>
        <ul className="edit-items">
          {fields.map((f) => (
            <li key={f.id} className="tracker-field-row">
              <input aria-label="Detail name" placeholder="Name" value={f.label} onChange={(e) => setField(f.id, { label: e.target.value })} />
              <select aria-label="Detail type" value={f.type} disabled={f.existing} onChange={(e) => setField(f.id, { type: e.target.value })}>
                {FIELD_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
              <button type="button" className="task-row__delete" aria-label="Remove detail" onClick={() => setFields((cur) => cur.filter((x) => x.id !== f.id))}>×</button>
              {f.type === 'choice' && (
                <input
                  className="tracker-field-row__options"
                  aria-label="Choices"
                  placeholder="Choices, separated by commas"
                  value={f.optionsText}
                  onChange={(e) => setField(f.id, { optionsText: e.target.value })}
                />
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="chip"
          style={{ alignSelf: 'flex-start' }}
          onClick={() => setFields((cur) => [...cur, { id: makeId(), label: '', type: 'number', optionsText: '' }])}
        >
          + Add a detail
        </button>
        <p className="repeat__hint">A tracker with no details is one tap: it just records that it happened, and a note if you want.</p>
      </div>

      {!tracker ? (
        <div className="field">
          <label className="list-item tracker-private">
            <span>
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
              <span>Keep on this device only</span>
            </span>
          </label>
          <p className="repeat__hint">
            A private tracker is never uploaded: it doesn't sync, can't be searched, and is hidden until you tap
            "Show private trackers". The catch: if this browser's data is cleared, it's gone. Export keeps a copy.
            This can't be changed later.
          </p>
        </div>
      ) : (
        <p className="repeat__hint">
          {tracker.private ? 'Private: stays on this device only.' : 'This tracker syncs with your other devices.'}
        </p>
      )}

      <div className="sheet__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary">Save</button>
      </div>

      {tracker && onDelete && (
        <button type="button" className="btn btn--ghost list-edit__delete" onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
          {confirmDelete ? 'Tap again to delete it and all its entries' : 'Delete tracker'}
        </button>
      )}
    </form>
  )
}
