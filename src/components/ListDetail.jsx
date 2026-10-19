import { useEffect, useState } from 'react'
import { useAppData } from '../context/AppDataContext'
import { makeId } from '../utils/id'
import { lastDoneIndex, nextStepIndex, progress, resetItems, sectionFor } from '../utils/lists'
import ListEditor from './ListEditor'

// One list. A "Checklist" is ticked in any order; a "Step by step" list opens
// as one big step at a time (like the Now screen) with a way to see it all.
// "Start over" unchecks everything for the next run. There is no history of
// past runs on purpose.
export default function ListDetail({ list, onBack }) {
  const { updateProcedure, removeProcedure } = useAppData()
  const [editing, setEditing] = useState(false)
  const [showFull, setShowFull] = useState(false)
  const [hideChecked, setHideChecked] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [newText, setNewText] = useState('')

  useEffect(() => {
    if (!confirmReset) return
    const id = setTimeout(() => setConfirmReset(false), 4000)
    return () => clearTimeout(id)
  }, [confirmReset])

  const items = list.items ?? []
  const { done, total } = progress(items)
  const stepMode = list.ordered && !showFull

  const setItems = (next) => updateProcedure(list.id, { items: next })
  const toggle = (id) => setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)))

  function addItem(e) {
    e.preventDefault()
    const text = newText.trim()
    if (!text) return
    setItems([...items, { id: makeId(), kind: 'item', text, done: false }])
    setNewText('')
  }

  function startOver() {
    if (!confirmReset && done < total) {
      setConfirmReset(true)
      return
    }
    setItems(resetItems(items))
    setConfirmReset(false)
  }

  function stepBack() {
    const i = lastDoneIndex(items)
    if (i >= 0) setItems(items.map((it, k) => (k === i ? { ...it, done: false } : it)))
  }

  if (editing) {
    return (
      <div className="screen">
        <ListEditor
          list={list}
          onCancel={() => setEditing(false)}
          onSave={(draft) => {
            updateProcedure(list.id, draft)
            setEditing(false)
          }}
          onDelete={() => {
            removeProcedure(list.id)
            onBack()
          }}
        />
      </div>
    )
  }

  // With "hide checked" on, also drop headings that have nothing left under them.
  const visible = items.filter((i, idx) => {
    if (i.kind !== 'heading') return !(hideChecked && i.done)
    if (!hideChecked) return true
    for (let k = idx + 1; k < items.length && items[k].kind !== 'heading'; k++) if (!items[k].done) return true
    return false
  })

  const idx = nextStepIndex(items)
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <div className="screen">
      <div className="list-head">
        <button className="btn btn--ghost" onClick={onBack}>← Lists</button>
        <button className="btn btn--ghost" onClick={() => setEditing(true)}>Edit</button>
      </div>
      <h1 className="list-title">{list.title}</h1>

      <div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="progress__bar" style={{ width: `${pct}%` }} />
        </div>
        <p className="list-progress">{total ? `${done} of ${total} done` : 'No items yet'}</p>
      </div>

      {stepMode && total > 0 && (
        <div className="right-now__card">
          {idx === -1 ? (
            <>
              <p className="right-now__eyebrow">All done</p>
              <h2 className="right-now__title">That's the whole list.</h2>
              <div className="right-now__actions">
                <button className="btn btn--primary" onClick={startOver}>Start over</button>
                <button className="btn btn--ghost" onClick={stepBack}>Back</button>
              </div>
            </>
          ) : (
            <>
              <p className="right-now__eyebrow">
                Step {done + 1} of {total}
                {sectionFor(items, idx) ? ` · ${sectionFor(items, idx)}` : ''}
              </p>
              <h2 className="right-now__title">{items[idx].text}</h2>
              <div className="right-now__actions">
                <button className="btn btn--primary" onClick={() => toggle(items[idx].id)}>Done</button>
                <button className="btn" disabled={lastDoneIndex(items) === -1} onClick={stepBack}>Back</button>
              </div>
            </>
          )}
        </div>
      )}

      {(!stepMode || total === 0) && (
        <>
          {total === 0 && (
            <div className="empty-state">
              <p>Nothing on this list yet.</p>
              <p className="empty-state__sub">Add an item below, or tap Edit to paste a whole list.</p>
            </div>
          )}
          <ul className="list-items">
            {visible.map((item) =>
              item.kind === 'heading' ? (
                <li key={item.id} className="list-heading">{item.text}</li>
              ) : (
                <li key={item.id} className="list-item">
                  <label>
                    <input type="checkbox" checked={item.done} onChange={() => toggle(item.id)} />
                    <span className={item.done ? 'steps__done' : ''}>{item.text}</span>
                  </label>
                </li>
              )
            )}
          </ul>
        </>
      )}

      <form className="list-add" onSubmit={addItem}>
        <input
          type="text"
          placeholder="Add an item"
          value={newText}
          enterKeyHint="done"
          onChange={(e) => setNewText(e.target.value)}
        />
        <button type="submit" className="capture__submit" disabled={!newText.trim()} aria-label="Add item">+</button>
      </form>

      <div className="comm-form__types">
        {list.ordered && (
          <button className="chip" onClick={() => setShowFull((v) => !v)}>
            {showFull ? 'Step by step' : 'Show full list'}
          </button>
        )}
        {!stepMode && done > 0 && (
          <button className="chip" onClick={() => setHideChecked((v) => !v)}>
            {hideChecked ? 'Show checked' : 'Hide checked'}
          </button>
        )}
        {done > 0 && !(stepMode && idx === -1) && (
          <button className="chip" onClick={startOver}>
            {confirmReset ? 'Tap again to uncheck everything' : 'Start over'}
          </button>
        )}
      </div>
    </div>
  )
}
