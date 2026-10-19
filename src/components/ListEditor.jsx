import { useState } from 'react'
import { makeId } from '../utils/id'
import { moveItem, parseItems, withIds } from '../utils/lists'

// Edits a whole list at once (title, type, items) and saves in one go, so
// typing doesn't send an update on every keystroke. Used for both new and
// existing lists (`list` is null when creating).
export default function ListEditor({ list, onSave, onCancel, onDelete }) {
  const [title, setTitle] = useState(list?.title ?? '')
  const [ordered, setOrdered] = useState(list?.ordered ?? false)
  const [items, setItems] = useState(list?.items ?? [])
  const [pasted, setPasted] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const setText = (id, text) => setItems((cur) => cur.map((i) => (i.id === id ? { ...i, text } : i)))
  const add = (kind) => setItems((cur) => [...cur, { id: makeId(), kind, text: '', done: false }])

  function addPasted() {
    const parsed = parseItems(pasted)
    if (!parsed.length) return
    setItems((cur) => [...cur, ...withIds(parsed)])
    setPasted('')
  }

  function save(e) {
    e.preventDefault()
    // Anything still in the paste box is included, so typed text is never lost.
    const all = [...items, ...withIds(parseItems(pasted))]
    onSave({
      title: title.trim() || 'Untitled list',
      ordered,
      items: all.map((i) => ({ ...i, text: i.text.trim() })).filter((i) => i.text),
    })
  }

  return (
    <form className="list-editor" onSubmit={save}>
      <h2 className="sheet__title">{list ? 'Edit list' : 'New list'}</h2>

      <label className="field">
        <span>Name</span>
        <input type="text" value={title} placeholder="Camping, Packing, …" onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="field">
        <span>Type</span>
        <div className="comm-form__types">
          <button type="button" aria-pressed={!ordered} className={`chip${!ordered ? ' chip--active' : ''}`} onClick={() => setOrdered(false)}>
            Checklist (any order)
          </button>
          <button type="button" aria-pressed={ordered} className={`chip${ordered ? ' chip--active' : ''}`} onClick={() => setOrdered(true)}>
            Step by step (in order)
          </button>
        </div>
      </div>

      {items.length > 0 && (
        <ul className="edit-items">
          {items.map((item, i) => (
            <li key={item.id}>
              <input
                className={item.kind === 'heading' ? 'list-edit__heading' : ''}
                aria-label={item.kind === 'heading' ? 'Heading' : 'Item'}
                placeholder={item.kind === 'heading' ? 'Heading' : 'Item'}
                value={item.text}
                onChange={(e) => setText(item.id, e.target.value)}
              />
              <button type="button" className="list-edit__move" aria-label="Move up" disabled={i === 0} onClick={() => setItems(moveItem(items, i, -1))}>↑</button>
              <button type="button" className="list-edit__move" aria-label="Move down" disabled={i === items.length - 1} onClick={() => setItems(moveItem(items, i, 1))}>↓</button>
              <button type="button" className="task-row__delete" aria-label="Remove item" onClick={() => setItems((cur) => cur.filter((x) => x.id !== item.id))}>×</button>
            </li>
          ))}
        </ul>
      )}

      <div className="comm-form__types">
        <button type="button" className="chip" onClick={() => add('item')}>+ Item</button>
        <button type="button" className="chip" onClick={() => add('heading')}>+ Heading</button>
      </div>

      <label className="field">
        <span>Paste a list</span>
        <textarea
          rows={4}
          value={pasted}
          placeholder={'One item per line.\nStart a line with # for a heading.'}
          onChange={(e) => setPasted(e.target.value)}
        />
      </label>
      {pasted.trim() && (
        <button type="button" className="chip" style={{ alignSelf: 'flex-start' }} onClick={addPasted}>Add pasted items</button>
      )}

      <div className="sheet__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>Cancel</button>
        <button type="submit" className="btn btn--primary">Save</button>
      </div>

      {list && onDelete && (
        <button type="button" className="btn btn--ghost list-edit__delete" onClick={() => (confirmDelete ? onDelete() : setConfirmDelete(true))}>
          {confirmDelete ? 'Tap again to delete this list' : 'Delete list'}
        </button>
      )}
    </form>
  )
}
